const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const pool = require('../db');
const { authCustomer } = require('../middleware/auth');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });
  try {
    const exist = await pool.query('SELECT id FROM customers WHERE email=$1', [email]);
    if (exist.rows.length > 0) return res.status(409).json({ error: 'Email already registered' });
    
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpToken = jwt.sign({ email, otp }, process.env.JWT_SECRET, { expiresIn: '15m' });
    
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Your OTP for Sowgandhika Flowers',
      html: `<p>Your email verification OTP is: <strong>${otp}</strong></p><p>It is valid for 15 minutes.</p>`
    });

    res.status(200).json({ message: 'OTP sent to email. Please verify to create your account.', otpToken });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/verify-otp
router.post('/verify-otp', async (req, res) => {
  const { email, otp, otpToken } = req.body;
  if (!email || !otp || !otpToken) return res.status(400).json({ error: 'Missing required fields' });
  
  try {
    const decoded = jwt.verify(otpToken, process.env.JWT_SECRET);
    if (decoded.email !== email || decoded.otp !== otp) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }
    // Return a short-lived setup token; account created after profile details submitted
    const setupToken = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '30m' });
    res.status(200).json({ message: 'Email verified! Please complete your profile.', setupToken });
  } catch (err) {
    if (err.name === 'TokenExpiredError') return res.status(400).json({ error: 'OTP expired' });
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/complete-profile
router.post('/complete-profile', async (req, res) => {
  const { setupToken, name, password, phone, address } = req.body;
  if (!setupToken || !name || !password) return res.status(400).json({ error: 'Name, password, and setup token required' });
  try {
    const decoded = jwt.verify(setupToken, process.env.JWT_SECRET);
    const exist = await pool.query('SELECT id FROM customers WHERE email=$1', [decoded.email]);
    if (exist.rows.length > 0) return res.status(409).json({ error: 'Email already registered' });
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO customers (name,email,password,phone,address,is_verified) VALUES ($1,$2,$3,$4,$5,true) RETURNING id,name,email,phone,address',
      [name, decoded.email, hash, phone || null, address || null]
    );
    const token = jwt.sign({ id: result.rows[0].id, email: decoded.email, role: 'customer' }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ message: 'Account created successfully.', token, user: result.rows[0], isAdmin: false });
  } catch (err) {
    if (err.name === 'TokenExpiredError') return res.status(400).json({ error: 'Setup session expired. Please sign up again.' });
    if (err.code === '23505') return res.status(409).json({ error: 'Email already registered' });
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/signin
router.post('/signin', async (req, res) => {
  const { email, password } = req.body;
  try {
    // Check admin first
    const adminRes = await pool.query('SELECT * FROM admins WHERE email=$1', [email]);
    if (adminRes.rows.length > 0) {
      const valid = await bcrypt.compare(password, adminRes.rows[0].password);
      if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
      const token = jwt.sign({ id: adminRes.rows[0].id, email, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1d' });
      return res.json({ token, user: { id: adminRes.rows[0].id, email }, isAdmin: true });
    }
    // Check customer
    const custRes = await pool.query('SELECT * FROM customers WHERE email=$1', [email]);
    if (custRes.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
    
    if (!custRes.rows[0].is_verified) {
      return res.status(403).json({ error: 'Please verify your email before logging in.' });
    }

    const valid = await bcrypt.compare(password, custRes.rows[0].password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: custRes.rows[0].id, email, role: 'customer' }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: custRes.rows[0].id, name: custRes.rows[0].name, email }, isAdmin: false });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/auth/profile
router.get('/profile', authCustomer, async (req, res) => {
  try {
    const r = await pool.query('SELECT id,name,email,phone,address,created_at FROM customers WHERE id=$1', [req.customer.id]);
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/auth/profile
router.put('/profile', authCustomer, async (req, res) => {
  const { name, phone, address } = req.body;
  try {
    const r = await pool.query(
      'UPDATE customers SET name=$1,phone=$2,address=$3 WHERE id=$4 RETURNING id,name,email,phone,address',
      [name, phone, address, req.customer.id]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });
  try {
    const result = await pool.query('SELECT id, email FROM customers WHERE email=$1', [email]);
    if (result.rows.length === 0) {
      return res.json({ message: 'If that email is registered, a password reset link has been sent.' });
    }
    
    const resetToken = jwt.sign({ id: result.rows[0].id, email }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Password Reset for Sowgandhika Flowers',
      html: `<p>Click the link below to reset your password. The link expires in 1 hour.</p><p><a href="${resetLink}">Reset Password</a></p>`
    });

    res.json({ message: 'If that email is registered, a password reset link has been sent.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) return res.status(400).json({ error: 'Token and new password required' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE customers SET password = $1 WHERE id = $2', [hash, decoded.id]);
    res.json({ message: 'Password reset successful. You can now login.' });
  } catch (err) {
    res.status(400).json({ error: 'Invalid or expired token' });
  }
});

module.exports = router;
