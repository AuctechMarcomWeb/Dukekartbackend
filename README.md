# DukeKart Backend API

REST API server for the DukeKart grocery/e-commerce platform. Built with Node.js, Express, and MongoDB.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js (ESM) |
| Framework | Express v5 |
| Database | MongoDB + Mongoose |
| Auth | JWT + bcrypt |
| File Upload | Multer + Cloudinary |
| OTP Delivery | WhatsApp (via sendOTP util) |
| Payments | Razorpay |
| Scheduler | node-cron |
| Dev Server | nodemon |

---

## Project Structure

```
Dukekartbackend/
├── config/
│   ├── db.js               # MongoDB connection
│   ├── cloudinary.js       # Cloudinary setup
│   └── multerConfig.js     # Multer upload config
├── controllers/
│   ├── authController.js
│   ├── categoryController.js
│   ├── couponController.js
│   ├── dashboardController.js
│   ├── deliverySlotController.js
│   ├── homeSliderController.js
│   ├── productController.js
│   └── uploadController.js
├── middlewares/
│   ├── authTypeMiddleware.js   # JWT verification & role guard
│   ├── errorHandler.js
│   ├── errorMiddleware.js
│   └── rateLimiter.js
├── models/
│   ├── User.modal.js
│   ├── Category.modal.js
│   ├── Product.modal.js
│   ├── Coupon.modal.js
│   ├── DeliverySlot.modal.js
│   └── HomeSlider.modal.js
├── router/
│   ├── authRoutes.js
│   ├── categoryRoutes.js
│   ├── couponRoutes.js
│   ├── dashboardRoutes.js
│   ├── deliverySlotRoutes.js
│   ├── homeSliderRoutes.js
│   ├── productRoutes.js
│   └── uploadRoutes.js
├── utils/
│   ├── apiError.js
│   ├── apiResponse.js
│   ├── asynchandler.js
│   ├── generateOTP.js
│   ├── helper.js
│   ├── sendEmail.js
│   └── sendOTP.js
├── .env
├── index.js                # Entry point
└── package.json
```

---

## Getting Started

### Prerequisites

- Node.js v18+
- MongoDB Atlas URI or local MongoDB instance
- Cloudinary account
- WhatsApp OTP provider credentials
- Razorpay key/secret (for payment features)

### Installation

```bash
cd Dukekartbackend
npm install
```

### Environment Variables

Create a `.env` file in the `Dukekartbackend/` directory:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
CLIENT_URL=http://localhost:3000

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Razorpay
RAZORPAY_KEY_ID=your_key_id
RAZORPAY_KEY_SECRET=your_key_secret

# WhatsApp OTP
WHATSAPP_API_URL=your_whatsapp_api_url
WHATSAPP_API_KEY=your_whatsapp_api_key
```

### Running the Server

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

Server starts on `http://localhost:5000` by default.

---

## API Reference

All endpoints are prefixed with `/api`.

### Auth — `/api/auth`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/registerOrLogin` | Public | Send OTP to phone number (creates user if new) |
| POST | `/verifyOtp` | Public | Verify OTP and receive JWT token |
| POST | `/resendOtp` | Public | Resend OTP to phone |
| GET | `/profile` | JWT | Get logged-in user's profile |
| POST | `/loginWithPassword` | Public | Login with phone + password |
| POST | `/createPassword` | JWT | Set password for the first time |
| POST | `/updatePassword` | JWT | Change existing password |
| POST | `/resetPassword` | JWT | Reset password (admin use) |
| PATCH | `/update/:id` | Public | Update user profile fields |
| DELETE | `/delete/:id` | JWT | Delete user account |
| GET | `/getAllUsers` | Public | List all users (paginated, searchable) |
| PUT | `/updateRole/:userId` | Public | Change user role (User / Admin) |
| POST | `/createUser` | Public | Create user directly (admin) |

**Auth flow (User / Mobile):**
1. Call `/registerOrLogin` with `{ phone }` → OTP is sent via WhatsApp
2. Call `/verifyOtp` with `{ phone, otp }` → receive `authToken`
3. Pass `Authorization: Bearer <token>` on protected routes

**Auth flow (Admin):**
1. Call `/loginWithPassword` with `{ phone, password }` → receive `authToken`

---

### Categories — `/api/category`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/` | Public | List all categories |
| GET | `/:id` | Public | Get single category |
| POST | `/create` | Admin | Create a new category |
| PATCH | `/update/:id` | Admin | Update category |
| DELETE | `/delete/:id` | Admin | Delete category |

**Category fields:** `name`, `description`, `image`, `isActive`

---

### Products — `/api/product`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/` | Public | List products (paginated, filterable) |
| GET | `/:id` | Public | Get single product |
| POST | `/create` | Admin | Create product |
| PATCH | `/update/:id` | Admin | Update product |
| DELETE | `/delete/:id` | Admin | Delete product |

**Key product fields:**
- `name`, `category` (ref), `description`, `price`, `originalPrice`
- `weight`, `weightVariants[]` — multiple weight/price options
- `image`, `images[]` — primary + gallery images
- `nutrition` — calories, protein, carbs, fat, fiber
- `stock`, `status` — auto-derived (Active / Low Stock / Out of Stock)
- `allowedSlots[]` — delivery slot references
- `isHalal`, `isFresh`, `inStock`, `tags[]`

---

### Coupons — `/api/coupon`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/` | Public | List all coupons |
| GET | `/:id` | Public | Get single coupon |
| POST | `/create` | Admin | Create coupon |
| PATCH | `/update/:id` | Admin | Update coupon |
| DELETE | `/delete/:id` | Admin | Delete coupon |

**Coupon fields:** `code`, `type` (flat/percent), `value`, `minOrder`, `maxDiscount`, `usageLimit`, `expiry`, `active`

---

### Delivery Slots — `/api/deliverySlot`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/` | Public | List all slots |
| GET | `/:id` | Public | Get single slot |
| POST | `/create` | Admin | Create slot |
| PATCH | `/update/:id` | Admin | Update slot |
| DELETE | `/delete/:id` | Admin | Delete slot |

**Slot fields:** `label`, `time`, `maxOrders`, `deliveryCharge`, `minOrderAmount`, `availableDays[]`, `color`, `isActive`

---

### Home Slider — `/api/homeSlider`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/` | Public | List all slider banners |
| POST | `/create` | Admin | Add banner |
| PATCH | `/update/:id` | Admin | Update banner |
| DELETE | `/delete/:id` | Admin | Delete banner |

---

### Dashboard — `/api/dashboard`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/stats` | Admin | Overview stats (orders, revenue, users, etc.) |

---

### File Upload — `/api/upload`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/` | JWT | Upload image to Cloudinary, returns URL |

---

## Data Models

### User

```js
{
  phone: String,          // required, 10 digits
  name: String,
  email: String,
  gender: String,
  dob: Date,
  address: String,
  occupation: String,
  profilepic: String,
  role: "User" | "Admin", // default: "User"
  isNew: Boolean,         // true until profile completed
  activeStatus: Boolean,
  otp: String,
  otpExpiration: Date,
  password: String,       // optional (only for admin/password login)
  fcmToken: String,
  authToken: String
}
```

### Product

```js
{
  name, category, description,
  price, originalPrice,
  weight, weightVariants: [{ label, price, original }],
  image, images: [String],
  nutrition: { calories, protein, carbs, fat, fiber },
  rating, reviewCount,
  stock, status,          // status auto-derives from stock
  allowedSlots: [ObjectId],
  deliveryTime: String,
  isHalal, isFresh, inStock, isActive,
  tags: [String]
}
```

### Coupon

```js
{
  code: String,           // unique, uppercase
  type: "flat" | "percent",
  value: Number,
  minOrder: Number,
  maxDiscount: Number,
  usageLimit: Number,
  usedCount: Number,
  desc: String,
  expiry: Date,
  active: Boolean
}
```

---

## API Response Format

All responses follow a consistent structure:

```json
{
  "statusCode": 200,
  "data": { ... },
  "message": "Success message"
}
```

Error responses:

```json
{
  "statusCode": 400,
  "data": null,
  "message": "Error description"
}
```

---

## Authentication

Protected routes require a Bearer token in the `Authorization` header:

```
Authorization: Bearer <jwt_token>
```

The token is returned from `/api/auth/verifyOtp` (OTP login) or `/api/auth/loginWithPassword`.

---

## Rate Limiting

API routes are protected with `express-rate-limit` to prevent abuse. Default limits are configured in `middlewares/rateLimiter.js`.

---

## CORS

Allowed origins in development:

- `http://localhost:3000` (admin panel)
- `http://localhost:3001`
- `http://localhost:5173` / `5174` (Vite)
- Local network IPs (`192.168.x.x`)

Set `CLIENT_URL` in `.env` to add production origins.
