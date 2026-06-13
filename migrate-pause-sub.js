const pool = require('./db');
require('dotenv').config();

async function migrate() {
  try {
    console.log('⏳ Starting migration to add paused_at column...');
    await pool.query(`
      ALTER TABLE subscriptions 
      ADD COLUMN IF NOT EXISTS paused_at DATE DEFAULT NULL;
    `);
    console.log('✅ Migration completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
}

migrate();
