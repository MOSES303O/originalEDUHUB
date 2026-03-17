# apps/payments/tests.py
import requests
import responses
import json
from django.test import TestCase
from django.conf import settings
from apps.payments.utils import DarajaService


class DarajaServiceTests(TestCase):
    def setUp(self):
        self.daraja = DarajaService()
        self.responses = responses.RequestsMock()
        self.responses.start()
        self.addCleanup(self.responses.stop)
        self.addCleanup(self.responses.reset)

        # Use real settings for realism (but mock HTTP)
        self.daraja.shortcode = getattr(settings, 'MPESA_SHORTCODE', '174379')
        self.daraja.callback_url = getattr(settings, 'CALLBACK_URL', 'https://test-callback.com/mpesa/callback/')

    def test_get_access_token_success(self):
        self.responses.add(
            responses.GET,
            "https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
            json={"access_token": "mock_token_abc123", "expires_in": "3600"},
            status=200
        )

        token = self.daraja.get_access_token()
        self.assertEqual(token, "mock_token_abc123")

    def test_get_access_token_failure(self):
        self.responses.add(
            responses.GET,
            "https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
            json={"error": "invalid_client"},
            status=401
        )

        with self.assertRaises(Exception) as cm:
            self.daraja.get_access_token()
        self.assertIn("Daraja auth failed", str(cm.exception))
        self.assertIn("401", str(cm.exception))

    def test_stk_push_success(self):
        self.responses.add(
            responses.GET,
            "https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
            json={"access_token": "mock_token_abc123", "expires_in": "3600"},
            status=200
        )

        self.responses.add(
            responses.POST,
            "https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
            json={
                "MerchantRequestID": "mock-merchant-12345",
                "CheckoutRequestID": "ws_CO_mock_987654321",
                "ResponseCode": "0",
                "ResponseDescription": "Success. Request accepted for processing",
                "CustomerMessage": "Success. Request accepted for processing"
            },
            status=200
        )

        result = self.daraja.stk_push("254717909471", 210, "TestRef123")
        self.assertTrue(result["success"])
        self.assertEqual(result["CheckoutRequestID"], "ws_CO_mock_987654321")
        self.assertIn("Success", result["message"])

    def test_stk_push_failure(self):
        self.responses.add(
            responses.GET,
            "https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
            json={"access_token": "mock_token_abc123", "expires_in": "3600"},
            status=200
        )

        self.responses.add(
            responses.POST,
            "https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
            json={
                "errorCode": "500.001.1001",
                "errorMessage": "Wrong credentials"
            },
            status=500
        )

        result = self.daraja.stk_push("254717909471", 210, "TestRef123")
        self.assertFalse(result["success"])
        self.assertIn("Wrong credentials", result["error"])  # Now passes with fixed parsing

    def test_stk_push_timeout(self):
        self.responses.add(
            responses.GET,
            "https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
            json={"access_token": "mock_token_abc123", "expires_in": "3600"},
            status=200
        )

        self.responses.add(
            responses.POST,
            "https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
            body=requests.exceptions.Timeout("Mock timeout"),
            status=0
        )

        result = self.daraja.stk_push("254717909471", 210, "TestRef123")
        self.assertFalse(result["success"])
        self.assertIn("timeout", result["error"].lower())

    def test_stk_push_invalid_response(self):
        self.responses.add(
            responses.GET,
            "https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
            json={"access_token": "mock_token_abc123", "expires_in": "3600"},
            status=200
        )

        self.responses.add(
            responses.POST,
            "https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
            body="Not JSON at all - this will cause JSONDecodeError",
            status=200
        )

        result = self.daraja.stk_push("254717909471", 210, "TestRef123")
        self.assertFalse(result["success"])
        self.assertIn("Unknown Daraja error", result["error"])