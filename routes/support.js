const router = require('express').Router();
const pool = require('../db');
const { authCustomer, authAdmin } = require('../middleware/auth');

// POST /api/support — customer submit ticket
router.post('/', authCustomer, async (req, res) => {
  const { subject, message } = req.body;
  try {
    const cust = await pool.query('SELECT name, email FROM customers WHERE id=$1', [req.customer.id]);
    const { name, email } = cust.rows[0];
    const r = await pool.query(
      'INSERT INTO support_tickets (customer_id,customer_name,customer_email,subject,message) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [req.customer.id, name, email, subject, message]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/support/my — customer own tickets
router.get('/my', authCustomer, async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM support_tickets WHERE customer_id=$1 ORDER BY created_at DESC', [req.customer.id]);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/support — admin all tickets
router.get('/', authAdmin, async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM support_tickets ORDER BY created_at DESC');
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
