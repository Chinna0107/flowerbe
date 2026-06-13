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

// GET /api/subscriptions/my — customer (all statuses)
router.get('/my', authCustomer, async (req, res) => {
  try {
    const r = await pool.query(
      "SELECT * FROM subscriptions WHERE customer_id=$1 ORDER BY created_at DESC",
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

// PUT /api/subscriptions/:id/pause — customer pause
router.put('/:id/pause', authCustomer, async (req, res) => {
  const { id } = req.params;
  try {
    const subRes = await pool.query(
      "SELECT * FROM subscriptions WHERE id=$1 AND customer_id=$2",
      [id, req.customer.id]
    );
    if (subRes.rows.length === 0) {
      return res.status(404).json({ error: 'Subscription not found' });
    }
    const sub = subRes.rows[0];
    if (sub.status !== 'Active') {
      return res.status(400).json({ error: 'Only active subscriptions can be paused' });
    }

    const today = new Date().toISOString().split('T')[0];
    const r = await pool.query(
      "UPDATE subscriptions SET status='Paused', paused_at=$1 WHERE id=$2 RETURNING *",
      [today, id]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/subscriptions/:id/resume — customer resume
router.put('/:id/resume', authCustomer, async (req, res) => {
  const { id } = req.params;
  try {
    const subRes = await pool.query(
      "SELECT * FROM subscriptions WHERE id=$1 AND customer_id=$2",
      [id, req.customer.id]
    );
    if (subRes.rows.length === 0) {
      return res.status(404).json({ error: 'Subscription not found' });
    }
    const sub = subRes.rows[0];
    if (sub.status !== 'Paused') {
      return res.status(400).json({ error: 'Only paused subscriptions can be resumed' });
    }

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const pausedAtStr = new Date(sub.paused_at).toISOString().split('T')[0];

    const d1 = new Date(todayStr);
    const d2 = new Date(pausedAtStr);
    const diffTime = d1 - d2;
    const pauseDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    let newEndDate = new Date(sub.end_date);
    let newNextDelivery = new Date(sub.next_delivery);

    const actualPauseDays = pauseDays > 0 ? pauseDays : 0;

    if (actualPauseDays > 0) {
      newEndDate.setDate(newEndDate.getDate() + actualPauseDays);
      newNextDelivery.setDate(newNextDelivery.getDate() + actualPauseDays);
    } else {
      // If paused and resumed on the same day, next delivery might need to be reset to today/tomorrow if it was missed,
      // but if next_delivery is already in the future, we keep it as is.
      const nextDeliveryStr = newNextDelivery.toISOString().split('T')[0];
      if (nextDeliveryStr < todayStr) {
        newNextDelivery = new Date();
        newNextDelivery.setDate(newNextDelivery.getDate() + 1);
      }
    }

    const r = await pool.query(
      `UPDATE subscriptions 
       SET status='Active', 
           end_date=$1, 
           next_delivery=$2, 
           paused_at=NULL 
       WHERE id=$3 RETURNING *`,
      [
        newEndDate.toISOString().split('T')[0], 
        newNextDelivery.toISOString().split('T')[0], 
        id
      ]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/subscriptions — admin (all statuses)
router.get('/', authAdmin, async (req, res) => {
  try {
    const r = await pool.query("SELECT * FROM subscriptions ORDER BY created_at DESC");
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
