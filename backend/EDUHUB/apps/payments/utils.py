import requests
import base64
import json
from datetime import datetime
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


class MpesaService:
    """
    Service class for M-Pesa Daraja API integration
    """
    
    def __init__(self):
        self.consumer_key = getattr(settings, 'MPESA_CONSUMER_KEY', '')
        self.consumer_secret = getattr(settings, 'MPESA_CONSUMER_SECRET', '')
        self.business_short_code = getattr(settings, 'MPESA_BUSINESS_SHORT_CODE', '')
        self.passkey = getattr(settings, 'MPESA_PASSKEY', '')
        self.environment = getattr(settings, 'MPESA_ENVIRONMENT', 'sandbox')
        
        # Set API URLs based on environment
        if self.environment == 'production':
            self.base_url = 'https://api.safaricom.co.ke'
        else:
            self.base_url = 'https://sandbox.safaricom.co.ke'
        
        self.access_token = None

    def get_access_token(self):
        """
        Get OAuth access token from M-Pesa API
        """
        try:
            if not self.consumer_key or not self.consumer_secret:
                raise ValueError("M-Pesa consumer key and secret are required")

            # Create credentials
            credentials = base64.b64encode(
                f"{self.consumer_key}:{self.consumer_secret}".encode()
            ).decode()

            headers = {
                'Authorization': f'Basic {credentials}',
                'Content-Type': 'application/json'
            }

            url = f"{self.base_url}/oauth/v1/generate?grant_type=client_credentials"
            
            response = requests.get(url, headers=headers, timeout=30)
            response.raise_for_status()
            
            data = response.json()
            self.access_token = data.get('access_token')
            
            if not self.access_token:
                raise ValueError("Failed to get access token")
            
            logger.info("M-Pesa access token obtained successfully")
            return self.access_token

        except Exception as e:
            logger.error(f"Error getting M-Pesa access token: {str(e)}")
            raise

    def generate_password(self):
        """
        Generate password for STK Push
        """
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        password_string = f"{self.business_short_code}{self.passkey}{timestamp}"
        password = base64.b64encode(password_string.encode()).decode()
        return password, timestamp

    def stk_push(self, phone_number, amount, account_reference, transaction_desc, callback_url):
        """
        Initiate STK Push payment
        
        Args:
            phone_number: Customer phone number (254XXXXXXXXX)
            amount: Amount to be paid
            account_reference: Account reference
            transaction_desc: Transaction description
            callback_url: Callback URL for payment confirmation
            
        Returns:
            Dict with response data
        """
        try:
            # Get access token
            if not self.access_token:
                self.get_access_token()

            # Generate password and timestamp
            password, timestamp = self.generate_password()

            # Prepare request data
            payload = {
                "BusinessShortCode": self.business_short_code,
                "Password": password,
                "Timestamp": timestamp,
                "TransactionType": "CustomerPayBillOnline",
                "Amount": amount,
                "PartyA": phone_number,
                "PartyB": self.business_short_code,
                "PhoneNumber": phone_number,
                "CallBackURL": callback_url,
                "AccountReference": account_reference,
                "TransactionDesc": transaction_desc
            }

            headers = {
                'Authorization': f'Bearer {self.access_token}',
                'Content-Type': 'application/json'
            }

            url = f"{self.base_url}/mpesa/stkpush/v1/processrequest"
            
            response = requests.post(
                url, 
                json=payload, 
                headers=headers, 
                timeout=30
            )
            
            response.raise_for_status()
            data = response.json()
            
            logger.info(f"STK Push initiated: {data}")
            return data

        except Exception as e:
            logger.error(f"Error initiating STK Push: {str(e)}")
            return {
                'ResponseCode': '1',
                'errorMessage': str(e)
            }

    def query_transaction(self, checkout_request_id):
        """
        Query STK Push transaction status
        
        Args:
            checkout_request_id: CheckoutRequestID from STK Push response
            
        Returns:
            Dict with transaction status
        """
        try:
            # Get access token
            if not self.access_token:
                self.get_access_token()

            # Generate password and timestamp
            password, timestamp = self.generate_password()

            payload = {
                "BusinessShortCode": self.business_short_code,
                "Password": password,
                "Timestamp": timestamp,
                "CheckoutRequestID": checkout_request_id
            }

            headers = {
                'Authorization': f'Bearer {self.access_token}',
                'Content-Type': 'application/json'
            }

            url = f"{self.base_url}/mpesa/stkpushquery/v1/query"
            
            response = requests.post(
                url, 
                json=payload, 
                headers=headers, 
                timeout=30
            )
            
            response.raise_for_status()
            data = response.json()
            
            logger.info(f"Transaction query result: {data}")
            return data

        except Exception as e:
            logger.error(f"Error querying transaction: {str(e)}")
            return {
                'ResponseCode': '1',
                'errorMessage': str(e)
            }

    def validate_phone_number(self, phone_number):
        """
        Validate and format Kenyan phone number
        
        Args:
            phone_number: Phone number to validate
            
        Returns:
            Formatted phone number (254XXXXXXXXX)
        """
        import re
        
        # Remove any non-digit characters except +
        phone = re.sub(r'[^\d+]', '', phone_number)
        
        # Convert to 254 format
        if phone.startswith('0'):
            phone = '254' + phone[1:]
        elif phone.startswith('+254'):
            phone = phone[1:]
        elif phone.startswith('254'):
            pass  # Already in correct format
        else:
            raise ValueError("Invalid phone number format")
        
        # Validate length and format
        if not re.match(r'^254[17]\d{8}$', phone):
            raise ValueError("Invalid Kenyan phone number")
        
        return phone


class PaymentProcessor:
    """
    General payment processing utilities
    """
    
    @staticmethod
    def calculate_processing_fee(amount, fee_percentage):
        """
        Calculate processing fee for a payment
        
        Args:
            amount: Payment amount
            fee_percentage: Fee percentage
            
        Returns:
            Processing fee amount
        """
        from decimal import Decimal
        return (Decimal(str(amount)) * Decimal(str(fee_percentage)) / 100).quantize(Decimal('0.01'))

    @staticmethod
    def generate_reference_number(prefix='REF'):
        """
        Generate unique reference number
        
        Args:
            prefix: Reference number prefix
            
        Returns:
            Unique reference number
        """
        import uuid
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        unique_id = str(uuid.uuid4())[:8].upper()
        return f"{prefix}{timestamp}{unique_id}"

    @staticmethod
    def validate_amount(amount, min_amount=1, max_amount=1000000):
        """
        Validate payment amount
        
        Args:
            amount: Amount to validate
            min_amount: Minimum allowed amount
            max_amount: Maximum allowed amount
            
        Returns:
            Boolean indicating if amount is valid
        """
        try:
            amount = float(amount)
            return min_amount <= amount <= max_amount
        except (ValueError, TypeError):
            return False