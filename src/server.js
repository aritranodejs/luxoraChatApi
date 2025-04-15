const express = require('express');
const dotenv = require('dotenv');
const http = require('http');
const compression = require('compression');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const xss = require('xss');
const sanitize = require('sanitize-html');
const morgan = require('morgan');
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
app.use(helmet());  // Helmet middleware for security headers // prevent xss attacks

// XSS Protection and sanitize user input
app.use((req, res, next) => {
    if (req.body) {
        for (let key in req.body) {
            if (typeof req.body[key] === 'string') {
                // Apply both xss and sanitize-html safely
                const xssClean = xss(req.body[key]);
                req.body[key] = sanitize(xssClean, {
                    allowedTags: [], // no HTML tags allowed
                    allowedAttributes: {},
                });
            }
        }
    }
    next();
});

// Morgan Middleware
app.use(morgan('combined'));

// Cors Middleware
app.use(cors({
    origin: function(origin, callback) {
        const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Create an HTTP server to pass to Socket.IO
const socketIO = require('socket.io');
const server = http.createServer(app);
const io = socketIO(server, {
    cors: {
        origin: ['http://localhost:3000', 'http://54.204.49.31:3000', 'https://luxora.ddns.net'],
        methods: ["GET", "POST"],
        credentials: true
    }
});
io.setMaxListeners(20); // Increase the limit to 20 listeners
const socketHelper = require('./helpers/socket')(io); // Initialize the helper functions

// Middleware to parse JSON and URL-encoded data with limit for 1mb payload
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ limit: '1mb', extended: true }));

// Middleware to serve static files
app.use(express.static(path.join(__dirname, "public")));

// Socket.io middleware (if needed for req.io)
app.use((req, res, next) => {
    req.io = socketHelper; // Use the helper functions
    next();
});

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

// Relation Model
require("./models/Relation");

// API routes
const authRoutes = require('./routes/api/auth');
app.use('/api/auth', limiter, authRoutes); // Apply rate limiting for security // prevent brute force and dos attack

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
