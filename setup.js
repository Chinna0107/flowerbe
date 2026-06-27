const pool = require('./db');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function setup() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS customers (
      id SERIAL PRIMARY KEY,
      name VARCHAR(150),
      email VARCHAR(150) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      phone VARCHAR(15),
      address TEXT,
      is_verified BOOLEAN DEFAULT false,
      otp VARCHAR(10),
      otp_expires TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS admins (
      id SERIAL PRIMARY KEY,
      email VARCHAR(150) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      name VARCHAR(200) NOT NULL,
      category VARCHAR(50),
      price_per_unit NUMERIC(10,2),
      our_price NUMERIC(10,2) NOT NULL,
      mrp NUMERIC(10,2),
      tag VARCHAR(50),
      img TEXT,
      description TEXT,
      quantity VARCHAR(100),
      price_variants JSONB DEFAULT '[]'::jsonb,
      eligible_for_coupon BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS orders (
      id VARCHAR(30) PRIMARY KEY,
      customer_id INT REFERENCES customers(id),
      customer_name VARCHAR(150),
      customer_email VARCHAR(150),
      customer_phone VARCHAR(15),
      items JSONB NOT NULL,
      subtotal NUMERIC(10,2),
      total NUMERIC(10,2),
      address JSONB,
      status VARCHAR(30) DEFAULT 'Processing',
      razorpay_order_id VARCHAR(100),
      razorpay_payment_id VARCHAR(100),
      payment_method VARCHAR(20) DEFAULT 'razorpay',
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS subscriptions (
      id VARCHAR(30) PRIMARY KEY,
      customer_id INT REFERENCES customers(id),
      customer_name VARCHAR(150),
      customer_email VARCHAR(150),
      product_name VARCHAR(200),
      schedule VARCHAR(50),
      interval_days INT DEFAULT 7,
      status VARCHAR(20) DEFAULT 'Active',
      next_delivery DATE,
      start_date DATE,
      end_date DATE,
      price_per_day NUMERIC(10,2),
      n_days INT,
      paused_at DATE DEFAULT NULL,
      address TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS support_tickets (
      id SERIAL PRIMARY KEY,
      customer_id INT REFERENCES customers(id),
      customer_name VARCHAR(150),
      customer_email VARCHAR(150),
      subject VARCHAR(200),
      message TEXT,
      status VARCHAR(20) DEFAULT 'open',
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS coupons (
      id SERIAL PRIMARY KEY,
      code VARCHAR(50) UNIQUE NOT NULL,
      discount_type VARCHAR(20) DEFAULT 'percentage',
      discount_value NUMERIC(10,2) NOT NULL,
      max_discount NUMERIC(10,2),
      min_order_value NUMERIC(10,2) DEFAULT 0,
      active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // Seed admin
  const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 10);
  await pool.query(
    'INSERT INTO admins (email, password) VALUES ($1,$2) ON CONFLICT (email) DO NOTHING',
    [process.env.ADMIN_EMAIL || 'admin@sowgandhika.com', hash]
  );

  // Seed products
  const products = [
    ['Premium Pooja Mix',     'pooja-premium', 20, 599, 749,  'Premium',    'https://images.unsplash.com/photo-1585559604959-0f9e3413e8e8?w=600&h=600&fit=crop&q=85',  'Curated premium blooms for daily pooja — roses, marigold & jasmine.', '500g'],
    ['Basic Pooja Pack',      'pooja-basic',   4,  129, 169,  'Value',      'https://images.unsplash.com/photo-1508193638397-1c4234db14d8?w=600&h=600&fit=crop&q=85',  'Everyday pooja flowers — fresh marigold, chrysanthemum & tulsi.', '250g'],
    ['Rose Bouquet',          'fresh',         40, 499, 599,  'Best Seller','https://images.unsplash.com/photo-1561128290-006b5bdf10a7?w=600&h=600&fit=crop&q=85',  'Dozen velvety red roses, hand-tied with satin ribbon.', '12 Stems'],
    ['Sunflower Bunch',       'fresh',         30, 349, 449,  'Cheerful',   'https://images.unsplash.com/photo-1597848212624-a19eb35e2651?w=600&h=600&fit=crop&q=85',  'Bright, farm-fresh sunflowers that light up any room.', '5 Stems'],
    ['Lily Arrangement',      'fresh',         50, 599, 749,  'Elegant',    'https://images.unsplash.com/photo-1490750967868-88df5691cc85?w=600&h=600&fit=crop&q=85',  'White Asiatic lilies in a premium glass vase.', '6 Stems'],
    ['Marigold Bunch',        'fresh',         5,  149, 199,  'Fresh',      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=600&fit=crop&q=85',  'Vibrant orange & yellow marigolds, perfect for any occasion.', '500g'],
    ['Bridal Poola Jada Set', 'poola-jada',    null,1299,1599, 'Bridal',     'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=600&h=600&fit=crop&q=85',  'Traditional South Indian bridal hair floral set.', '1 Set'],
    ['Mini Poola Jada',       'poola-jada',    null,699, 899,  'Popular',    'https://images.unsplash.com/photo-1519378058457-4c29a0a2efac?w=600&h=600&fit=crop&q=85',  'Compact floral hair trail for receptions & functions.', '1 Set'],
    ['Jasmine Hair Pin Set',  'hair',          null,199, 249,  'Trending',   'https://images.unsplash.com/photo-1487530811015-780073b1225b?w=600&h=600&fit=crop&q=85',  'Fresh jasmine pins — perfect for daily wear or festive styling.', '6 Pcs'],
    ['Rose Hair Clip',        'hair',          null,149, 199,  'New',        'https://images.unsplash.com/photo-1504208434309-cb69f4fe52b0?w=600&h=600&fit=crop&q=85',  'Single bloom rose clip, hand-made fresh each morning.', '1 Pc'],
    ['Jasmine Garland',       'garlands',      10, 299, 399,  'Fragrant',   'https://images.unsplash.com/photo-1508610048659-a06b669e3321?w=600&h=600&fit=crop&q=85',  'Pure jasmine garland, 3 ft — freshly strung every morning.', '3 Ft'],
    ['Marigold Garland',      'garlands',      7,  199, 249,  'Pooja',      'https://images.unsplash.com/photo-1561181286-d5c73431a97b?w=600&h=600&fit=crop&q=85',  'Traditional marigold mala for home & temple pooja.', '1 Pc (3 Ft)'],
    ['Flower Jewellery Set',  'jewellery',     null,999, 1299, 'Exclusive',  'https://images.unsplash.com/photo-1606166325683-e6deb697d301?w=600&h=600&fit=crop&q=85',  'Full set — necklace, bangles & maang tikka in fresh flowers.', '1 Set'],
    ['Floral Necklace',       'jewellery',     null,449, 599,  'Bridal',     'https://images.unsplash.com/photo-1596436902073-02b8fecf5a1d?w=600&h=600&fit=crop&q=85',  'Handcrafted fresh-flower necklace for ceremonies & functions.', '1 Pc'],
  ];

  for (const p of products) {
    await pool.query(
      'INSERT INTO products (name,category,price_per_unit,our_price,mrp,tag,img,description,quantity) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT DO NOTHING',
      p
    );
  }

  console.log('✅ All tables created & seeded');
  process.exit(0);
}

setup().catch(err => { console.error('❌', err.message); process.exit(1); });
