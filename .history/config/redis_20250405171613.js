const redis = require('redis');

let redisClient;

const redisURL = process.env.REDIS_URL;

async function initializeRedis() {
    if (!redisURL) {
        console.warn('⚠️ No REDIS_URL defined. Using mock Redis client.');
        return createMockRedisClient();
    }

    try {
        redisClient = redis.createClient({ url: redisURL });

        redisClient.on('error', (err) => {
            console.error('❌ Redis Client Error:', err);
        });

        redisClient.on('connect', () => {
            console.log('✅ Redis Client Connected');
        });

        await redisClient.connect();
        return redisClient;

    } catch (error) {
        console.error('❌ Redis initialization failed:', error);
        return createMockRedisClient();
    }
}

function createMockRedisClient() {
    return {
        set: async () => true,
        get: async () => null,
        del: async () => true,
        keys: async () => [],
        isConnected: false,
        connect: async () => console.log('🧪 Mock Redis client - no connection')
    };
}

module.exports = await initializeRedis();
