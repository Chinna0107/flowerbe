# 🌸 Sowgandhika Flowers - Complete Setup Guide

## 🎉 What's New?

### ✅ Authentication System
- Separate Signin and Signup pages
- 3-step OTP verification (Email → OTP → Profile)
- Secure password creation after email verification
- Forgot password functionality

### ✅ Admin Product Management
- **Cloudinary Integration** - Cloud image storage
- **New Pricing Structure:**
  - Price Per Unit (₹/day for subscriptions)
  - Our Price (your selling price)
  - MRP (strikethrough original price)
- No stock management needed
- Enhanced UI with image preview

### ✅ Smart Subscriptions
- **Monthly** - Delivery every 30 days
- **Weekly** - Delivery every 7 days  
- **Alternate Days** - Every 2 days for 30 days
- **N Days** - Custom duration (user enters number of days)
- Auto-expiry based on end date
- Only active subscriptions shown

### ✅ Fixed Admin Orders
- Shows customer details properly
- Better data display
- Status management

---

## 🚀 Quick Start

### For New Installation:

```bash
# 1. Backend Setup
cd flowersbe
npm install
npm run setup        # Creates tables and seeds data
npm start           # Starts server on port 5000

# 2. Frontend Setup  
cd ../Documents/zewotech/SwaFloers
npm install
npm run dev         # Starts on port 5173
```

### For Existing Installation:

```bash
# 1. Backend Update
cd flowersbe
npm install cloudinary multer
npm run migrate     # Updates database schema
npm start

# 2. Frontend (no changes needed)
cd ../Documents/zewotech/SwaFloers  
npm run dev
```

---

## 🔧 Environment Setup

### 1. Update `.env` file:

```env
# Database
DATABASE_URL=your_neon_postgres_url

# Server
PORT=5000
JWT_SECRET=flowersbe_jwt_secret_key

# Email (for OTP)
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_app_password

# Cloudinary (for image uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Razorpay
RAZORPAY_KEY_ID=your_razorpay_key
RAZORPAY_KEY_SECRET=your_razorpay_secret

# Admin
ADMIN_EMAIL=admin@sowgandhika.com
ADMIN_PASSWORD=admin123

# Frontend
FRONTEND_URL=http://localhost:5173
```

### 2. Get Cloudinary Credentials:

See detailed guide in `CLOUDINARY_SETUP.md`

**Quick Steps:**
1. Go to https://cloudinary.com/users/register_free
2. Sign up (free)
3. Copy Cloud Name, API Key, API Secret from dashboard
4. Paste in `.env`

---

## 📱 User Flows

### Customer Signup:
1. Go to `/signup`
2. Enter email → OTP sent
3. Enter 6-digit OTP
4. Fill profile (name, password, phone, address)
5. Account created ✅

### Admin Add Product:
1. Login as admin
2. Products → Add Product
3. Fill details:
   - Name, Category, Description
   - Price Per Unit (for subscriptions)
   - Our Price (selling price)  
   - MRP (shown with strikethrough)
4. Click "Upload Image" → Select file
5. Image uploads to Cloudinary
6. Save Product ✅

### Customer Subscribe:
1. Browse products
2. Select subscription type:
   - Monthly (₹X × 30 days)
   - Weekly (₹X × 7 days)
   - Alternate (₹X × 15 deliveries)
   - Custom N Days (₹X × N days)
3. Subscribe
4. Subscription auto-expires on end date ✅

---

## 📊 Database Schema

### Products Table:
```sql
- name VARCHAR(200)
- category VARCHAR(50)
- price_per_unit NUMERIC(10,2)  -- NEW: For subscriptions
- our_price NUMERIC(10,2)       -- NEW: Selling price
- mrp NUMERIC(10,2)             -- NEW: Original price
- tag VARCHAR(50)
- img TEXT
- description TEXT
```

### Subscriptions Table:
```sql
- id VARCHAR(30)
- customer_id INT
- customer_name VARCHAR(150)
- customer_email VARCHAR(150)
- product_name VARCHAR(200)
- schedule VARCHAR(50)
- interval_days INT
- status VARCHAR(20)
- next_delivery DATE
- start_date DATE              -- NEW
- end_date DATE                -- NEW
- price_per_day NUMERIC(10,2) -- NEW
- n_days INT                   -- NEW
```

---

## 🔄 Automation

### Auto-Deactivate Expired Subscriptions:

**Option 1: Manual Run**
```bash
npm run cron:subscriptions
```

**Option 2: System Cron (Linux/Mac)**
```bash
# Edit crontab
crontab -e

# Add this line (runs daily at 2 AM)
0 2 * * * cd /path/to/flowersbe && npm run cron:subscriptions
```

**Option 3: Node Scheduler (in index.js)**
```javascript
const cron = require('node-cron');

// Run every day at 2 AM
cron.schedule('0 2 * * *', async () => {
  const today = new Date().toISOString().split('T')[0];
  await pool.query(
    "UPDATE subscriptions SET status='Inactive' WHERE end_date < $1 AND status='Active'",
    [today]
  );
  console.log('✓ Expired subscriptions checked');
});
```

---

## 🎨 Routes

### Frontend Routes:
```
/signin          - Login page
/signup          - Signup with OTP
/forgot-password - Password reset
/products        - Browse products
/subscriptions   - Subscribe to products
/cart            - Shopping cart
/checkout        - Checkout page
/my-orders       - Customer orders
/my-subscriptions - Customer subscriptions
/admin/dashboard  - Admin dashboard
/admin/products   - Manage products
/admin/orders     - Manage orders
/admin/subscriptions - View active subscriptions
```

### API Routes:
```
POST   /api/auth/signup              - Send OTP
POST   /api/auth/verify-otp          - Verify OTP
POST   /api/auth/complete-profile    - Create account
POST   /api/auth/signin              - Login
POST   /api/auth/forgot-password     - Reset password

POST   /api/products/upload-image    - Upload to Cloudinary
GET    /api/products                 - Get all products
POST   /api/products                 - Create product
PUT    /api/products/:id             - Update product
DELETE /api/products/:id             - Delete product

GET    /api/subscriptions            - Admin: Active subs
GET    /api/subscriptions/my         - Customer: Active subs
POST   /api/subscriptions            - Create subscription
PUT    /api/subscriptions/:id/cancel - Cancel subscription

GET    /api/orders                   - Admin: All orders
GET    /api/orders/my                - Customer: My orders
PUT    /api/orders/:id/status        - Update order status
```

---

## 🐛 Troubleshooting

### Orders not showing in admin panel?
✅ Fixed! Orders now properly join with customers table.

### Image upload fails?
- Check Cloudinary credentials in `.env`
- Restart backend after updating `.env`
- Check file size (max 10MB recommended)

### OTP not received?
- Check EMAIL_USER and EMAIL_PASS in `.env`
- Use Gmail App Password (not regular password)
- Check spam folder

### Subscriptions not auto-expiring?
- Run `npm run cron:subscriptions` manually
- Or set up cron job (see Automation section)

---

## 📂 Project Structure

```
flowersbe/
├── routes/
│   ├── auth.js          - Authentication (signin, signup, OTP)
│   ├── products.js      - Products + Cloudinary upload
│   ├── orders.js        - Orders management
│   ├── subscriptions.js - Subscriptions with auto-expiry
│   ├── payment.js       - Razorpay integration
│   └── support.js       - Customer support
├── middleware/
│   └── auth.js          - JWT authentication
├── setup.js             - Database setup
├── migrate.js           - Database migration
├── cron-check-subscriptions.js - Auto-deactivate expired
├── .env                 - Environment variables
└── index.js             - Main server

SwaFloers/
├── src/
│   ├── pages/
│   │   ├── Signin.jsx            - Login page
│   │   ├── Signup.jsx            - Signup with OTP
│   │   ├── ForgotPassword.jsx    - Password reset
│   │   └── admin/
│   │       ├── AdminProducts.jsx - Product management
│   │       ├── AdminOrders.jsx   - Orders management
│   │       └── AdminSubscriptions.jsx - Active subscriptions
│   ├── store/
│   │   ├── authStore.jsx   - Authentication state
│   │   └── cartStore.jsx   - Shopping cart state
│   └── components/
│       ├── Header.jsx      - Navigation
│       └── Layout.jsx      - Page layout
```

---

## 🎯 Testing Checklist

### Authentication:
- [ ] Signup with email
- [ ] Receive OTP email
- [ ] Verify OTP
- [ ] Complete profile
- [ ] Login with credentials
- [ ] Forgot password

### Products:
- [ ] Upload image to Cloudinary
- [ ] Create product with new pricing
- [ ] Edit product
- [ ] Delete product
- [ ] View product list

### Subscriptions:
- [ ] Create monthly subscription
- [ ] Create weekly subscription
- [ ] Create alternate days subscription
- [ ] Create N-days subscription
- [ ] View in admin panel
- [ ] Auto-expire on end date

### Orders:
- [ ] Place order
- [ ] View in admin panel with customer details
- [ ] Update order status
- [ ] Customer views own orders

---

## 📞 Support

**Email:** kancharlahemanth89@gmail.com

**Issues?**
1. Check `.env` configuration
2. Run `npm run migrate` if database errors
3. Clear browser cache
4. Restart both servers

---

## 🎉 You're All Set!

Your flower shop is now enhanced with:
- ✅ Secure OTP-based authentication
- ✅ Cloud-based image storage
- ✅ Flexible subscription system
- ✅ Better admin management
- ✅ Auto-expiring subscriptions

**Happy Selling! 🌸**
