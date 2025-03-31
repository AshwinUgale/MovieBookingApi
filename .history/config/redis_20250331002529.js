const redis = require('redis');

let redisClient;

// Create Redis client with proper error handling
try {
    redisClient = redis.createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379'
    });
    
    redisClient.on('error', (err) => {
        console.error('Redis Client Error:', err);
    });
    
    redisClient.on('connect', () => {
        console.log('Redis Client Connected');
    });
    
    redisClient.connect().catch(err => {
        console.error('Failed to connect to Redis:', err);
    });
} catch (error) {
    console.error('Redis initialization error:', error);
    // Create a mock Redis client that won't crash the app
    redisClient = {
        set: async () => true,
        get: async () => null,
        del: async () => true,
        keys: async () => [],
        isConnected: false,
        connect: async () => console.log('Mock Redis client - no connection')
    };
    console.log('Using mock Redis client as fallback');
}

module.exports = redisClient;
