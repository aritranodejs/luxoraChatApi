const express = require('express');
const dotenv = require('dotenv');
const http = require('http');
const compression = require('compression');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const { response } = require('./helpers/response');

// Load environment variables from .env file
dotenv.config();

// Connect to Database
const { sequelize } = require("./config/db");
sequelize
    .authenticate()
    .then(() => {
        console.log("Connection has been established successfully.");
    })
    .catch((error) => {
        console.error("Unable to connect to the database: ", error);
    });

// Create Express app
const app = express();

// compress all responses
app.use(compression());

// Trust Proxy (Ensures real IP detection)
app.set('trust proxy', 1); // Trust first proxy (if behind NGINX, Cloudflare, etc.)

// Improve scalability by applying rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // Allow 200 requests per window per IP
    keyGenerator: (req) => req.headers["x-forwarded-for"] || req.ip, // Ensures real IP detection
    standardHeaders: true, // Adds `RateLimit-*` headers
    legacyHeaders: false, // Disable `X-RateLimit-*` headers
    message: {
        status: 429,
        error: "Too Many Requests",
        message: "You have exceeded the request limit. Try again later.",
    },
    headers: true, // Adds `Retry-After` header
});

// Helmet security
app.use(helmet());  // Helmet middleware for security headers

// Cors Middleware
app.use(cors());

// Create an HTTP server to pass to Socket.IO
const server = http.createServer(app);

// Middleware to parse JSON and URL-encoded data
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Middleware to serve static files
app.use(express.static(path.join(__dirname, "public")));

// Global variables
app.use((req, res, next) => {
    res.locals.user = req.user;    
    next();
});

// Token blacklist
global.blacklistedTokens = new Set();

// Routes
app.get('/health', (req, res) => {
    return response(res, {}, 'Server is healthy', 200);
});

// API routes
const authRoutes = require('./routes/api/auth');
app.use('/api/auth', limiter, authRoutes); // Apply rate limiting for security

const userRoutes = require('./routes/api/user');
app.use('/api/user', userRoutes); 

const guestRoutes = require('./routes/api/guest');
app.use('/api/guest', guestRoutes); 

const adminRoutes = require('./routes/admin');
app.use('/api/admin', adminRoutes);

// Set the correct views directory
app.set('views', path.resolve(__dirname, 'views'));

// ejs View Engine
app.set('view engine', 'ejs');

// Middleware to render 404 page
app.use((req, res, next) => {
    res.status(404).render('404', {
        layout: false,
        title: 'Page Not Found',
    });
});

// Start the server
const PORT = process.env.APP_PORT;
server.listen(PORT, (error) => {
    if (error) throw error;
    console.log(`Express server started at http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    server.close(() => {
        console.log('Server shut down gracefully');
        process.exit(0);
    });
});