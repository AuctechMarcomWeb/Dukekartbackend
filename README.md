# CART Backend API

Node.js + Express + MongoDB backend for the CART Interior Design platform. Handles authentication, content management (blogs, gallery, portfolio, sliders, testimonials), contact & booking forms, image uploads, and an admin dashboard.

---

## Tech Stack

- **Runtime**: Node.js (ES Modules)
- **Framework**: Express.js
- **Database**: MongoDB (Mongoose)
- **Auth**: JWT + OTP via WhatsApp
- **Image Upload**: Cloudinary (via Multer memory storage)
- **Password Hashing**: bcrypt
- **Rate Limiting**: express-rate-limit

---

## Getting Started

```bash
npm install
npm run dev   # or node index.js
```

Create a `.env` file with:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
CLIENT_URL=http://localhost:3000
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

---

## Authentication Flow

```
User enters phone
    │
    ▼
POST /api/auth/registerOrLogin   ← sends OTP via WhatsApp
    │
    ▼
POST /api/auth/verifyOtp         ← returns JWT authToken
    │
    ▼
Use authToken in Authorization: Bearer <token>
```

Password-based login is also supported for admin users created via `createUser`.

---

## API Reference

Base URL: `http://localhost:5000`

All protected routes require: `Authorization: Bearer <token>`

---

### 🔐 Auth — `/api/auth`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/registerOrLogin` | Public | Send OTP to phone number |
| POST | `/verifyOtp` | Public | Verify OTP → returns JWT token |
| POST | `/resendOtp` | Public | Resend OTP to phone |
| POST | `/loginWithPassword` | Public | Login with phone + password |
| GET | `/profile` | Protected | Get logged-in user profile |
| POST | `/createPassword` | Protected | Set password for first time |
| POST | `/updatePassword` | Protected | Change existing password |
| POST | `/resetPassword` | Protected | Force-reset password |
| POST | `/createUser` | Public | Admin creates a user directly |
| GET | `/getAllUsers` | Public | List all users (pagination + search) |
| PATCH | `/update/:id` | Public | Update user fields by ID |
| PUT | `/updateRole/:userId` | Public | Change user role (User / Admin) |
| DELETE | `/delete/:id` | Protected | Delete user by ID |

**Query params for `getAllUsers`:** `page`, `limit`, `search`, `sortBy` (recent/oldest), `isPagination`

---

### 📤 Upload — `/api/upload`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/uploadImage` | Public | Upload image to Cloudinary |

**Body:** `multipart/form-data` with field name `file`  
**Response:** `{ imageUrl: "https://res.cloudinary.com/..." }`

---

### 📊 Dashboard — `/api/dashboard`

---

## Standard Response Format

All endpoints return a consistent JSON envelope:

```json
{
  "statusCode": 200,
  "data": { ... },
  "message": "Operation successful"
}
```

Error responses follow the same shape with a non-2xx `statusCode` and `data: null`.

---

## Postman Collection

Import `ARV-Backend.postman_collection.json` from the repo root.

Set the `baseUrl` collection variable to your server URL (default: `http://localhost:5000`).  
After login, copy the `authToken` from the response and set it as the `authToken` collection variable.
