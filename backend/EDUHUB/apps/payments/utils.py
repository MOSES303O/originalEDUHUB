# payments/utils.py — FINAL PRODUCTION VERSION (Raw Daraja APIs, no django-daraja wrapper)
import requests
import base64
import json
from datetime import datetime
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

class DarajaService:
    def __init__(self):
        self.BASES = "https://api.safaricom.co.ke"
        self.consumer_key = settings.MPESA_CONSUMER_KEY
        self.consumer_secret = settings.MPESA_CONSUMER_SECRET
        self.shortcode = settings.MPESA_SHORTCODE
        self.passkey = settings.MPESA_PASSKEY
        self.callback_url = settings.CALLBACK_URL

    def get_access_token(self):
        """Get OAuth token from Safaricom"""
        # In get_access_token() — add this debug block 
        import socket
        
        try:
            ip = socket.gethostbyname('api.safaricom.co.ke')
            logger.info(f"Resolved api.safaricom.co.ke to IP: {ip}")
        except Exception as e:
            logger.error(f"DNS resolution failed for api.safaricom.co.ke: {e}")
            raise
        
        try:
            s = socket.create_connection(("api.safaricom.co.ke", 443), timeout=10)
            s.close()
            logger.info("TCP connection to api.safaricom.co.ke:443 succeeded")
        except Exception as e:
            logger.error(f"Cannot connect to api.safaricom.co.ke:443: {e}")
            raise
        url = f"{self.BASES}/oauth/v1/generate?grant_type=client_credentials"
        auth = base64.b64encode(f"{self.consumer_key}:{self.consumer_secret}".encode()).decode()

        headers = {
            "Authorization": f"Basic {auth}",
            "Content-Type": "application/json"
        }

        try:
            response = requests.get(url, headers=headers, timeout=30)
            response.raise_for_status()
            data = response.json()
            return data["access_token"]
        except Exception as e:
            logger.error(f"Failed to get Daraja access token: {e}")
            raise Exception(f"Daraja auth failed: {str(e)}")

    def stk_push(self, phone_number: str, amount: int, account_reference: str = "EduHub Premium"):
        """Initiate STK Push using raw Daraja endpoint"""
        token = self.get_access_token()
        url = f"{self.BASES}/mpesa/stkpush/v1/processrequest"
    
        # Format timestamp (Daraja requires YYYYMMDDHHmmss)
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    
        # Password = base64(shortcode + passkey + timestamp)
        password_str = f"{self.shortcode}{self.passkey}{timestamp}"
        password = base64.b64encode(password_str.encode()).decode()
    
        # Clean phone number
        if phone_number.startswith("0"):
            phone_number = "254" + phone_number[1:]
        elif phone_number.startswith("+254"):
            phone_number = phone_number[1:]
    
        payload = {
            "BusinessShortCode": self.shortcode,
            "Password": password,
            "Timestamp": timestamp,
            "TransactionType": "CustomerPayBillOnline",
            "Amount": str(amount),
            "PartyA": phone_number,
            "PartyB": self.shortcode,
            "PhoneNumber": phone_number,
            "CallBackURL": self.callback_url,
            "AccountReference": account_reference,
            "TransactionDesc": "EduHub Premium Access"
        }
    
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
    
        try:
            logger.info(f"Initiating STK Push to Safaricom: phone={phone_number}, amount={amount}, ref={account_reference}")
            logger.info(f"Payload being sent: {json.dumps(payload, indent=2)}")
    
            response = requests.post(url, json=payload, headers=headers, timeout=30)
    
            # LOG RAW RESPONSE BEFORE ANYTHING ELSE
            logger.info(f"Safaricom raw status code: {response.status_code}")
            logger.info(f"Safaricom raw response headers: {response.headers}")
            logger.info(f"Safaricom raw response text: {response.text}")
    
            response.raise_for_status()
    
            data = response.json()
    
            if data.get("ResponseCode") == "0":
                checkout_id = data.get("CheckoutRequestID")
                logger.info(f"STK Push success: CheckoutRequestID={checkout_id}")
                # <--- INTEGRATED HERE --->
                logger.info(f"STK Push initiated successfully - Prompt should appear on {phone_number} for {amount} KES")
                # <------------------------>
                return {
                    "success": True,
                    "CheckoutRequestID": checkout_id,
                    "MerchantRequestID": data.get("MerchantRequestID"),
                    "message": data.get("CustomerMessage", "STK Push sent")
                }
            else:
                error_msg = data.get("ResponseDescription", data.get("errorMessage", "Unknown Daraja error"))
                logger.warning(f"STK Push rejected by Safaricom: {error_msg}")
                return {
                    "success": False,
                    "error": error_msg
                }
    
        except requests.exceptions.HTTPError as http_err:
            logger.error(f"Safaricom HTTP error: {http_err} - Response body: {response.text if 'response' in locals() else 'No response'}")
            return {"success": False, "error": str(http_err)}
    
        except requests.exceptions.RequestException as req_err:
            logger.error(f"Request exception during STK Push: {req_err}")
            return {"success": False, "error": str(req_err)}
    
        except Exception as e:
            logger.error(f"Unexpected error in STK Push: {e}")
            return {"success": False, "error": str(e)}
    
    def stk_push_query(self, checkout_request_id: str):
        """Query STK Push status using raw Daraja endpoint"""
        token = self.get_access_token()
        url = f"{self.BASES}/mpesa/stkpushquery/v1/query"

        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        password_str = f"{self.shortcode}{self.passkey}{timestamp}"
        password = base64.b64encode(password_str.encode()).decode()

        payload = {
            "BusinessShortCode": self.shortcode,
            "Password": password,
            "Timestamp": timestamp,
            "CheckoutRequestID": checkout_request_id
        }

        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }

        try:
            response = requests.post(url, json=payload, headers=headers, timeout=10)
            response.raise_for_status()
            data = response.json()

            return {
                "success": data.get("ResponseCode") == "0",
                "result_code": data.get("ResultCode"),
                "result_desc": data.get("ResultDesc"),
                "metadata": data.get("CallbackMetadata", {})
            }

        except Exception as e:
            logger.error(f"STK Push Query failed: {e}")
            return {"success": False, "error": str(e)}