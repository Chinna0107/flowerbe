# 📸 Cloudinary Setup Guide

## What is Cloudinary?
Cloudinary is a cloud-based image and video management service. We use it to store product images.

## Why Cloudinary?
- ✅ Free tier (25 GB storage, 25 GB bandwidth)
- ✅ Fast CDN delivery
- ✅ Automatic image optimization
- ✅ No server storage needed

---

## Setup Steps (5 minutes)

### 1. Create Free Account
1. Go to https://cloudinary.com/users/register_free
2. Sign up with email or Google
3. Verify your email

### 2. Get Your Credentials
1. After login, you'll see the Dashboard
2. Copy these 3 values:

```
Cloud name:  [Copy from dashboard]
API Key:     [Copy from dashboard]
API Secret:  [Click "eye" icon to reveal, then copy]
```

### 3. Update .env File
Open `/flowersbe/.env` and update:

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name_here
CLOUDINARY_API_KEY=your_api_key_here
CLOUDINARY_API_SECRET=your_api_secret_here
```

### 4. Test Upload
1. Start your backend: `npm start`
2. Login to admin panel
3. Go to Products → Add Product
4. Click "Upload Image"
5. Select an image
6. You should see image preview after upload

---

## Troubleshooting

### Upload Fails?
- Check .env credentials are correct
- Restart backend after updating .env
- Check internet connection

### Image Not Showing?
- Check browser console for errors
- Verify image URL in database
- Try opening image URL directly in browser

---

## Free Tier Limits
- 25 GB storage
- 25 GB monthly bandwidth
- 25,000 transformations/month
- More than enough for small to medium businesses!

---

## Alternative: Use Existing Images
If you don't want to set up Cloudinary immediately:
- Use direct image URLs (from Unsplash, etc.)
- Paste URL directly in "Image URL" field
- Skip the upload button

---

**Need Help?** Contact: kancharlahemanth89@gmail.com
