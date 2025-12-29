import express from 'express';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables FIRST, before any other imports that might use them
dotenv.config();

// Railway provides both DATABASE_URL (internal) and DATABASE_PUBLIC_URL (external)
// Use DATABASE_PUBLIC_URL if DATABASE_URL is not set (for Railway deployments)
if (!process.env.DATABASE_URL && process.env.DATABASE_PUBLIC_URL) {
  process.env.DATABASE_URL = process.env.DATABASE_PUBLIC_URL;
  console.log('ℹ️  Using DATABASE_PUBLIC_URL as DATABASE_URL');
}

// Verify critical environment variables are set
if (!process.env.DATABASE_URL && process.env.NODE_ENV === 'production') {
  console.error('❌ ERROR: DATABASE_URL is required in production but not set!');
  console.error('Please set DATABASE_URL or DATABASE_PUBLIC_URL in Railway environment variables.');
  process.exit(1);
}

if (process.env.DATABASE_URL) {
  console.log('✅ DATABASE_URL is configured');
}

// Routes (imported after dotenv.config() so Prisma can access DATABASE_URL)
import adminRoutes from './routes/admin.js';
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import serviceRoutes from './routes/services.js';
import categoryRoutes from './routes/categories.js';
import reviewRoutes from './routes/reviews.js';
import commentRoutes from './routes/comments.js';
import quickRatingRoutes from './routes/quickRatings.js';
import favoriteRoutes from './routes/favorites.js';
import userRoutes from './routes/users.js';
import businessRoutes from './routes/businesses.js';
import analyticsRoutes from './routes/analytics.js';

// Get __dirname equivalent for CommonJS
const __dirname = path.resolve();

const app = express();
const PORT = Number(process.env.PORT) || 3001;

// Middleware - CORS with environment-aware configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : process.env.NODE_ENV === 'production'
  ? [] // Production should specify origins
  : ['http://localhost:5173', 'http://localhost:3039', 'http://localhost:3000']; // Local development

app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // Allow requests from allowed origins or same origin
  if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
    res.header('Access-Control-Allow-Origin', origin || '*');
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Info endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'TuChonga API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      admin: '/api/admin',
      users: '/api/users',
      products: '/api/products',
      services: '/api/services',
      categories: '/api/categories',
      reviews: '/api/reviews',
      comments: '/api/comments',
      quickRatings: '/api/quick-ratings',
      favorites: '/api/favorites',
      businesses: '/api/businesses',
      analytics: '/api/analytics',
    },
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/quick-ratings', quickRatingRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/businesses', businessRoutes);
app.use('/api/analytics', analyticsRoutes);

// Serve static files from dist folder in production (frontend)
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(process.cwd(), 'dist');
  app.use(express.static(distPath));
  
  // Serve index.html for all non-API routes (SPA routing)
  // Express 5.x requires named wildcard parameters
  app.get('/{*splat}', (req, res, next) => {
    // Skip API routes
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

// Start server - Railway requires listening on 0.0.0.0
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 API Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 Health check: http://0.0.0.0:${PORT}/health`);
  
  if (process.env.NODE_ENV === 'production') {
    console.log(`🔒 Production mode: CORS restricted to: ${process.env.ALLOWED_ORIGINS || 'Not set (configure ALLOWED_ORIGINS)'}`);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});

export default app;

