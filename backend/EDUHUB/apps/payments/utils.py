# payments/utils.py — FINAL VERSION WITH 6-HOUR PLAN + 24-HOUR RENEWAL GRACE
from django_daraja.mpesa.core import MpesaClient
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

class MpesaService:
    def __init__(self):
        self.client = MpesaClient()
        self.callback_url = settings.CALLBACK_URL  

    def stk_push(self, phone_number: str, amount: int, account_reference: str = "EduHub Premium"):
        try:
            if phone_number.startswith("0"):
                phone_number = "254" + phone_number[1:]
            elif phone_number.startswith("+254"):
                phone_number = phone_number[1:]

            if amount < 1:
                raise ValueError("Amount must be at least 1")

            response = self.client.stk_push(
                phone_number=phone_number,
                amount=amount,
                account_reference=account_reference,
                transaction_desc="EduHub Premium Access",
                callback_url=self.callback_url,
            )

            if response.response_code == "0":
                return {
                    "success": True,
                    "CheckoutRequestID": response.checkout_request_id,
                    "message": response.customer_message or "STK Push sent",
                }
            else:
                return {
                    "success": False,
                    "error": response.response_description or "M-Pesa error",
                }

        except Exception as e:
            logger.error(f"STK Push error: {e}")
            return {"success": False, "error": str(e)}

