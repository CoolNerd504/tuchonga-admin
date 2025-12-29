"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Routes
const admin_js_1 = __importDefault(require("./routes/admin.js"));
const auth_js_1 = __importDefault(require("./routes/auth.js"));
const products_js_1 = __importDefault(require("./routes/products.js"));
const services_js_1 = __importDefault(require("./routes/services.js"));
const categories_js_1 = __importDefault(require("./routes/categories.js"));
const reviews_js_1 = __importDefault(require("./routes/reviews.js"));
const comments_js_1 = __importDefault(require("./routes/comments.js"));
const quickRatings_js_1 = __importDefault(require("./routes/quickRatings.js"));
const favorites_js_1 = __importDefault(require("./routes/favorites.js"));
const users_js_1 = __importDefault(require("./routes/users.js"));
const businesses_js_1 = __importDefault(require("./routes/businesses.js"));
const analytics_js_1 = __importDefault(require("./routes/analytics.js"));
// Get __dirname equivalent for CommonJS
const __dirname = path_1.default.resolve();
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
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
    }
    else {
        next();
    }
});
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
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
app.use('/api/auth', auth_js_1.default);
app.use('/api/admin', admin_js_1.default);
app.use('/api/users', users_js_1.default);
app.use('/api/products', products_js_1.default);
app.use('/api/services', services_js_1.default);
app.use('/api/categories', categories_js_1.default);
app.use('/api/reviews', reviews_js_1.default);
app.use('/api/comments', comments_js_1.default);
app.use('/api/quick-ratings', quickRatings_js_1.default);
app.use('/api/favorites', favorites_js_1.default);
app.use('/api/businesses', businesses_js_1.default);
app.use('/api/analytics', analytics_js_1.default);
// Serve static files from dist folder in production (frontend)
if (process.env.NODE_ENV === 'production') {
    const distPath = path_1.default.join(process.cwd(), 'dist');
    app.use(express_1.default.static(distPath));
    // Serve index.html for all non-API routes (SPA routing)
    app.get('*', (req, res, next) => {
        // Skip API routes
        if (req.path.startsWith('/api')) {
            return next();
        }
        res.sendFile(path_1.default.join(distPath, 'index.html'));
    });
}
// Error handling middleware
app.use((err, req, res, next) => {
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
exports.default = app;
