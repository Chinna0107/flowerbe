// seed-test-data.js — Run with: node seed-test-data.js
// Creates a test order + test subscription in the database
const pool = require('./db');
require('dotenv').config();

async function seedTestData() {
  console.log('🌸 Seeding test order and subscription...');

  // ── 1. Ensure a test customer exists ──────────────────────────────────────
  const bcrypt = require('bcryptjs');
  const hash = await bcrypt.hash('test1234', 10);
  await pool.query(`
    INSERT INTO customers (name, email, password, phone, address, is_verified)
    VALUES ($1, $2, $3, $4, $5, true)
    ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
  `, [
    'Test Customer',
    'testcustomer@sowgandhika.com',
    hash,
    '9876543210',
    JSON.stringify({ flat: '101', building: 'Aparna Sarovar', city: 'Hyderabad', pincode: '500089', phone: '9876543210' })
  ]);

  const custRes = await pool.query(`SELECT id FROM customers WHERE email = $1`, ['testcustomer@sowgandhika.com']);
  const customerId = custRes.rows[0].id;
  console.log(`✅ Test customer ID: ${customerId}`);

  // ── 2. Create a test order ─────────────────────────────────────────────────
  const orderId = 'TEST-ORD-' + Date.now();
  const addressJson = JSON.stringify({
    flat: '101',
    building: 'Aparna Sarovar',
    city: 'Hyderabad',
    pincode: '500089',
    phone: '9876543210',
    timing: '6 am - 7:30 am'   // ← delivery timing stored here
  });

  const items = JSON.stringify([
    { id: 1, name: 'Premium Pooja Mix', price: 599, quantity: 1, unitQuantity: '500g', img: '' },
    { id: 3, name: 'Rose Bouquet',      price: 499, quantity: 2, unitQuantity: '12 Stems', img: '' }
  ]);

  await pool.query(`
    INSERT INTO orders
      (id, customer_id, customer_name, customer_email, customer_phone,
       items, subtotal, total, address, status, payment_method)
    VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9::jsonb, $10, $11)
    ON CONFLICT (id) DO NOTHING
  `, [
    orderId, customerId, 'Test Customer', 'testcustomer@sowgandhika.com', '9876543210',
    items, 1597, 1597, addressJson, 'Delivered', 'razorpay'
  ]);
  console.log(`✅ Test order created: ${orderId}`);

  // ── 3. Create a test subscription ─────────────────────────────────────────
  const subId = 'TEST-SUB-' + Date.now();
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 3);           // started 3 days ago
  const endDate = new Date(today);
  endDate.setDate(today.getDate() + 27);            // 30-day plan
  const nextDelivery = new Date(today);
  nextDelivery.setDate(today.getDate() + 1);        // next delivery tomorrow

  const subAddress = [
    'Test Customer, Flat 101, Aparna Sarovar,',
    'Hyderabad - 500089',
    '(Tel: 9876543210, Time: 6 am - 7:30 am)'
  ].join(' ');

  await pool.query(`
    INSERT INTO subscriptions
      (id, customer_id, customer_name, customer_email,
       product_name, schedule, interval_days, status,
       next_delivery, start_date, end_date,
       price_per_day, n_days, address)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
    ON CONFLICT (id) DO NOTHING
  `, [
    subId, customerId, 'Test Customer', 'testcustomer@sowgandhika.com',
    'Premium Pooja Mix', 'Monthly', 30, 'Active',
    nextDelivery.toISOString().split('T')[0],
    startDate.toISOString().split('T')[0],
    endDate.toISOString().split('T')[0],
    20, 30, subAddress
  ]);
  console.log(`✅ Test subscription created: ${subId}`);

  console.log('\n🎉 Test data seeded successfully!');
  console.log(`\nTest login:\n  Email:    testcustomer@sowgandhika.com\n  Password: test1234`);
  process.exit(0);
}

seedTestData().catch(err => {
  console.error('❌ Seeding failed:', err.message);
  process.exit(1);
});
