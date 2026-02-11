# payments/views.py — FINAL 2025 GOLD STANDARD
from rest_framework import permissions
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.utils import timezone
import logging
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from apps.authentication.models import User
from rest_framework.permissions import IsAuthenticated
from datetime import timedelta
from apps.core.views import BaseAPIView
from apps.authentication.models import UserSubject
from apps.core.utils import (
    standardize_response,
    generate_reference,
    log_user_activity,
    standardize_phone_number,
)
from .models import Payment, Subscription, MpesaCallback, Transaction
from .serializers import PaymentInitiationSerializer,SubscriptionSerializer
from .utils import MpesaService

logger = logging.getLogger(__name__)


class ActiveSubscriptionView(BaseAPIView):
    permission_classes = [permissions.IsAuthenticated]  # Require login
    authentication_required = False  # Bypass base class override

    def get(self, request):
        user = request.user
        logger.info(f"Subscription check for user: {user.phone_number}")

        # 1. Expire old subscriptions + trigger cleanup
        expired = Subscription.objects.filter(
            user=user,
            active=True,
            end_date__lt=timezone.now()
        )
        for sub in expired:
            sub.active = False
            sub.is_renewal_eligible = timezone.now() <= (sub.end_date + timedelta(hours=24))
            sub.save()  # This triggers model save → deletes payments/transactions

        # 2. Get latest active (if any)
        active_sub = Subscription.objects.filter(
            user=user,
            active=True,
            end_date__gt=timezone.now()
        ).order_by('-end_date').first()

        if active_sub:
            return standardize_response(
                success=True,
                message="Active subscription found",
                data=SubscriptionSerializer(active_sub).data,
                status_code=200
            )
         # No active sub → check if renewal eligible
        latest_sub = Subscription.objects.filter(user=user).order_by('-end_date').first()
        if latest_sub and latest_sub.is_renewal_eligible:
            renewal_deadline = latest_sub.end_date + timedelta(hours=24)
            hours_left = max(0, int((renewal_deadline - timezone.now()).total_seconds() // 3600))

            return standardize_response(
                success=False,
                message=f"Premium expired. Renew for KSh 50 within {hours_left}h",
                data={
                    "renewal_eligible": True,
                    "renewal_price": 50,
                    "hours_remaining": hours_left,
                    "renewal_deadline": renewal_deadline.isoformat(),
                    "premium_expires_at": latest_sub.end_date.isoformat(),
                },
                status_code=402
            )

        # Fully expired → no renewal
        return standardize_response(
            success=False,
            message="Payment required",
            data={
                "subscription": {
                    "is_active": False,
                    "payment_required": True,
                    "allowed_amount": 1,
                    "within_grace_period": False
                }
            },
            status_code=402
        )

class PaymentInitiationView(APIView):
    """
    Initiates M-Pesa payment with STRICT backend enforcement:
    - 210 KES for new premium or expired > 24h
    - 50 KES for renewal within 24h grace period
    """
    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    serializer_class = PaymentInitiationSerializer

    def post(self, request):
        print("===== PAYMENT INITIATION HIT =====")           # debug
        print(f"User authenticated? {request.user.is_authenticated}")
        print(f"Request data: {request.data}")
        serializer = self.serializer_class(data=request.data)
        if not serializer.is_valid():
            return standardize_response(
                success=False,
                message="Invalid request data",
                errors=serializer.errors,
                status_code=400
            )

        data = serializer.validated_data

        phone = standardize_phone_number(data["phone_number"])
        requested_amount = int(data["amount"])   # frontend-provided (will be validated)
        subjects = data.get("subjects", [])

        # -------------------------------------------------
        # 1. RESOLVE USER (JWT FIRST, PHONE FALLBACK)
        # -------------------------------------------------
        user = None

        if request.user.is_authenticated:
            user = request.user
        else:
            user = User.objects.filter(phone_number=phone).first()

        now = timezone.now()

        # -------------------------------------------------
        # 2. DECIDE ALLOWED AMOUNT & PLAN TYPE (AUTHORITATIVE)
        # -------------------------------------------------
        if user and user.premium_expires_at:
            # Within 24h grace window after premium expiry
            if now <= user.premium_expires_at + timedelta(hours=24):
                allowed_amount = 50
                plan_type = "RENEWAL"
            else:
                allowed_amount = 1
                plan_type = "PREMIUM"
        else:
            allowed_amount = 1
            plan_type = "PREMIUM"

        # -------------------------------------------------
        # 3. ENFORCE AMOUNT (SECURITY CRITICAL)
        # -------------------------------------------------
        if requested_amount != allowed_amount:
            return standardize_response(
                success=False,
                message=f"Invalid payment amount. Required: {allowed_amount} KES",
                status_code=403
            )

        # -------------------------------------------------
        # 4. SUBJECT RULES
        # -------------------------------------------------
        if plan_type == "RENEWAL":
            subjects = []  # renewal NEVER accepts subjects

        # -------------------------------------------------
        # 5. CREATE PAYMENT (PENDING)
        # -------------------------------------------------
        reference = generate_reference("PAY")

        payment = Payment.objects.create(
            user=user,
            phone_number=phone,
            amount=allowed_amount,
            reference=reference,
            payment_method="mpesa",
            status="pending",
            subscription_type=plan_type,
            pending_subjects=subjects if plan_type == "PREMIUM" else None
        )

        # -------------------------------------------------
        # 6. INITIATE STK PUSH
        # -------------------------------------------------
        mpesa = MpesaService()

        try:
            result = mpesa.stk_push(
                phone_number=phone,
                amount=allowed_amount,
                account_reference=reference
            )
        except Exception as exc:
            payment.mark_failed(str(exc))
            return standardize_response(
                success=False,
                message="Failed to initiate M-Pesa STK Push",
                status_code=500
            )

        # -------------------------------------------------
        # 7. HANDLE MPESA RESPONSE
        # -------------------------------------------------
        if result.get("success"):
            payment.checkout_request_id = result.get("CheckoutRequestID")
            payment.save(update_fields=["checkout_request_id"])

            return standardize_response(
                success=True,
                message="Payment initiated. Complete the payment on your phone.",
                data={
                    "reference": reference,
                    "checkout_request_id": payment.checkout_request_id,
                    "amount": allowed_amount,
                    "plan_type": plan_type
                },
                status_code=200
            )

        payment.mark_failed(result.get("error", "M-Pesa error"))

        return standardize_response(
            success=False,
            message=result.get("error", "M-Pesa request failed"),
            status_code=400
        )


class PaymentStatusView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, reference):
        try:
            payment = Payment.objects.get(reference=reference)
            return Response({"status": payment.status})
        except Payment.DoesNotExist:
            return Response({"status": "not_found"}, status=404)
@method_decorator(csrf_exempt, name='dispatch')
class MpesaCallbackView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
 
    def post(self, request):
        print("=== MPESA CALLBACK RECEIVED ===")
        print("RAW DATA:", request.data)

        ip = request.META.get('HTTP_X_FORWARDED_FOR', request.META.get('REMOTE_ADDR', 'unknown'))

        try:
            raw_data = request.data
            MpesaCallback.objects.create(raw_data=raw_data)

            stk = raw_data.get('Body', {}).get('stkCallback', {})
            checkout_request_id = stk.get('CheckoutRequestID')
            result_code = int(stk.get('ResultCode', -1))
            result_desc = stk.get('ResultDesc', 'No description')

            if not checkout_request_id:
                logger.warning("Callback missing CheckoutRequestID")
                return standardize_response(success=True, message="Accepted", status_code=200)

            # Find the pending payment
            payment = Payment.objects.filter(checkout_request_id=checkout_request_id).first()
            if not payment:
                logger.warning(f"No payment found for CheckoutRequestID: {checkout_request_id}")
                return standardize_response(success=True, message="Accepted", status_code=200)

            # Prevent double-processing
            if payment.status in ['completed', 'failed']:
                logger.info(f"Payment {checkout_request_id} already processed ({payment.status})")
                return standardize_response(success=True, message="Already processed", status_code=200)

            # Log callback receipt
            log_user_activity(
                user=None,
                action='MPESA_CALLBACK_RECEIVED',
                ip_address=ip,
                details={"checkout_request_id": checkout_request_id, "raw_data": raw_data}
            )

            if result_code == 0:
                # SUCCESS
                metadata_items = stk.get('CallbackMetadata', {}).get('Item', [])
                metadata = {item.get('Name'): item.get('Value') for item in metadata_items}

                receipt_no = metadata.get('MpesaReceiptNumber')
                phone_from_mpesa = standardize_phone_number(str(metadata.get('PhoneNumber', '')))

                # 1. Get or create user
                user, created = User.objects.get_or_create(
                    phone_number=phone_from_mpesa,
                    defaults={
                        'is_active': True,
                        'is_premium': False,
                    }
                )

                if created:
                    logger.info(f"New user created from callback: {phone_from_mpesa}")
                    user.set_password("&mo1se2s3@")  
                    user.save(update_fields=['password'])

                # Assign user to payment
                payment.user = user
                payment.phone_number = phone_from_mpesa

                # 2. Transfer pending subjects (if any)
                if payment.pending_subjects:
                    logger.info(f"Transferring {len(payment.pending_subjects)} subjects")
                    for subj in payment.pending_subjects:
                        try:
                            UserSubject.objects.get_or_create(
                                user=user,
                                subject_id=subj['subject_id'],
                                defaults={'grade': subj.get('grade', '')}
                            )
                        except Exception as e:
                            logger.warning(f"Subject transfer failed: {e}")

                    payment.pending_subjects = []
                    log_user_activity(
                        user=user,
                        action='SUBJECTS_TRANSFERRED_FROM_PAYMENT',
                        ip_address=ip,
                        details={'count': len(payment.pending_subjects), 'payment_ref': payment.reference}
                    )

                # 3. Activate premium + set expiration timers
                now = timezone.now()
                user.is_premium = True
                user.premium_expires_at = now + timedelta(hours=6)
                user.account_expires_at = now + timedelta(hours=24)  # 24h renewal window after premium expires
                user.save(update_fields=['is_premium', 'premium_expires_at', 'account_expires_at'])

                plan = "RENEWAL" if payment.subscription_type == "RENEWAL" else "PREMIUM"
                subscription = Subscription.objects.create(
                    user=user,
                    plan=plan,
                    start_date=now,
                    end_date=user.premium_expires_at,
                    active=True,
                    last_payment_at=now,
                    is_renewal_eligible=True  
                )

                payment.subscription = subscription
                payment.mark_completed(receipt_number=receipt_no, metadata=metadata)

                Transaction.objects.create(
                    payment=payment,
                    phonenumber=phone_from_mpesa,
                    amount=int(metadata.get('Amount', 0)),
                    receipt_no=receipt_no or "UNKNOWN"
                )

                logger.info(f"Payment SUCCESS: {checkout_request_id} | User: {user.phone_number} | Premium until {user.premium_expires_at}")

                log_user_activity(
                    user=user,
                    action='PAYMENT_COMPLETED',
                    ip_address=ip,
                    details={
                        'receipt': receipt_no,
                        'amount': metadata.get('Amount'),
                        'premium_until': user.premium_expires_at.isoformat(),
                        'account_until': user.account_expires_at.isoformat()
                    }
                )

            else:
                # FAILURE
                payment.mark_failed(result_desc)
                logger.warning(f"Payment FAILED: {checkout_request_id} | {result_desc}")

                log_user_activity(
                    user=payment.user,
                    action='PAYMENT_FAILED',
                    ip_address=ip,
                    details={'reason': result_desc, 'checkout_request_id': checkout_request_id}
                )

            payment.save()

            # ALWAYS return 200 to Safaricom
            return standardize_response(success=True, message="Accepted", status_code=200)

        except Exception as e:
            logger.exception("M-Pesa callback error")
            log_user_activity(
                user=None,
                action='MPESA_CALLBACK_ERROR',
                ip_address=ip,
                details={'error': str(e)}
            )
            return standardize_response(success=True, message="Accepted", status_code=200)
class RenewSubscriptionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user

        if not user.account_expires_at or timezone.now() >= user.account_expires_at:
            return Response(
                {"error": "Renewal period expired. Please initiate new payment."},
                status=403
            )
        now = timezone.now()
        user.is_premium = True
        user.premium_expires_at = now + timedelta(hours=6) 
        user.account_expires_at = now + timedelta(hours=24)  
        user.save(update_fields=['is_premium', 'premium_expires_at', 'account_expires_at'])

        latest_sub = Subscription.objects.filter(user=user).order_by('-end_date').first()
        if latest_sub:
            latest_sub.end_date = user.premium_expires_at
            latest_sub.is_renewal_eligible = True
            latest_sub.save()
        else:
            Subscription.objects.create(
                user=user,
                plan='RENEWAL',
                start_date=now,
                end_date=user.premium_expires_at,
                active=True,
                last_payment_at=now,
                is_renewal_eligible=True
            )

        log_user_activity(user, 'SUBSCRIPTION_RENEWED')
        return Response({
            "message": "Subscription renewed",
            "premium_until": user.premium_expires_at.isoformat(),
            "renewal_until": user.account_expires_at.isoformat()
        })