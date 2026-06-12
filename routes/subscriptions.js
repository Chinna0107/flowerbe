const router = require('express').Router();
const pool = require('../db');
const { authCustomer, authAdmin } = require('../middleware/auth');

// POST /api/subscriptions — customer subscribe
router.post('/', authCustomer, async (req, res) => {
  const { product_name, schedule, n_days, price_per_day } = req.body;
  try {
    const subId = `SUB-${Date.now()}`;
    const custRes = await pool.query('SELECT name, email FROM customers WHERE id=$1', [req.customer.id]);
    const { name, email } = custRes.rows[0];

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
    } else {
      return res.status(400).json({ error: 'Invalid schedule' });
    }

    const next_delivery = new Date(start_date);
    next_delivery.setDate(next_delivery.getDate() + interval_days);

    const r = await pool.query(
      `INSERT INTO subscriptions (id,customer_id,customer_name,customer_email,product_name,schedule,interval_days,status,next_delivery,start_date,end_date,price_per_day,n_days)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'Active',$8,$9,$10,$11,$12) RETURNING *`,
      [subId, req.customer.id, name, email, product_name, scheduleLabel, interval_days, 
       next_delivery.toISOString().split('T')[0], 
       start_date.toISOString().split('T')[0],
       end_date.toISOString().split('T')[0],
       price_per_day || null,
       schedule === 'n_days' ? n_days : null]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/subscriptions/my — customer (only active)
router.get('/my', authCustomer, async (req, res) => {
  try {
    const r = await pool.query(
      "SELECT * FROM subscriptions WHERE customer_id=$1 AND status='Active' ORDER BY created_at DESC",
      [req.customer.id]
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/subscriptions/:id/cancel — customer cancel
router.put('/:id/cancel', authCustomer, async (req, res) => {
  try {
    const r = await pool.query(
      "UPDATE subscriptions SET status='Cancelled' WHERE id=$1 AND customer_id=$2 RETURNING *",
      [req.params.id, req.customer.id]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/subscriptions — admin (only active)
router.get('/', authAdmin, async (req, res) => {
  try {
    const r = await pool.query("SELECT * FROM subscriptions WHERE status='Active' ORDER BY created_at DESC");
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Cron job to check and deactivate expired subscriptions
router.get('/check-expired', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    await pool.query(
      "UPDATE subscriptions SET status='Inactive' WHERE end_date < $1 AND status='Active'",
      [today]
    );
    res.json({ message: 'Expired subscriptions updated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
