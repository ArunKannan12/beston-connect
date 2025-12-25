# Beston Connect

Beston Connect is a production-ready full-stack e-commerce platform built with **React** and **Django REST Framework**, designed to handle real-world business workflows including payments, logistics, referrals, commissions, and multi-role users.

🔗 **Live Demo:** https://beston.netlify.app/login  
📦 **Backend:** Django + DRF  
🗄 **Database:** NeonDB (PostgreSQL)  
💳 **Payments:** Razorpay  
🚚 **Logistics:** Delhivery API  
📧 **Emails:** Brevo  

---

## 🚀 Features

### 👤 Authentication & Roles
- JWT-based authentication using HTTP-only cookies
- Google OAuth2 login
- Password reset and change flows
- **Multi-role user system**: a single account can act as both **Customer** and **Promoter**
- Seamless **role switching** with role-based permissions

### 🛒 Customer Features
- Product listing, search, banners, and categories
- Add to cart and buy-now checkout
- Ratings and reviews
- Profile management
- Secure order placement and tracking

### 💼 Promoter System
- Referral-based order tracking
- Commission calculation per order
- Promoter wallet and withdrawal workflow
- Dashboards for earnings and referrals
- Support for paid and unpaid promoters

### 🧾 Order & Logistics
- Razorpay payment integration with server-side verification
- Atomic transactions for order creation, stock updates, and cancellations
- Delhivery API integration for:
  - Shipment creation
  - Delivery charges
  - Pincode serviceability
  - Returns, replacements, and cancellations

### 🛠 Admin Panel
- Manage products, categories, banners
- Order lifecycle management
- Customer, promoter, and investor management
- Commission and payout oversight

### 📧 Notifications
- Automated transactional emails via Brevo:
  - Order confirmation
  - Shipping updates
  - Promoter notifications

---

## 🧱 Architecture Overview

- Modular Django apps for **users, orders, payments, promoters, investors, delivery, and admin**
- Role-based access control (**Customer, Promoter, Investor, Admin**)
- Atomic database transactions for financial and stock integrity
- Secure webhook handling for payment verification
- Environment-specific configuration for third-party services

---

## ⚙️ Tech Stack

### Frontend
- React
- Axios
- React Router

### Backend
- Django
- Django REST Framework
- PostgreSQL (NeonDB)

### Integrations
- Razorpay
- Delhivery API
- Brevo Email API

### Deployment
- Frontend: Netlify
- Backend: Render

---

## 🧪 Security & Reliability

- JWT authentication via HTTP-only cookies
- Role-based API permissions
- Server-side payment verification
- Idempotent payment handling
- Atomic transactions for critical flows

---

## 🏁 Getting Started (Local Setup)

```bash
# Clone the repo
git clone https://github.com/ArunKannan12/beston-connect.git
cd beston-connect

# Backend setup
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Environment variables
cp .env.example .env
# Add Razorpay, Delhivery, Brevo, and DB credentials

# Run migrations
python manage.py migrate

# Start server
python manage.py runserver
