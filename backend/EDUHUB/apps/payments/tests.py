from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase, APIClient
from django.contrib.auth import get_user_model
from .models import Payment, UserSubscription, SubscriptionPlan

User = get_user_model()

class PaymentAppTests(APITestCase):
    def setUp(self):
        # Create test user and authenticate
        self.user = User.objects.create_user(username='testuser', password='password123')
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

        # Create subscription plan and UserSubscription (mock)
        self.plan = SubscriptionPlan.objects.create(
            name='Monthly Plan',
            billing_cycle='monthly',
            price=1000
        )

        # Create a pending payment for the user
        self.payment = Payment.objects.create(
            user=self.user,
            amount=1000,
            status='PENDING',
            reference='PAY123456789',
            subscription_type=self.plan,
            mpesa_checkout_request_id='ABC12345'
        )

    def test_mpesa_callback_success(self):
        """Test successful M-Pesa callback updates payment and creates subscription."""
        url = reverse('mpesa-callback')  # Make sure your URL name is correct
        callback_payload = {
            "Body": {
                "stkCallback": {
                    "MerchantRequestID": "12345",
                    "CheckoutRequestID": self.payment.mpesa_checkout_request_id,
                    "ResultCode": 0,
                    "ResultDesc": "Success",
                    "CallbackMetadata": {
                        "Item": [
                            {"Name": "MpesaReceiptNumber", "Value": "ABCDEF1234"},
                            {"Name": "Amount", "Value": self.payment.amount},
                            {"Name": "TransactionDate", "Value": 20250606120000},
                            {"Name": "PhoneNumber", "Value": 254700000000}
                        ]
                    }
                }
            }
        }
        response = self.client.post(url, callback_payload, format='json')
        self.payment.refresh_from_db()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(self.payment.status, 'COMPLETED')
        self.assertEqual(self.payment.mpesa_receipt_number, 'ABCDEF1234')

        # Check if user subscription created or updated
        user_sub = UserSubscription.objects.filter(user=self.user, subscription_type=self.plan).first()
        self.assertIsNotNone(user_sub)
        self.assertTrue(user_sub.is_active)

        # Check user premium flag
        self.user.refresh_from_db()
        self.assertTrue(self.user.is_premium)

    def test_mpesa_callback_failure(self):
        """Test M-Pesa callback failure updates payment status to FAILED."""
        url = reverse('mpesa-callback')
        callback_payload = {
            "Body": {
                "stkCallback": {
                    "MerchantRequestID": "12345",
                    "CheckoutRequestID": self.payment.mpesa_checkout_request_id,
                    "ResultCode": 1,
                    "ResultDesc": "Insufficient funds"
                }
            }
        }
        response = self.client.post(url, callback_payload, format='json')
        self.payment.refresh_from_db()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(self.payment.status, 'FAILED')
        self.assertEqual(self.payment.failure_reason, 'Insufficient funds')

    def test_mpesa_callback_invalid_checkout_request(self):
        """Test callback with missing CheckoutRequestID returns 400."""
        url = reverse('mpesa-callback')
        callback_payload = {"Body": {"stkCallback": {}}}
        response = self.client.post(url, callback_payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_payment_verification_success(self):
        """Test successful payment verification by user."""
        url = reverse('payment-verify')
        data = {'payment_reference': self.payment.reference}
        response = self.client.post(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['success'], True)
        self.assertEqual(response.data['data']['reference'], self.payment.reference)

    def test_payment_verification_no_reference(self):
        """Test payment verification missing payment_reference returns 400."""
        url = reverse('payment-verify')
        response = self.client.post(url, {}, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_payment_verification_not_found(self):
        """Test payment verification with unknown reference returns 404."""
        url = reverse('payment-verify')
        data = {'payment_reference': 'UNKNOWNREF'}
        response = self.client.post(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_user_subscriptions_list(self):
        """Test listing user subscriptions returns only user's subs."""
        url = reverse('user-subscription')
        # Create a subscription for the user
        UserSubscription.objects.create(
            user=self.user,
            subscription_type=self.plan,
            start_date=timezone.now().date(),
            end_date=timezone.now().date() + timezone.timedelta(days=30),
            is_active=True,
            amount_paid=1000
        )
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(len(response.data) > 0)

    def test_user_active_subscription(self):
        """Test retrieving user's active subscription."""
        url = reverse('subscription-status')
        sub = UserSubscription.objects.create(
            user=self.user,
            subscription_type=self.plan,
            start_date=timezone.now().date(),
            end_date=timezone.now().date() + timezone.timedelta(days=30),
            is_active=True,
            amount_paid=1000
        )
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['success'], True)
        self.assertEqual(response.data['data']['id'], sub.id)

    def test_user_active_subscription_not_found(self):
        """Test no active subscription returns 404."""
        url = reverse('subscription-status')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
