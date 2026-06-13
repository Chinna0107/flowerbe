const pool = require('./db');

async function check() {
  try {
    const customers = await pool.query("SELECT id, email FROM customers WHERE email = 'kancharlahemanth89@gmail.com'");
    console.log("Customers:", customers.rows);
    if (customers.rows.length > 0) {
      const custId = customers.rows[0].id;
      const subscriptions = await pool.query("SELECT * FROM subscriptions WHERE customer_id = $1", [custId]);
      console.log("Subscriptions for kancharlahemanth89@gmail.com:", subscriptions.rows);
    }
    
    const coupons = await pool.query("SELECT * FROM coupons");
    console.log("All coupons:", coupons.rows);

    const products = await pool.query("SELECT id, name, eligible_for_coupon, our_price FROM products");
    console.log("All products (sample):", products.rows.slice(0, 10));

  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

check();
