import requests
import base64
import json
import uuid
import logging
import re
from datetime import datetime
from decimal import Decimal
from .models import Subscription, SubscriptionPlan, UserSubscription  # Ensure this is in your imports

from django.conf import settings
from django.utils import timezone

from .models import Payment

logger = logging.getLogger(__name__)


class MpesaService:
    """
    Handles M-Pesa Daraja API integration.
    """

    def __init__(self):
        self.consumer_key = settings.MPESA_CONSUMER_KEY
        self.consumer_secret = settings.MPESA_CONSUMER_SECRET
        self.business_short_code = settings.MPESA_SHORTCODE
        self.passkey = settings.MPESA_PASSKEY
        self.environment = settings.MPESA_ENVIRONMENT or 'sandbox'
        self.access_token = None

        self.base_url = (
            "https://api.safaricom.co.ke"
            if self.environment == "production"
            else "https://sandbox.safaricom.co.ke"
        )

    def get_mpesa_access_token(self):
        """
        Retrieves OAuth access token from Safaricom Daraja API.
        """
        try:
            credentials = base64.b64encode(
                f"{self.consumer_key}:{self.consumer_secret}".encode()
            ).decode()

            headers = {
                "Authorization": f"Basic {credentials}",
                "Content-Type": "application/json",
            }

            url = f"{self.base_url}/oauth/v1/generate?grant_type=client_credentials"
            response = requests.get(url, headers=headers, timeout=20)
            response.raise_for_status()

            token = response.json().get("access_token")
            if not token:
                raise ValueError("Access token missing in response")

            self.access_token = token
            return self.access_token

        except Exception as e:
            logger.error(f"[MPESA] Access token error: {e}")
            raise
   
    def get_ngrok_public_url():
        """
        Returns the active public Ngrok HTTPS URL from the Ngrok API.
        """
        try:
            ngrok_api = os.getenv("NGROK_API", "http://127.0.0.1:4040/api/tunnels")
            response = requests.get(ngrok_api)
            data = response.json()
            for tunnel in data.get("tunnels", []):
                if tunnel["proto"] == "https":
                    return tunnel["public_url"]
        except Exception as e:
            logging.warning(f"[NGROK] Could not fetch Ngrok public URL: {e}")
        return None

    def generate_password(self):
        """
        Generates the Lipa Na M-Pesa online password.
        """
        timestamp = timezone.now().strftime('%Y%m%d%H%M%S')
        raw = f"{self.business_short_code}{self.passkey}{timestamp}"
        encoded = base64.b64encode(raw.encode()).decode()
        return encoded, timestamp

    def send_stk_push(self, phone_number, amount, account_reference, description, callback_url=None):
        """
        Sends STK Push to user phone via M-Pesa Daraja API.
        """
        try:
            access_token = self.get_mpesa_access_token()
            password, timestamp = self.generate_password()
            if not callback_url:
                ngrok_base = get_ngrok_public_url()
                if ngrok_base:
                    callback_url = f"{ngrok_base}/api/v1/payments/mpesa/callback/"
                else:
                    callback_url = settings.MPESA_CALLBACK_URL  # fallback

            payload = {
                "BusinessShortCode": self.business_short_code,
                "Password": password,
                "Timestamp": timestamp,
                "TransactionType": "CustomerPayBillOnline",
                "Amount": int(amount),
                "PartyA": phone_number,
                "PartyB": self.business_short_code,
                "PhoneNumber": phone_number,
                "CallBackURL": callback_url,
                "AccountReference": account_reference,
                "TransactionDesc": description,
            }

            headers = {
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
            }

            url = f"{self.base_url}/mpesa/stkpush/v1/processrequest"
            response = requests.post(url, json=payload, headers=headers, timeout=30)
            data = response.json()

            if response.status_code == 200 and data.get("ResponseCode") == "0":
                return {
                    "success": True,
                    "CheckoutRequestID": data.get("CheckoutRequestID"),
                    "CustomerMessage": data.get("CustomerMessage"),
                }

            return {
                "success": False,
                "error": data.get("errorMessage") or data.get("ResponseDescription", "STK Push failed"),
            }

        except Exception as e:
            logger.error(f"[MPESA] STK push error: {e}")
            return {"success": False, "error": str(e)}

    def query_transaction(self, checkout_request_id):
        """
        Queries transaction status using CheckoutRequestID.
        """
        try:
            if not self.access_token:
                self.get_mpesa_access_token()

            password, timestamp = self.generate_password()

            payload = {
                "BusinessShortCode": self.business_short_code,
                "Password": password,
                "Timestamp": timestamp,
                "CheckoutRequestID": checkout_request_id,
            }

            headers = {
                "Authorization": f"Bearer {self.access_token}",
                "Content-Type": "application/json",
            }

            url = f"{self.base_url}/mpesa/stkpushquery/v1/query"
            response = requests.post(url, json=payload, headers=headers, timeout=30)
            return response.json()

        except Exception as e:
            logger.error(f"[MPESA] Query transaction error: {e}")
            return {"success": False, "error": str(e)}

    @staticmethod
    def validate_phone_number(phone_number):
        """
        Validates and standardizes Kenyan phone number.
        """
        phone = re.sub(r"[^\d+]", "", phone_number)

        if phone.startswith("0"):
            phone = "254" + phone[1:]
        elif phone.startswith("+254"):
            phone = phone[1:]
        elif not phone.startswith("254"):
            raise ValueError("Invalid phone number format")

        if not re.match(r"^254[17]\d{8}$", phone):
            raise ValueError("Invalid Kenyan phone number")

        return phone


class PaymentProcessor:
    """
    Utility methods for payment processing.
    """

    @staticmethod
    def calculate_processing_fee(amount, fee_percentage):
        return (Decimal(str(amount)) * Decimal(str(fee_percentage)) / 100).quantize(Decimal('0.01'))

    @staticmethod
    def generate_reference(prefix="PAY"):
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        unique_id = str(uuid.uuid4())[:8].upper()
        return f"{prefix}{timestamp}{unique_id}"

    @staticmethod
    def validate_amount(amount, min_amount=1, max_amount=100000):
        try:
            amount = float(amount)
            return min_amount <= amount <= max_amount
        except (ValueError, TypeError):
            return False

    @staticmethod
    def mark_payment_completed(payment: Payment, receipt_number: str):
        payment.status = 'COMPLETED'
        payment.mpesa_receipt_number = receipt_number
        payment.completed_at = timezone.now()
        payment.save(update_fields=['status', 'mpesa_receipt_number', 'completed_at'])
        return payment

    @staticmethod
    def mark_payment_failed(payment: Payment, reason: str):
        payment.status = 'FAILED'
        payment.failure_reason = reason
        payment.save(update_fields=['status', 'failure_reason'])
        return payment 

    @staticmethod
    def create_subscription(user, plan: SubscriptionPlan, payment):
        """
        Creates a new subscription for the given user and plan.
        """
        now = timezone.now()

        # Deactivate existing subscriptions of the same plan
        Subscription.objects.filter(user=user, plan=plan, active=True).update(active=False)

        # Create new subscription
        subscription = Subscription.objects.create(
            user=user,
            plan=plan,
            payment=payment,
            start_date=now,
            end_date=now + timezone.timedelta(hours=plan.duration_hours),
            active=True,
            last_payment_at=now,
            is_renewal_eligible=True,
        )

        # Link to UserSubscription
        UserSubscription.objects.update_or_create(
            user=user,
            defaults={
                'subscription': subscription,
                'active': True,
            }
        )

        return subscription

    @staticmethod
    def attempt_renewal(user, plan: SubscriptionPlan, payment):
        """
        Attempts to renew an expired subscription within the grace period.
        """
        now = timezone.now()
        try:
            sub = Subscription.objects.get(user=user, plan=plan)
        except Subscription.DoesNotExist:
            return None, "No subscription found to renew."

        expired = sub.end_date < now
        within_grace = sub.end_date + timezone.timedelta(hours=plan.renewal_grace_period_hours) >= now

        if not expired:
            return None, "Subscription is still active; no renewal needed."
        if not within_grace:
            return None, "Renewal grace period has expired."

        sub.start_date = now
        sub.end_date = now + timezone.timedelta(hours=plan.duration_hours)
        sub.last_payment_at = now
        sub.active = True
        sub.payment = payment
        sub.save()

        UserSubscription.objects.update_or_create(
            user=user,
            defaults={
                'subscription': sub,
                'active': True,
            }
        )

        return sub, None
    @staticmethod
    def get_or_create_premium_plan():
        plan, _ = SubscriptionPlan.objects.get_or_create(
            name="Premium",
            defaults={
                'price': Decimal('210'),
                'duration_hours': 6,
                'renewal_price': Decimal('50'),
                'renewal_grace_period_hours': 24
            }
        )
        return plan
