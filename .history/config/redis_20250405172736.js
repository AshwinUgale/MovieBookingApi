const redis = require('redis');

const redisURL = process.env.REDIS_URL;

let redisClient;

async function initializeRedis() {
    if (!redisURL) {
        console.warn('⚠️ No REDIS_URL defined. Using mock Redis client.');
        return createMockRedisClient();
    }

    try {
        const client = redis.createClient({ url: redisURL });

        client.on('error', (err) => {
            console.error('❌ Redis Client Error:', err);
        });

        client.on('connect', () => {
            console.log('✅ Redis Client Connected');
        });

        await client.connect();
        return client;
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

module.exports = initializeRedis(); // <--- This exports a Promise!
