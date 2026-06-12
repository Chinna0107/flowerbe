// Run this script daily via cron or scheduler to deactivate expired subscriptions
const pool = require('./db');
require('dotenv').config();

async function checkExpiredSubscriptions() {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const result = await pool.query(
      `UPDATE subscriptions 
       SET status='Inactive' 
       WHERE end_date < $1 AND status='Active'
       RETURNING id, customer_name, product_name, end_date`,
      [today]
    );

    if (result.rows.length > 0) {
      console.log(`✅ Deactivated ${result.rows.length} expired subscriptions:`);
      result.rows.forEach(sub => {
        console.log(`   - ${sub.id}: ${sub.customer_name} - ${sub.product_name} (expired: ${sub.end_date})`);
      });
    } else {
      console.log('✓ No expired subscriptions found.');
    }

    process.exit(0);
  } catch (err) {
    console.error('❌ Error checking expired subscriptions:', err.message);
    process.exit(1);
  }
}

checkExpiredSubscriptions();
