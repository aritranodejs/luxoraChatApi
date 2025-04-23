// Redis configuration for storing refresh tokens
const redis = require('redis');

let redisClient;
(() => {
  const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
  redisClient = redis.createClient({
    url: redisUrl,
    socket: {
      reconnectStrategy: (retries) => Math.min(retries * 50, 1000)
    },
    // Force JSON.stringify on non-string values with Legacy mode for older Redis versions
    legacyMode: false
  });
  redisClient.connect().catch(console.error);
  redisClient.on('error', (err) => console.error('Redis Client Error', err));
  redisClient.on('connect', () => console.log('Redis Client Connected'));
  redisClient.on('reconnecting', () => console.log('Redis Client Reconnecting'));
})();

module.exports = {
    redisClient,
};