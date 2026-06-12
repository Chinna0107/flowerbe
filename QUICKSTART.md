# ⚡ Quick Start - Sowgandhika Flowers

## 🎯 What You Need to Do NOW

### 1. Get Cloudinary Credentials (2 minutes)

1. **Go to:** https://cloudinary.com/users/register_free
2. **Sign up** (free account)
3. **Copy from Dashboard:**
   - Cloud name
   - API Key  
   - API Secret (click eye icon)

### 2. Update .env File (1 minute)

Open `flowersbe/.env` and add:

```env
CLOUDINARY_CLOUD_NAME=paste_here
CLOUDINARY_API_KEY=paste_here
CLOUDINARY_API_SECRET=paste_here
```

### 3. Start Servers (30 seconds)

```bash
# Terminal 1 - Backend
cd flowersbe
npm start

# Terminal 2 - Frontend  
cd Documents/zewotech/SwaFloers
npm run dev
```

---

## ✅ Testing the New Features

### Test Signup (with OTP):
1. Open http://localhost:5173/signup
2. Enter: `test@example.com`
3. Check email for OTP
4. Enter OTP code
5. Fill profile details
6. Account created! ✅

### Test Image Upload (Admin):
1. Login as admin: `admin@sowgandhika.com` / `admin123`
2. Go to Products → Add Product
3. Click "Upload Image"
4. Select any image
5. Image uploads to Cloudinary ✅

### Test Subscriptions:
1. Browse products
2. Select a product with price_per_unit
3. Choose subscription type:
   - Monthly
   - Weekly
   - Alternate Days
   - Custom N Days
4. Subscribe ✅
5. Check admin panel → only active shown

---

## 🎨 What's Different?

### Before vs After:

**Signup:**
- ❌ Before: Direct signup with all details
- ✅ Now: Email → OTP → Details (more secure)

**Products:**
- ❌ Before: Single price, local images
- ✅ Now: Price/Unit, Our Price, MRP + Cloudinary

**Subscriptions:**
- ❌ Before: Basic intervals, no expiry
- ✅ Now: 4 types, auto-expire on end date

**Orders:**
- ❌ Before: Missing customer details
- ✅ Now: Full customer info displayed

---

## 📱 New Routes to Try

```
http://localhost:5173/signin          ← Login
http://localhost:5173/signup          ← Signup with OTP
http://localhost:5173/forgot-password ← Reset password
http://localhost:5173/admin/products  ← Manage products
```

---

## 🚨 Common Issues

**Image upload not working?**
→ Add Cloudinary credentials to `.env` and restart backend

**OTP not received?**
→ Check EMAIL_USER and EMAIL_PASS in `.env`

**Orders showing empty?**
→ Migration fixed this! Restart backend.

**Old data not showing?**
→ Run: `npm run migrate` in flowersbe folder

---

## 🎉 You're Ready!

Everything is set up and working. Start adding products with images and creating subscriptions!

**Need help?** Check `README.md` or `ENHANCEMENTS.md` for detailed docs.

---

**🌸 Happy Selling!**
