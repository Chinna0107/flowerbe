const pool = require('./db');
require('dotenv').config();

async function migrate() {
  try {
    // Add price_variants column
    await pool.query(`
      ALTER TABLE products 
      ADD COLUMN IF NOT EXISTS price_variants JSONB DEFAULT '[]'::jsonb;
    `);

    // Update Fresh Flowers products with price variants
    const freshFlowerProducts = [
      { name: 'Rose Bouquet', variants: [
        { quantity: '6 Stems', price: 299, mrp: 399 },
        { quantity: '12 Stems', price: 499, mrp: 599 },
        { quantity: '24 Stems', price: 899, mrp: 1099 }
      ]},
      { name: 'Sunflower Bunch', variants: [
        { quantity: '5 Stems', price: 249, mrp: 349 },
        { quantity: '10 Stems', price: 449, mrp: 599 },
        { quantity: '15 Stems', price: 649, mrp: 849 }
      ]},
      { name: 'Lily Arrangement', variants: [
        { quantity: '3 Stems', price: 399, mrp: 499 },
        { quantity: '6 Stems', price: 699, mrp: 849 },
        { quantity: '10 Stems', price: 1099, mrp: 1349 }
      ]},
      { name: 'Marigold Bunch', variants: [
        { quantity: '100g', price: 99, mrp: 149 },
        { quantity: '250g', price: 199, mrp: 299 },
        { quantity: '500g', price: 349, mrp: 499 }
      ]}
    ];

    for (const product of freshFlowerProducts) {
      await pool.query(
        `UPDATE products SET price_variants = $1 WHERE name = $2 AND category = 'fresh'`,
        [JSON.stringify(product.variants), product.name]
      );
    }

    console.log('✅ Price variants migration completed');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration error:', err.message);
    process.exit(1);
  }
}

migrate();
