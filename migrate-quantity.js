const pool = require('./db');

async function run() {
  console.log('🔄 Adding quantity column to products...');
  await pool.query(`
    ALTER TABLE products ADD COLUMN IF NOT EXISTS quantity VARCHAR(100);
  `);
  console.log('   ✅ quantity column added.');

  console.log('🔄 Seeding quantity values for existing products...');
  
  const updates = [
    ["Premium Pooja Mix", "500g"],
    ["Basic Pooja Pack", "250g"],
    ["Rose Bouquet", "12 Stems"],
    ["Sunflower Bunch", "5 Stems"],
    ["Lily Arrangement", "6 Stems"],
    ["Marigold Bunch", "500g"],
    ["Bridal Poola Jada Set", "1 Set"],
    ["Mini Poola Jada", "1 Set"],
    ["Jasmine Hair Pin Set", "6 Pcs"],
    ["Rose Hair Clip", "1 Pc"],
    ["Jasmine Garland", "3 Ft"],
    ["Marigold Garland", "1 Pc (3 Ft)"],
    ["Flower Jewellery Set", "1 Set"],
    ["Floral Necklace", "1 Pc"]
  ];

  for (const [name, qty] of updates) {
    await pool.query(
      "UPDATE products SET quantity = $1 WHERE name = $2 AND quantity IS NULL",
      [qty, name]
    );
  }

  console.log('✅ Migration completed successfully!');
  process.exit(0);
}

run().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
