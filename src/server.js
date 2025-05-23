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
const { response } = require('./utils/response.utils');

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

// Improve scalability by applying rate limiting // prevent brute force and dos attack
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
app.use(morgan('combined')); // log all requests to the console

// Cors Middleware
app.use(cors({
    origin: function(origin, callback) {
        const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.log('CORS blocked origin:', origin);
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
    path: '/socket.io/',
    cors: {
        origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
        methods: ["GET", "POST"],
        credentials: true
    },
    transports: ['polling', 'websocket'],
    allowEIO3: true,
    pingTimeout: 60000, // Increase ping timeout for slow connections
    pingInterval: 25000, // Increase ping interval
    upgradeTimeout: 30000, // Increase upgrade timeout
    maxHttpBufferSize: 1e8, // Increase max buffer size
    allowUpgrades: true,
    cookie: {
        name: 'io',
        path: '/',
        httpOnly: true,
        sameSite: 'none',
        secure: process.env.NODE_ENV === 'production'
    }
});

// Additional Socket.IO configuration for proxies
io.engine.on("connection_error", (err) => {
    console.log('Socket connection error:', err);
});

io.setMaxListeners(20); // Increase the limit to 20 listeners
const socketHelper = require('./utils/socket.utils')(io); // Initialize the socket utilities

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

// Routes
app.get('/health', (req, res) => {
    return response(res, {}, 'Server is healthy', 200);
});

// Socket.io health check
app.get('/socket-health', (req, res) => {
    return response(res, { 
        connected: io.engine?.clientsCount || 0,
        namespace: Object.keys(io.nsps || {})
    }, 'Socket.IO status', 200);
});

// Socket.io debug info
app.get('/socket-debug', (req, res) => {
    return response(res, {
        connected: io.engine?.clientsCount || 0,
        namespaces: Object.keys(io.nsps || {}),
        config: {
            path: io.path(),
            transports: io._opts.transports,
            cors: io._opts.cors,
            origins: process.env.ALLOWED_ORIGINS,
            serverDomain: req.headers.host,
            clientOrigin: req.headers.origin || 'unknown'
        },
        env: {
            nodeEnv: process.env.NODE_ENV,
            appUrl: process.env.APP_URL,
            siteUrl: process.env.SITE_URL
        }
    }, 'Socket.IO debug info', 200);
});

// Socket.io test page
app.get('/socket-test', (req, res) => {
    res.render('socket-test', {
        title: 'Socket.IO Test',
        layout: false
    });
});

// Relation Model
require("./models/Relation");

// Apply rate limiting for security // prevent brute force and dos attack
app.use(limiter);

// API routes
const authRoutes = require('./routes/api/auth');
app.use('/api/auth', authRoutes); 

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
