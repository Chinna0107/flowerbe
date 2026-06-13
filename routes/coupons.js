const router = require('express').Router();
const pool = require('../db');
const { authCustomer, authAdmin } = require('../middleware/auth');

// GET /api/coupons — Admin view all
router.get('/', authAdmin, async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM coupons ORDER BY created_at DESC');
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/coupons — Admin create
router.post('/', authAdmin, async (req, res) => {
  const { code, discount_type, discount_value, max_discount, min_order_value } = req.body;
  try {
    const r = await pool.query(
      `INSERT INTO coupons (code, discount_type, discount_value, max_discount, min_order_value, active)
       VALUES ($1, $2, $3, $4, $5, TRUE) RETURNING *`,
      [code.toUpperCase(), discount_type || 'percentage', discount_value, max_discount || null, min_order_value || 0]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/coupons/:id — Admin delete
router.delete('/:id', authAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM coupons WHERE id=$1', [req.params.id]);
    res.json({ message: 'Coupon deleted successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/coupons/apply — Customer apply coupon at checkout
router.post('/apply', authCustomer, async (req, res) => {
  const { code, cart } = req.body;
  try {
    // 1. Verify that the user has an active or paused subscription
    const subRes = await pool.query(
      "SELECT id FROM subscriptions WHERE customer_id=$1 AND status IN ('Active', 'Paused') LIMIT 1",
      [req.customer.id]
    );
    if (subRes.rows.length === 0) {
      return res.status(400).json({ error: 'Coupons are only available to subscribed members.' });
    }

    // 2. Find and validate coupon
    const couponRes = await pool.query(
      "SELECT * FROM coupons WHERE code=$1 AND active=TRUE LIMIT 1",
      [code.toUpperCase()]
    );
    if (couponRes.rows.length === 0) {
      return res.status(404).json({ error: 'Invalid or inactive coupon code.' });
    }
    const coupon = couponRes.rows[0];

    // 3. Extract cart details and verify eligible items
    if (!cart || !Array.isArray(cart) || cart.length === 0) {
      return res.status(400).json({ error: 'Your cart is empty.' });
    }

    const productIds = cart.map(item => item.id);
    const prodRes = await pool.query(
      "SELECT id, eligible_for_coupon, our_price FROM products WHERE id = ANY($1)",
      [productIds]
    );
    const dbProducts = {};
    prodRes.rows.forEach(p => {
      dbProducts[p.id] = p;
    });

    let totalCartSubtotal = 0;
    let eligibleSubtotal = 0;

    cart.forEach(item => {
      const dbProd = dbProducts[item.id];
      if (dbProd) {
        const itemPrice = parseFloat(dbProd.our_price);
        const itemQty = parseInt(item.quantity) || 1;
        const itemTotal = itemPrice * itemQty;
        totalCartSubtotal += itemTotal;

        if (dbProd.eligible_for_coupon) {
          eligibleSubtotal += itemTotal;
        }
      }
    });

    // 4. Validate minimum order value
    if (totalCartSubtotal < parseFloat(coupon.min_order_value)) {
      return res.status(400).json({ 
        error: `Minimum order value of ₹${coupon.min_order_value} required for this coupon.` 
      });
    }

    // 5. Verify if there are eligible products in cart
    if (eligibleSubtotal === 0) {
      return res.status(400).json({ 
        error: 'None of the items in your cart are eligible for this coupon.' 
      });
    }

    // 6. Calculate discount
    let discount = 0;
    const value = parseFloat(coupon.discount_value);
    if (coupon.discount_type === 'percentage') {
      discount = eligibleSubtotal * (value / 100);
      if (coupon.max_discount) {
        discount = Math.min(discount, parseFloat(coupon.max_discount));
      }
    } else {
      // flat discount
      discount = Math.min(value, eligibleSubtotal);
    }

    discount = Math.round(discount * 100) / 100; // round to 2 decimal places

    res.json({
      success: true,
      code: coupon.code,
      discount,
      eligibleSubtotal,
      totalCartSubtotal
    });

  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
