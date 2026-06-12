// Migration script to update existing database schema
const pool = require('./db');
require('dotenv').config();

async function migrate() {
  console.log('🔄 Starting database migration...\n');

  try {
    // 1. Update products table
    console.log('1️⃣ Updating products table...');
    await pool.query(`
      ALTER TABLE products 
      ADD COLUMN IF NOT EXISTS price_per_unit NUMERIC(10,2),
      ADD COLUMN IF NOT EXISTS our_price NUMERIC(10,2),
      ADD COLUMN IF NOT EXISTS mrp NUMERIC(10,2);
    `);
    
    // Copy old price to new fields if they exist
    await pool.query(`
      UPDATE products 
      SET our_price = price 
      WHERE our_price IS NULL AND price IS NOT NULL;
    `);
    
    await pool.query(`
      UPDATE products 
      SET mrp = original_price 
      WHERE mrp IS NULL AND original_price IS NOT NULL;
    `);
    
    // Drop old columns (optional - comment out if you want to keep them)
    // await pool.query(`ALTER TABLE products DROP COLUMN IF EXISTS stock;`);
    // await pool.query(`ALTER TABLE products DROP COLUMN IF EXISTS price;`);
    // await pool.query(`ALTER TABLE products DROP COLUMN IF EXISTS original_price;`);
    
    console.log('   ✅ Products table updated\n');

    // 2. Update subscriptions table
    console.log('2️⃣ Updating subscriptions table...');
    await pool.query(`
      ALTER TABLE subscriptions 
      ADD COLUMN IF NOT EXISTS start_date DATE,
      ADD COLUMN IF NOT EXISTS end_date DATE,
      ADD COLUMN IF NOT EXISTS price_per_day NUMERIC(10,2),
      ADD COLUMN IF NOT EXISTS n_days INT;
    `);
    
    // Set start_date to created_at for existing subscriptions
    await pool.query(`
      UPDATE subscriptions 
      SET start_date = created_at::date 
      WHERE start_date IS NULL;
    `);
    
    // Set end_date based on schedule for existing subscriptions
    await pool.query(`
      UPDATE subscriptions 
      SET end_date = start_date + INTERVAL '30 days'
      WHERE end_date IS NULL AND schedule LIKE '%Monthly%';
    `);
    
    await pool.query(`
      UPDATE subscriptions 
      SET end_date = start_date + INTERVAL '7 days'
      WHERE end_date IS NULL AND schedule LIKE '%Weekly%';
    `);
    
    await pool.query(`
      UPDATE subscriptions 
      SET end_date = start_date + INTERVAL '30 days'
      WHERE end_date IS NULL AND schedule LIKE '%Alternate%';
    `);
    
    console.log('   ✅ Subscriptions table updated\n');

    console.log('✅ Migration completed successfully!\n');
    console.log('📝 Notes:');
    console.log('   - Old price fields are preserved');
    console.log('   - You can manually drop them after verifying data');
    console.log('   - Existing subscriptions have start/end dates set');
    console.log('\n🚀 You can now restart your server and use new features!');
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

migrate();
