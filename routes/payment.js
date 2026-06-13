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
// POST /api/payment/create-order
router.post('/create-order', authCustomer, async (req, res) => {
  const { cart, address, total, coupon_code } = req.body;
  try {
    let finalTotal = total;
    let discount = 0;
    
    if (coupon_code) {
      // 1. Verify customer has active or paused subscription
      const subRes = await pool.query(
        "SELECT id FROM subscriptions WHERE customer_id=$1 AND status IN ('Active', 'Paused') LIMIT 1",
        [req.customer.id]
      );
      if (subRes.rows.length > 0) {
        // 2. Verify coupon code
        const couponRes = await pool.query(
          "SELECT * FROM coupons WHERE code=$1 AND active=TRUE LIMIT 1",
          [coupon_code.toUpperCase()]
        );
        if (couponRes.rows.length > 0) {
          const coupon = couponRes.rows[0];
          // 3. Find eligible products
          const productIds = cart.map(item => item.id);
          const prodRes = await pool.query(
            "SELECT id, eligible_for_coupon, our_price FROM products WHERE id = ANY($1)",
            [productIds]
          );
          const dbProducts = {};
          prodRes.rows.forEach(p => { dbProducts[p.id] = p; });

          let totalCartSubtotal = 0;
          let eligibleSubtotal = 0;
          cart.forEach(item => {
            const dbProd = dbProducts[item.id];
            if (dbProd) {
              const itemPrice = parseFloat(dbProd.our_price);
              const itemQty = parseInt(item.quantity) || 1;
              const itemTotal = itemPrice * itemQty;
              totalCartSubtotal += itemTotal;
              if (dbProd.eligible_for_coupon) eligibleSubtotal += itemTotal;
            }
          });

          // Verify min order value and that there are eligible products
          if (totalCartSubtotal >= parseFloat(coupon.min_order_value) && eligibleSubtotal > 0) {
            const value = parseFloat(coupon.discount_value);
            if (coupon.discount_type === 'percentage') {
              discount = eligibleSubtotal * (value / 100);
              if (coupon.max_discount) {
                discount = Math.min(discount, parseFloat(coupon.max_discount));
              }
            } else {
              discount = Math.min(value, eligibleSubtotal);
            }
            discount = Math.round(discount * 100) / 100;
            finalTotal = Math.max(0, total - discount); // subtract discount from the frontend total
          }
        }
      }
    }

    const orderId = `SW${Date.now()}`;
    const rzpOrder = await razorpay.orders.create({
      amount: Math.round(finalTotal * 100),
      currency: 'INR',
      receipt: orderId,
    });

    await pool.query(
      `INSERT INTO orders (id,customer_id,customer_name,customer_email,customer_phone,items,subtotal,total,address,status,razorpay_order_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'Processing',$10)`,
      [orderId, req.customer.id, address.name, req.customer.email, address.phone,
       JSON.stringify(cart), total, finalTotal, JSON.stringify(address), rzpOrder.id]
    );

    res.json({ order_id: rzpOrder.id, receipt: orderId, key: process.env.RAZORPAY_KEY_ID, amount: Math.round(finalTotal * 100) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/payment/create-subscription-order — for subscriptions
router.post('/create-subscription-order', authCustomer, async (req, res) => {
  const { product_name, schedule, n_days, price_per_day, total, address } = req.body;
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
      subscription_data: { product_name, schedule, n_days, price_per_day, address }
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

    const { product_name, schedule, n_days, price_per_day, address } = subscription_data;
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
      `INSERT INTO subscriptions (id,customer_id,customer_name,customer_email,product_name,schedule,interval_days,status,next_delivery,start_date,end_date,price_per_day,n_days,address)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'Active',$8,$9,$10,$11,$12,$13) RETURNING *`,
      [receipt, req.customer.id, name, email, product_name, scheduleLabel, interval_days, 
       next_delivery.toISOString().split('T')[0], 
       start_date.toISOString().split('T')[0],
       end_date.toISOString().split('T')[0],
       price_per_day || null,
       schedule === 'n_days' ? n_days : null,
       address || null]
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
  const { cart, address, total, coupon_code } = req.body;
  try {
    let finalTotal = total;
    let discount = 0;
    
    if (coupon_code) {
      const subRes = await pool.query(
        "SELECT id FROM subscriptions WHERE customer_id=$1 AND status IN ('Active', 'Paused') LIMIT 1",
        [req.customer.id]
      );
      if (subRes.rows.length > 0) {
        const couponRes = await pool.query(
          "SELECT * FROM coupons WHERE code=$1 AND active=TRUE LIMIT 1",
          [coupon_code.toUpperCase()]
        );
        if (couponRes.rows.length > 0) {
          const coupon = couponRes.rows[0];
          const productIds = cart.map(item => item.id);
          const prodRes = await pool.query(
            "SELECT id, eligible_for_coupon, our_price FROM products WHERE id = ANY($1)",
            [productIds]
          );
          const dbProducts = {};
          prodRes.rows.forEach(p => { dbProducts[p.id] = p; });

          let totalCartSubtotal = 0;
          let eligibleSubtotal = 0;
          cart.forEach(item => {
            const dbProd = dbProducts[item.id];
            if (dbProd) {
              const itemPrice = parseFloat(dbProd.our_price);
              const itemQty = parseInt(item.quantity) || 1;
              const itemTotal = itemPrice * itemQty;
              totalCartSubtotal += itemTotal;
              if (dbProd.eligible_for_coupon) eligibleSubtotal += itemTotal;
            }
          });

          if (totalCartSubtotal >= parseFloat(coupon.min_order_value) && eligibleSubtotal > 0) {
            const value = parseFloat(coupon.discount_value);
            if (coupon.discount_type === 'percentage') {
              discount = eligibleSubtotal * (value / 100);
              if (coupon.max_discount) {
                discount = Math.min(discount, parseFloat(coupon.max_discount));
              }
            } else {
              discount = Math.min(value, eligibleSubtotal);
            }
            discount = Math.round(discount * 100) / 100;
            finalTotal = Math.max(0, total - discount);
          }
        }
      }
    }

    const orderId = `SW${Date.now()}`;
    await pool.query(
      `INSERT INTO orders (id,customer_id,customer_name,customer_email,customer_phone,items,subtotal,total,address,status,payment_method)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'Processing','cod')`,
      [orderId, req.customer.id, address.name, req.customer.email, address.phone,
       JSON.stringify(cart), total, finalTotal, JSON.stringify(address)]
    );
    res.json({ success: true, order_id: orderId });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
