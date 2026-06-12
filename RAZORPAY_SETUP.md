# 💳 Razorpay Payment Setup Guide

## What is Razorpay?
Razorpay is India's leading payment gateway that allows you to accept online payments via Credit/Debit Cards, Net Banking, UPI, and Wallets.

---

## 🚀 Setup Steps

### 1. Create Razorpay Account
1. Go to https://dashboard.razorpay.com/signup
2. Sign up with your business email
3. Complete KYC (for live mode)

### 2. Get Test API Keys
1. Login to Razorpay Dashboard
2. Go to **Settings** → **API Keys**
3. Click **Generate Test Key**
4. Copy:
   - **Key ID** (starts with `rzp_test_`)
   - **Key Secret** (keep this secret!)

### 3. Update .env File
Open `/flowersbe/.env` and update:

```env
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 4. Restart Backend
```bash
cd flowersbe
npm start
```

---

## 🧪 Testing with Test Mode

### Test Cards (Always Successful)
```
Card Number: 4111 1111 1111 1111
CVV: Any 3 digits
Expiry: Any future date
Name: Any name
```

### Test UPI (Always Successful)
```
UPI ID: success@razorpay
```

### Test Cards (Always Failed)
```
Card Number: 4000 0000 0000 0002
```

---

## 💰 Payment Flow

### For Regular Orders:
1. Customer adds items to cart
2. Goes to checkout
3. Clicks "Pay with Razorpay"
4. Razorpay payment popup opens
5. Customer completes payment
6. Order status updated to "Confirmed"

### For Subscriptions:
1. Customer selects product and schedule
2. Sees total price calculation
3. Clicks "Pay with Razorpay"
4. Razorpay payment popup opens
5. Customer completes payment
6. Subscription activated with start/end dates

---

## 📊 Payment Status Flow

```
Payment Initiated → Processing → Success/Failed
                                    ↓
                              Order/Subscription Created
```

---

## 🔒 Security Features

1. **Signature Verification**: Every payment is verified using HMAC SHA256
2. **Secure Callback**: Payment details verified on server before order confirmation
3. **Test Mode**: Use test keys during development (no real money)
4. **HTTPS Only**: Always use HTTPS in production

---

## 🎯 Features Implemented

### ✅ Subscriptions Payment
- Monthly subscription payment
- Weekly subscription payment
- Alternate days subscription payment
- Custom N-days subscription payment
- Price calculation: `price_per_day × number_of_days`

### ✅ Cart Orders Payment
- One-time product purchase
- Multiple items in cart
- Total calculation with taxes

### ✅ Login Required
- Users must login before adding to cart
- Users must login before subscribing
- Redirects to `/signin` if not logged in

---

## 🔄 Going Live (Production)

### 1. Complete KYC
- Submit business documents
- Bank account details
- GST details (if applicable)

### 2. Get Live API Keys
1. Complete activation process
2. Go to **Settings** → **API Keys**
3. Click **Generate Live Key**
4. Update `.env` with live keys:

```env
RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 3. Update Frontend
No code changes needed! Just use live keys.

---

## 💡 Testing Checklist

- [ ] Test card payment (success)
- [ ] Test card payment (failed)
- [ ] Test UPI payment
- [ ] Test subscription payment (monthly)
- [ ] Test subscription payment (weekly)
- [ ] Test subscription payment (N days)
- [ ] Test login redirect when not logged in
- [ ] Test order status update after payment
- [ ] Test subscription activation after payment

---

## 🆘 Troubleshooting

### Payment popup not opening?
- Check if Razorpay script is loaded
- Open browser console for errors
- Verify RAZORPAY_KEY_ID in `.env`

### Payment succeeds but order not created?
- Check signature verification
- Check server logs for errors
- Verify database connection

### "Invalid Key" error?
- Double-check API keys in `.env`
- Restart backend after updating `.env`
- Make sure using Test keys for test mode

---

## 📞 Support

**Razorpay Support:** https://razorpay.com/support/
**Email:** support@razorpay.com
**Phone:** 080-68270000

**Your App Support:** kancharlahemanth89@gmail.com

---

## 🎉 You're Ready!

Your payment system is now configured with:
- ✅ Razorpay test mode integration
- ✅ Subscription payments
- ✅ Cart order payments
- ✅ Login required for purchases
- ✅ Secure payment verification

**Test it now with test cards! 💳**
