# 🛡️ ReSell Hub — REST API Backend

> **High-Performance, Secure Node.js & Express RESTful API for ReSell Hub Marketplace.**

[![Node.js](https://img.shields.io/badge/Node.js-18+-green?style=for-the-badge&logo=node.js)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5.x-black?style=for-the-badge&logo=express)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb)](https://www.mongodb.com/)
[![JWT](https://img.shields.io/badge/JWT-Secure-pink?style=for-the-badge&logo=jsonwebtokens)](https://jwt.io/)

---

## 🚀 API Endpoints Overview

### Authentication (`/api/auth`)
- `POST /api/auth/register` — Register a new user account
- `POST /api/auth/login` — Login with email/password & receive JWT tokens
- `POST /api/auth/logout` — Clear session cookies and invalidate token
- `POST /api/auth/google` — Google OAuth authentication handler
- `GET /api/auth/me` — Retrieve current authenticated user profile
- `POST /api/auth/refresh-token` — Rotate and refresh access token

### Products & Listings (`/api/products`)
- `GET /api/products` — Filter & paginate listings (search, category, condition, price, sort)
- `GET /api/products/featured` — Get high-priority verified listings
- `GET /api/products/:id` — Get full product detail and increment view count
- `POST /api/products` — Create a new listing (with Cloudinary image uploads)
- `PUT /api/products/:id` — Update listing details (Owner or Admin)
- `DELETE /api/products/:id` — Remove a listing

### Orders & Escrow (`/api/orders`)
- `POST /api/orders` — Create escrow order for checkout
- `GET /api/orders/my-orders` — Get buyer's orders & tracking statuses
- `GET /api/orders/seller-orders` — Get seller's incoming orders to fulfill
- `PATCH /api/orders/:id/status` — Update delivery / inspection / payout status

### Payments (`/api/payments`)
- `POST /api/payments/create-intent` — Initialize Stripe PaymentIntent
- `POST /api/payments/confirm` — Confirm payment and lock funds in escrow vault

### Messages & Chat (`/api/messages`)
- `GET /api/messages/conversations` — Retrieve conversation threads
- `GET /api/messages/:conversationId` — Load chat history
- `POST /api/messages` — Send new message

### Admin Management (`/api/admin`)
- `GET /api/admin/stats` — Platform KPI statistics and revenue figures
- `GET /api/admin/users` — List and manage users (promote, ban, verify)
- `GET /api/admin/disputes` — Dispute arbitration queue

---

## ⚙️ Environment Variables

```env
PORT=5000
NODE_ENV=production

# MongoDB Connection
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/resell-hub?retryWrites=true&w=majority

# JWT Secrets
JWT_SECRET=super_secret_jwt_key_make_it_64_characters_random
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=super_secret_jwt_refresh_key_make_it_long
JWT_REFRESH_EXPIRES_IN=30d

# CORS Allowed Origins (Comma-separated)
CLIENT_URL=http://localhost:3000,https://resell-hub-frontend.vercel.app

# Cloudinary Storage
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Stripe Payments
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
```

---

## 🛠️ Local Installation & Run

```bash
# 1. Install dependencies
npm install

# 2. Seed initial data (optional)
npm run seed

# 3. Start development server
npm run dev

# 4. Production start
npm start
```

---

## 🔒 Security Measures

1. **Helmet HTTP Headers**: Enforces strict security policies.
2. **CORS Whitelist**: Origin checking with support for production Vercel domains.
3. **Rate Limiting**: `express-rate-limit` prevents brute force and DDoS.
4. **Input Sanitization**: Mongoose validators and parameter checkers.
5. **Cookie Security**: `HttpOnly`, `SameSite=lax/none`, and `Secure` cookies.
