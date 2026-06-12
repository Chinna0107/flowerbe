const router = require('express').Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const pool = require('../db');
const { authCustomer } = require('../middleware/auth');
require('dotenv').config();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// POST /api/payment/create-order
router.post('/create-order', authCustomer, async (req, res) => {
  const { cart, address, total } = req.body;
  try {
    const orderId = `SW${Date.now()}`;
    const rzpOrder = await razorpay.orders.create({
      amount: Math.round(total * 100),
      currency: 'INR',
      receipt: orderId,
    });

    await pool.query(
      `INSERT INTO orders (id,customer_id,customer_name,customer_email,customer_phone,items,subtotal,total,address,status,razorpay_order_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'Processing',$10)`,
      [orderId, req.customer.id, address.name, req.customer.email, address.phone,
       JSON.stringify(cart), total, total, JSON.stringify(address), rzpOrder.id]
    );

    res.json({ order_id: rzpOrder.id, receipt: orderId, key: process.env.RAZORPAY_KEY_ID, amount: Math.round(total * 100) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/payment/create-subscription-order — for subscriptions
router.post('/create-subscription-order', authCustomer, async (req, res) => {
  const { product_name, schedule, n_days, price_per_day, total } = req.body;
  try {
    const subId = `SUB-${Date.now()}`;
    const rzpOrder = await razorpay.orders.create({
      amount: Math.round(total * 100),
      currency: 'INR',
      receipt: subId,
    });

    res.json({ 
      order_id: rzpOrder.id, 
      receipt: subId, 
      key: process.env.RAZORPAY_KEY_ID, 
      amount: Math.round(total * 100),
      subscription_data: { product_name, schedule, n_days, price_per_day }
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/payment/verify-subscription — verify and create subscription
router.post('/verify-subscription', authCustomer, async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, receipt, subscription_data } = req.body;
  try {
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expected = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(body).digest('hex');
    if (expected !== razorpay_signature) {
      return res.status(400).json({ error: 'Signature mismatch' });
    }

    // Payment verified, now create subscription
    const custRes = await pool.query('SELECT name, email FROM customers WHERE id=$1', [req.customer.id]);
    const { name, email } = custRes.rows[0];

    const { product_name, schedule, n_days, price_per_day } = subscription_data;
    let interval_days, scheduleLabel, end_date;
    const start_date = new Date();

    if (schedule === 'monthly') {
      interval_days = 30;
      scheduleLabel = 'Monthly';
      end_date = new Date(start_date);
      end_date.setDate(end_date.getDate() + 30);
    } else if (schedule === 'weekly') {
      interval_days = 7;
      scheduleLabel = 'Weekly';
      end_date = new Date(start_date);
      end_date.setDate(end_date.getDate() + 7);
    } else if (schedule === 'alternate') {
      interval_days = 2;
      scheduleLabel = 'Alternate Days (30 days)';
      end_date = new Date(start_date);
      end_date.setDate(end_date.getDate() + 30);
    } else if (schedule === 'n_days') {
      interval_days = 1;
      scheduleLabel = `${n_days} Days`;
      end_date = new Date(start_date);
      end_date.setDate(end_date.getDate() + parseInt(n_days));
    }

    const next_delivery = new Date(start_date);
    next_delivery.setDate(next_delivery.getDate() + interval_days);

    const r = await pool.query(
      `INSERT INTO subscriptions (id,customer_id,customer_name,customer_email,product_name,schedule,interval_days,status,next_delivery,start_date,end_date,price_per_day,n_days)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'Active',$8,$9,$10,$11,$12) RETURNING *`,
      [receipt, req.customer.id, name, email, product_name, scheduleLabel, interval_days, 
       next_delivery.toISOString().split('T')[0], 
       start_date.toISOString().split('T')[0],
       end_date.toISOString().split('T')[0],
       price_per_day || null,
       schedule === 'n_days' ? n_days : null]
    );

    res.json({ success: true, subscription: r.rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/payment/verify
router.post('/verify', authCustomer, async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, receipt } = req.body;
  try {
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expected = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(body).digest('hex');
    if (expected !== razorpay_signature) {
      await pool.query("UPDATE orders SET status='Failed' WHERE id=$1", [receipt]);
      return res.status(400).json({ error: 'Signature mismatch' });
    }
    const r = await pool.query(
      "UPDATE orders SET status='Confirmed', razorpay_payment_id=$1 WHERE id=$2 RETURNING *",
      [razorpay_payment_id, receipt]
    );
    res.json({ success: true, order: r.rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/payment/cod — Cash on Delivery
router.post('/cod', authCustomer, async (req, res) => {
  const { cart, address, total } = req.body;
  try {
    const orderId = `SW${Date.now()}`;
    await pool.query(
      `INSERT INTO orders (id,customer_id,customer_name,customer_email,customer_phone,items,subtotal,total,address,status,payment_method)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'Processing','cod')`,
      [orderId, req.customer.id, address.name, req.customer.email, address.phone,
       JSON.stringify(cart), total, total, JSON.stringify(address)]
    );
    res.json({ success: true, order_id: orderId });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
