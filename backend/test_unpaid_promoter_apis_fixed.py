"""
Test Cases for Unpaid Promoter API Improvements
============================================================

This file contains comprehensive test cases for the new unpaid promoter APIs:
1. Enhanced Unpaid Dashboard API
2. Upgrade Progress API  
3. Premium Comparison API
4. Smart Recommendations API

Run tests with: python manage.py test test_unpaid_promoter_apis_fixed.py
"""

import json
from decimal import Decimal
from django.test import TestCase
from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase
from unittest.mock import patch, MagicMock
from django.utils import timezone
from datetime import timedelta

from promoter.models import Promoter, PromotedProduct, OrderItem, ProductVariant, PremiumSettings
from orders.models import Order

User = get_user_model()


class UnpaidPromoterDashboardAPITestCase(APITestCase):
    """Test cases for enhanced unpaid promoter dashboard API"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testpromoter',
            email='test@example.com',
            first_name='Test',
            last_name='Promoter'
        )
        
        self.promoter = Promoter.objects.create(
            user=self.user,
            promoter_type='unpaid',
            is_approved=True,
            wallet_balance=Decimal('1000.00'),
            total_commission_earned=Decimal('500.00')
        )
        
        # Create test products
        self.product = ProductVariant.objects.create(
            product_name='Test Product',
            variant_name='Test Variant',
            final_price=Decimal('100.00'),
            stock=50
        )
        
        # Create promoted products
        PromotedProduct.objects.create(
            promoter=self.promoter,
            product_variant=self.product,
            click_count=100,
            total_sales=10
        )
        
        # Create test orders
        from orders.models import Order
        order = Order.objects.create(
            user=User.objects.create_user(
                username='customer',
                email='customer@example.com'
            ),
            status='delivered',
            total_amount=Decimal('100.00')
        )
        
        OrderItem.objects.create(
            promoter=self.promoter,
            order=order,
            product_variant=self.product,
            price=Decimal('100.00'),
            quantity=2
        )

    def test_unpaid_dashboard_success(self):
        """Test successful dashboard data retrieval"""
        self.client.force_authenticate(user=self.user)
        url = reverse('unpaid-promoter-dashboard')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        
        # Verify basic stats
        self.assertIn('promoted_products', data)
        self.assertIn('total_referrals', data)
        self.assertIn('successful_orders', data)
        self.assertIn('conversion_rate', data)
        self.assertIn('average_order_value', data)
        
        # Verify enhanced metrics
        self.assertIn('growth_rate', data)
        self.assertIn('premium_progress', data)
        self.assertIn('orders_until_premium', data)
        self.assertIn('top_performing_products', data)
        
        # Verify graph data
        self.assertIn('daily_referrals_graph', data)
        self.assertIn('daily_revenue_graph', data)
        self.assertIn('monthly_revenue_graph', data)

    def test_unpaid_dashboard_conversion_rate_calculation(self):
        """Test conversion rate calculation"""
        self.client.force_authenticate(user=self.user)
        url = reverse('unpaid-promoter-dashboard')
        response = self.client.get(url)
        data = response.json()
        
        # Conversion rate should be orders/clicks * 100
        expected_conversion_rate = (2 / 100) * 100  # 2 orders, 100 clicks
        self.assertEqual(data['conversion_rate'], round(expected_conversion_rate, 2))

    def test_unpaid_dashboard_growth_rate_calculation(self):
        """Test growth rate calculation"""
        self.client.force_authenticate(user=self.user)
        url = reverse('unpaid-promoter-dashboard')
        response = self.client.get(url)
        data = response.json()
        
        # Should calculate growth based on 7-day vs 30-day performance
        self.assertIn('growth_rate', data)
        self.assertIsInstance(data['growth_rate'], (int, float))

    def test_unpaid_dashboard_access_denied_for_paid_promoter(self):
        """Test access denied for paid promoters"""
        self.promoter.promoter_type = 'paid'
        self.promoter.save()
        
        self.client.force_authenticate(user=self.user)
        url = reverse('unpaid-promoter-dashboard')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('Only unpaid promoters can access this dashboard', response.json()['detail'])

    def test_unpaid_dashboard_access_denied_for_unapproved_promoter(self):
        """Test access denied for unapproved promoters"""
        self.promoter.is_approved = False
        self.promoter.save()
        
        self.client.force_authenticate(user=self.user)
        url = reverse('unpaid-promoter-dashboard')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('not yet approved', response.json()['detail'])


class UnpaidPromoterUpgradeProgressAPITestCase(APITestCase):
    """Test cases for upgrade progress API"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testpromoter',
            email='test@example.com',
            first_name='Test',
            last_name='Promoter'
        )
        
        self.promoter = Promoter.objects.create(
            user=self.user,
            promoter_type='unpaid',
            is_approved=True
        )

    def test_upgrade_progress_success(self):
        """Test successful upgrade progress retrieval"""
        self.client.force_authenticate(user=self.user)
        url = reverse('unpaid-upgrade-progress')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        
        # Verify basic structure
        self.assertIn('current_level', data)
        self.assertEqual(data['current_level'], 'unpaid')
        self.assertIn('progress_to_premium', data)
        self.assertIn('milestones', data)
        self.assertIn('achievements', data)
        self.assertIn('next_reward', data)

    def test_upgrade_progress_milestones_structure(self):
        """Test milestones data structure"""
        self.client.force_authenticate(user=self.user)
        url = reverse('unpaid-upgrade-progress')
        response = self.client.get(url)
        data = response.json()
        
        milestones = data['milestones']
        self.assertIsInstance(milestones, list)
        self.assertTrue(len(milestones) > 0)
        
        # Verify milestone structure
        for milestone in milestones:
            self.assertIn('orders', milestone)
            self.assertIn('reward', milestone)
            self.assertIn('completed', milestone)

    def test_upgrade_progress_achievements_structure(self):
        """Test achievements data structure"""
        self.client.force_authenticate(user=self.user)
        url = reverse('unpaid-upgrade-progress')
        response = self.client.get(url)
        data = response.json()
        
        achievements = data['achievements']
        self.assertIsInstance(achievements, list)
        
        # Verify achievement structure
        for achievement in achievements:
            self.assertIn('id', achievement)
            self.assertIn('name', achievement)
            self.assertIn('completed', achievement)


class UnpaidPromoterComparisonAPITestCase(APITestCase):
    """Test cases for premium comparison API"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testpromoter',
            email='test@example.com'
        )
        
        self.promoter = Promoter.objects.create(
            user=self.user,
            promoter_type='unpaid',
            is_approved=True
        )
        
        # Create premium settings
        self.premium_settings = PremiumSettings.objects.create(
            monthly_amount=Decimal('999.00'),
            annual_amount=Decimal('9999.00')
        )

    @patch('promoter.views.PremiumSettings.objects.order_by')
    def test_comparison_success(self, mock_order_by):
        """Test successful comparison data retrieval"""
        mock_instance = MagicMock()
        mock_instance.return_value.first.return_value = self.premium_settings
        
        self.client.force_authenticate(user=self.user)
        url = reverse('unpaid-comparison')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        
        # Verify comparison structure
        self.assertIn('current_benefits', data)
        self.assertIn('premium_benefits', data)
        self.assertIn('upgrade_incentives', data)
        self.assertIn('earnings_potential', data)
        self.assertIn('upgrade_requirements', data)

    def test_comparison_benefits_structure(self):
        """Test benefits data structure"""
        self.client.force_authenticate(user=self.user)
        url = reverse('unpaid-comparison')
        response = self.client.get(url)
        data = response.json()
        
        current_benefits = data['current_benefits']
        premium_benefits = data['premium_benefits']
        
        self.assertIsInstance(current_benefits, list)
        self.assertIsInstance(premium_benefits, list)
        self.assertTrue(len(current_benefits) > 0)
        self.assertTrue(len(premium_benefits) > 0)

    def test_comparison_earnings_potential_calculation(self):
        """Test earnings potential calculation"""
        self.client.force_authenticate(user=self.user)
        url = reverse('unpaid-comparison')
        response = self.client.get(url)
        data = response.json()
        
        earnings = data['earnings_potential']
        self.assertIn('current_avg_commission', earnings)
        self.assertIn('premium_avg_commission', earnings)
        self.assertIn('potential_increase', earnings)
        
        # Should show percentage increase
        self.assertTrue('%' in earnings['potential_increase'])


class UnpaidPromoterRecommendationsAPITestCase(APITestCase):
    """Test cases for smart recommendations API"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testpromoter',
            email='test@example.com'
        )
        
        self.promoter = Promoter.objects.create(
            user=self.user,
            promoter_type='unpaid',
            is_approved=True
        )
        
        # Create test products with different characteristics
        self.product1 = ProductVariant.objects.create(
            product_name='High Price Product',
            variant_name='Premium',
            final_price=Decimal('2000.00'),
            stock=100,
            created_at=timezone.now() - timedelta(days=10)
        )
        
        self.product2 = ProductVariant.objects.create(
            product_name='Trending Product',
            variant_name='Popular',
            final_price=Decimal('500.00'),
            stock=20,
            created_at=timezone.now() - timedelta(days=5)
        )
        
        self.product3 = ProductVariant.objects.create(
            product_name='New Product',
            variant_name='Latest',
            final_price=Decimal('100.00'),
            stock=5,
            created_at=timezone.now() - timedelta(days=2)
        )

    def test_recommendations_success(self):
        """Test successful recommendations retrieval"""
        self.client.force_authenticate(user=self.user)
        url = reverse('unpaid-recommendations')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        
        # Verify recommendations structure
        self.assertIn('recommended_products', data)
        self.assertIn('market_insights', data)

    def test_recommendations_scoring_algorithm(self):
        """Test recommendation scoring algorithm"""
        self.client.force_authenticate(user=self.user)
        url = reverse('unpaid-recommendations')
        response = self.client.get(url)
        data = response.json()
        
        recommendations = data['recommended_products']
        self.assertIsInstance(recommendations, list)
        
        # Verify scoring system works
        for rec in recommendations:
            self.assertIn('recommendation_score', rec)
            self.assertIn('recommendation_reasons', rec)
            self.assertIn('potential_commission', rec)
            self.assertIn('projected_earning', rec)
            
            # Score should be between 0-100
            self.assertGreaterEqual(rec['recommendation_score'], 0)
            self.assertLessEqual(rec['recommendation_score'], 100)

    def test_recommendations_high_price_preference(self):
        """Test high price products get higher scores"""
        self.client.force_authenticate(user=self.user)
        url = reverse('unpaid-recommendations')
        response = self.client.get(url)
        data = response.json()
        
        recommendations = data['recommended_products']
        
        # Find high price product recommendation
        high_price_rec = next(
            (r for r in recommendations if 'High price point' in r.get('recommendation_reasons', [])),
            None
        )
        
        self.assertIsNotNone(high_price_rec)
        self.assertGreater(high_price_rec['recommendation_score'], 50)

    def test_recommendations_new_arrival_preference(self):
        """Test new arrival products get bonus points"""
        self.client.force_authenticate(user=self.user)
        url = reverse('unpaid-recommendations')
        response = self.client.get(url)
        data = response.json()
        
        recommendations = data['recommended_products']
        
        # Find new arrival recommendation
        new_arrival_rec = next(
            (r for r in recommendations if 'New arrival' in r.get('recommendation_reasons', [])),
            None
        )
        
        self.assertIsNotNone(new_arrival_rec)
        self.assertGreater(new_arrival_rec['recommendation_score'], 15)

    def test_recommendations_market_insights(self):
        """Test market insights data"""
        self.client.force_authenticate(user=self.user)
        url = reverse('unpaid-recommendations')
        response = self.client.get(url)
        data = response.json()
        
        insights = data['market_insights']
        self.assertIn('trending_categories', insights)
        self.assertIn('seasonal_trends', insights)
        self.assertIn('commission_opportunities', insights)

    def test_recommendations_access_denied_for_paid_promoter(self):
        """Test access denied for paid promoters"""
        self.promoter.promoter_type = 'paid'
        self.promoter.save()
        
        self.client.force_authenticate(user=self.user)
        url = reverse('unpaid-recommendations')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('Only unpaid promoters can access recommendations', response.json()['detail'])


class APIIntegrationTestCase(APITestCase):
    """Test API integration and edge cases"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testpromoter',
            email='test@example.com',
            password='testpass123'
        )

    def test_unauthenticated_access(self):
        """Test that all endpoints require authentication"""
        endpoints = [
            'unpaid-promoter-dashboard',
            'unpaid-upgrade-progress', 
            'unpaid-comparison',
            'unpaid-recommendations'
        ]
        
        for endpoint in endpoints:
            url = reverse(endpoint)
            response = self.client.get(url)
            self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_non_promoter_access(self):
        """Test that non-promoters get 403"""
        regular_user = User.objects.create_user(
            username='regularuser',
            email='regular@example.com'
        )
        
        endpoints = [
            'unpaid-promoter-dashboard',
            'unpaid-upgrade-progress', 
            'unpaid-comparison',
            'unpaid-recommendations'
        ]
        
        for endpoint in endpoints:
            self.client.force_authenticate(user=regular_user)
            url = reverse(endpoint)
            response = self.client.get(url)
            # Should get 403 or 404 depending on implementation
            self.assertIn(response.status_code, [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND])

    def test_database_error_handling(self):
        """Test proper error handling for database issues"""
        user = User.objects.create_user(
            username='testpromoter',
            email='test@example.com'
        )
        
        # Create promoter but don't approve to test error handling
        promoter = Promoter.objects.create(
            user=user,
            promoter_type='unpaid',
            is_approved=False  # This should cause some endpoints to fail
        )
        
        self.client.force_authenticate(user=user)
        url = reverse('unpaid-promoter-dashboard')
        response = self.client.get(url)
        
        # Should return 403 for unapproved promoter
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('not yet approved', response.json()['detail'])

    def test_response_format_consistency(self):
        """Test that all responses follow consistent format"""
        user = User.objects.create_user(
            username='testpromoter',
            email='test@example.com'
        )
        
        promoter = Promoter.objects.create(
            user=user,
            promoter_type='unpaid',
            is_approved=True
        )
        
        endpoints = [
            'unpaid-promoter-dashboard',
            'unpaid-upgrade-progress', 
            'unpaid-comparison',
            'unpaid-recommendations'
        ]
        
        for endpoint in endpoints:
            self.client.force_authenticate(user=user)
            url = reverse(endpoint)
            response = self.client.get(url)
            
            # All successful responses should be 200
            if response.status_code == status.HTTP_200_OK:
                data = response.json()
                
                # Verify response is valid JSON
                self.assertIsInstance(data, dict)
                
                # Verify no sensitive data leakage
                self.assertNotIn('password', str(data))
                self.assertNotIn('secret', str(data))


if __name__ == '__main__':
    import django
    from django.conf import settings
    from django.core.management import execute_from_command_line
    
    # Configure Django settings
    settings.configure(
        DEBUG=True,
        DATABASES={
            'default': {
                'ENGINE': 'django.db.backends.sqlite3',
                'NAME': ':memory:',
            }
        }
    )
    
    # Run tests
    execute_from_command_line(['test', 'test_unpaid_promoter_apis_fixed.py'])
