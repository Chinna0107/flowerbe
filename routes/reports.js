const router = require('express').Router();
const pool = require('../db');
const { authAdmin } = require('../middleware/auth');

// GET /api/reports — admin stats
router.get('/', authAdmin, async (req, res) => {
  try {
    const [totalOrders, totalRevenue, totalCustomers, totalProducts,
           activeSubs, ordersByStatus, topProducts, monthlySales] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM orders'),
      pool.query("SELECT COALESCE(SUM(total),0) AS revenue FROM orders WHERE status != 'Cancelled'"),
      pool.query('SELECT COUNT(*) FROM customers'),
      pool.query('SELECT COUNT(*) FROM products'),
      pool.query("SELECT COUNT(*) FROM subscriptions WHERE status='Active'"),
      pool.query("SELECT status, COUNT(*) AS count, COALESCE(SUM(total),0) AS revenue FROM orders GROUP BY status"),
      pool.query(`
        SELECT p.name, COUNT(o.id) AS order_count, COALESCE(SUM(o.total),0) AS revenue
        FROM orders o
        CROSS JOIN LATERAL jsonb_array_elements(o.items) AS item
        JOIN products p ON p.id = (item->>'id')::int
        GROUP BY p.name ORDER BY order_count DESC LIMIT 5
      `),
      pool.query(`
        SELECT TO_CHAR(created_at,'YYYY-MM') AS month, COUNT(*) AS orders, COALESCE(SUM(total),0) AS revenue
        FROM orders GROUP BY month ORDER BY month DESC LIMIT 6
      `),
    ]);

    res.json({
      stats: {
        totalOrders: parseInt(totalOrders.rows[0].count),
        totalRevenue: parseFloat(totalRevenue.rows[0].revenue),
        totalCustomers: parseInt(totalCustomers.rows[0].count),
        totalProducts: parseInt(totalProducts.rows[0].count),
        activeSubs: parseInt(activeSubs.rows[0].count),
      },
      ordersByStatus: ordersByStatus.rows,
      topProducts: topProducts.rows,
      monthlySales: monthlySales.rows,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
