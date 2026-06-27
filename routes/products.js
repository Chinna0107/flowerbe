const router = require('express').Router();
const pool = require('../db');
const { authAdmin } = require('../middleware/auth');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
require('dotenv').config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = multer.memoryStorage();
const upload = multer({ storage });

// GET /api/products
router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    const q = category && category !== 'all'
      ? 'SELECT * FROM products WHERE category=$1 ORDER BY id'
      : 'SELECT * FROM products ORDER BY id';
    const r = await pool.query(q, category && category !== 'all' ? [category] : []);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/products/:id
router.get('/:id', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM products WHERE id=$1', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/products/upload-image — admin upload to cloudinary
router.post('/upload-image', authAdmin, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const b64 = Buffer.from(req.file.buffer).toString('base64');
    const dataURI = `data:${req.file.mimetype};base64,${b64}`;
    const result = await cloudinary.uploader.upload(dataURI, { folder: 'sowgandhika_flowers' });
    res.json({ url: result.secure_url });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/products — admin
router.post('/', authAdmin, async (req, res) => {
  const { name, category, price_per_unit, our_price, mrp, tag, img, description, quantity, price_variants } = req.body;
  try {
    const r = await pool.query(
      'INSERT INTO products (name,category,price_per_unit,our_price,mrp,tag,img,description,quantity,price_variants) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *',
      [name, category, price_per_unit, our_price, mrp, tag, img, description, quantity, price_variants || '[]']
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/products/:id — admin
router.put('/:id', authAdmin, async (req, res) => {
  const { name, category, price_per_unit, our_price, mrp, tag, img, description, quantity, price_variants } = req.body;
  try {
    const r = await pool.query(
      'UPDATE products SET name=$1,category=$2,price_per_unit=$3,our_price=$4,mrp=$5,tag=$6,img=$7,description=$8,quantity=$9,price_variants=$10 WHERE id=$11 RETURNING *',
      [name, category, price_per_unit, our_price, mrp, tag, img, description, quantity, price_variants || '[]', req.params.id]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/products/:id/toggle-coupon — admin toggle coupon eligibility
router.put('/:id/toggle-coupon', authAdmin, async (req, res) => {
  const { eligible_for_coupon } = req.body;
  try {
    const r = await pool.query(
      'UPDATE products SET eligible_for_coupon=$1 WHERE id=$2 RETURNING *',
      [eligible_for_coupon, req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Product not found' });
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/products/:id — admin
router.delete('/:id', authAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM products WHERE id=$1', [req.params.id]);
    res.json({ message: 'Product deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
