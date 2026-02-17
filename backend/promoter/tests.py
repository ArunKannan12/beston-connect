from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from .models import Promoter, PromoterBankAccount

User = get_user_model()

class PromoterBankAccountTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(email='test@example.com', password='password123')
        self.promoter = Promoter.objects.create(user=self.user, promoter_type='paid')
        self.client.force_authenticate(user=self.user)
        self.url = '/api/promoter/bank-account/'
        self.detail_url = '/api/promoter/bank-account/detail/'

    def test_create_bank_account(self):
        data = {
            "account_holder_name": "Test User",
            "account_number": "1234567890",
            "ifsc_code": "SBIN0001234",
            "bank_name": "SBI"
        }
        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(PromoterBankAccount.objects.filter(promoter=self.promoter).exists())

    def test_retrieve_bank_account(self):
        # Create directly first
        PromoterBankAccount.objects.create(
            promoter=self.promoter,
            account_holder_name="Test User",
            account_number="1234567890",
            ifsc_code="SBIN0001234",
            bank_name="SBI"
        )
        response = self.client.get(self.detail_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['account_number'], "1234567890")

    def test_create_duplicate_bank_account_fails(self):
        # Create one first
        PromoterBankAccount.objects.create(
            promoter=self.promoter,
            account_holder_name="Test User",
            account_number="1234567890",
            ifsc_code="SBIN0001234",
            bank_name="SBI"
        )
        # Try to create another via API
        data = {
            "account_holder_name": "Test User 2",
            "account_number": "0987654321",
            "ifsc_code": "HDFC0001234",
            "bank_name": "HDFC"
        }
        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
