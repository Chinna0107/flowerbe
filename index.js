const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Determine allowed origins based on environment
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  process.env.PRODUCTION_URL || 'https://sowgandhikafreshflowers.com',
  'http://localhost:5173',
  'https://sowgandhikafreshflowers.com'
];

app.use(cors({ 
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());

// General routes
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/products',      require('./routes/products'));

// Customer routes
app.use('/api/payment',       require('./routes/payment'));
app.use('/api/orders',        require('./routes/orders'));
app.use('/api/subscriptions', require('./routes/subscriptions'));
app.use('/api/support',       require('./routes/support'));

// Admin routes
app.use('/api/reports',       require('./routes/reports'));

app.get('/', (req, res) => res.json({ message: '🌸 Sowgandhika Flowers API is running' }));

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
