const router = require('express').Router();
const pool = require('../db');
const { authCustomer, authAdmin } = require('../middleware/auth');

// GET /api/orders/my — customer
router.get('/my', authCustomer, async (req, res) => {
  try {
    const paymentFilter = "((payment_method = 'cod') OR (payment_method = 'razorpay' AND status IN ('Confirmed', 'In Transit', 'Delivered')))";
    const r = await pool.query(
      `SELECT * FROM orders WHERE customer_id=$1 AND ${paymentFilter} ORDER BY created_at DESC`,
      [req.customer.id]
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/orders — admin all with details (only paid/cod orders)
router.get('/', authAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    const paymentFilter = "((o.payment_method = 'cod') OR (o.payment_method = 'razorpay' AND o.status IN ('Confirmed', 'In Transit', 'Delivered')))";
    const q = status && status !== 'All'
      ? `SELECT o.*, c.name as customer_name, c.email as customer_email FROM orders o LEFT JOIN customers c ON o.customer_id=c.id WHERE o.status=$1 AND ${paymentFilter} ORDER BY o.created_at DESC`
      : `SELECT o.*, c.name as customer_name, c.email as customer_email FROM orders o LEFT JOIN customers c ON o.customer_id=c.id WHERE ${paymentFilter} ORDER BY o.created_at DESC`;
    const r = await pool.query(q, status && status !== 'All' ? [status] : []);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/orders/:id/status — admin
router.put('/:id/status', authAdmin, async (req, res) => {
  const { status } = req.body;
  const valid = ['Processing', 'In Transit', 'Delivered', 'Cancelled'];
  if (!valid.includes(status)) return res.status(400).json({ error: 'Invalid status' });
  try {
    const r = await pool.query('UPDATE orders SET status=$1 WHERE id=$2 RETURNING *', [status, req.params.id]);
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
