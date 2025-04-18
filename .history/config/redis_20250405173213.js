const redis = require('redis');

const redisURL = process.env.REDIS_URL;

async function createRedisClient() {
    if (!redisURL) {
        console.warn('⚠️ No REDIS_URL found. Using mock Redis client.');
        return {
            set: async () => true,
            get: async () => null,
            del: async () => true,
            keys: async () => [],
            connect: async () => {},
        };
    }

    try {
        const client = redis.createClient({ url: redisURL });

        client.on('connect', () => {
            console.log('✅ Redis connected');
        });

        client.on('error', (err) => {
            console.error('❌ Redis error:', err);
        });

        await client.connect();
        return client;
    } catch (error) {
        console.error('❌ Redis failed to connect, using mock:', error);
        return {
            set: async () => true,
            get: async () => null,
            del: async () => true,
            keys: async () => [],
            connect: async () => {},
        };
    }
}

// ⛳ Export a function, NOT a resolved promise
module.exports = createRedisClient;
