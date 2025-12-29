import express from 'express';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables FIRST, before any other imports that might use them
dotenv.config();

// Railway should auto-provide DATABASE_URL when PostgreSQL is connected
// But if it doesn't, we'll check for alternative variable names
if (!process.env.DATABASE_URL) {
  // Check all possible Railway database URL variable names
  const possibleDbUrls = [
    process.env.DATABASE_PUBLIC_URL,
    process.env.POSTGRES_URL,
    process.env.POSTGRES_PRIVATE_URL,
    process.env.POSTGRES_PUBLIC_URL,
    process.env.PGDATABASE_URL,
    process.env.RAILWAY_DATABASE_URL,
  ].filter(Boolean);

  if (possibleDbUrls.length > 0) {
    process.env.DATABASE_URL = possibleDbUrls[0];
    const varName = Object.keys(process.env).find(key => process.env[key] === possibleDbUrls[0]);
    console.log(`ℹ️  Using ${varName} as DATABASE_URL`);
  }
}

// Log status (without exposing sensitive data)
if (process.env.DATABASE_URL) {
  const dbUrlPreview = process.env.DATABASE_URL.substring(0, 30) + '...';
  console.log(`✅ DATABASE_URL is configured: ${dbUrlPreview}`);
} else {
  console.error('❌ ERROR: DATABASE_URL not found!');
  console.error('   Railway should auto-provide this when PostgreSQL is connected.');
  console.error('');
  console.error('   Debugging - All environment variables:');
  const allEnvVars = Object.keys(process.env).sort();
  const dbRelated = allEnvVars.filter(key => 
    key.includes('DATABASE') || key.includes('POSTGRES') || key.includes('DB') || key.includes('PG')
  );
  if (dbRelated.length > 0) {
    console.error('   Database-related variables found:');
    dbRelated.forEach(key => {
      const value = process.env[key];
      const preview = value ? (value.length > 50 ? value.substring(0, 50) + '...' : value) : 'undefined';
      console.error(`     ${key} = ${preview}`);
    });
  } else {
    console.error('   ⚠️  No database-related environment variables found!');
    console.error('   Total env vars:', allEnvVars.length);
  }
  console.error('');
  console.error('   To fix:');
  console.error('   1. Go to Railway Dashboard → Your Service → Variables');
  console.error('   2. Verify DATABASE_URL is set (check spelling - must be exactly "DATABASE_URL")');
  console.error('   3. If PostgreSQL is connected, Railway should auto-inject it');
  console.error('   4. If not, manually add DATABASE_URL with your PostgreSQL connection string');
  // Don't exit - let Prisma handle the error gracefully
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
// Since frontend and API are on the same Railway domain, same-origin requests don't need CORS
// But we allow it for flexibility and development
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => {
      // Normalize: remove trailing slashes for consistent matching
      const normalized = o.trim().replace(/\/+$/, '');
      return normalized;
    })
  : process.env.NODE_ENV === 'production'
  ? [] // Production: if not set, allow same-origin (Railway same domain)
  : ['http://localhost:5173', 'http://localhost:3039', 'http://localhost:3000']; // Local development

app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // Normalize origin (remove trailing slash) for comparison
  const normalizedOrigin = origin ? origin.replace(/\/+$/, '') : null;
  
  // Same-origin requests (no origin) don't need CORS headers, but we'll add them anyway
  if (!origin) {
    // Same-origin request - allow it
    res.header('Access-Control-Allow-Origin', '*');
  } else if (process.env.NODE_ENV === 'production') {
    // Production: allow if in allowed list (normalized comparison), or if no list specified (same domain)
    const isAllowed = allowedOrigins.length === 0 || allowedOrigins.some(allowed => {
      // Compare normalized origins (handle trailing slashes)
      return normalizedOrigin === allowed.replace(/\/+$/, '');
    });
    
    if (isAllowed) {
      res.header('Access-Control-Allow-Origin', origin);
    }
  } else {
    // Development: allow all localhost origins
    res.header('Access-Control-Allow-Origin', origin);
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

