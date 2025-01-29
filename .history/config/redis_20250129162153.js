const redis = require('redis');

const redisClient = redis.createClient();
redisClient.connect();

redisClient.on('error', (err) => console.log('Redis Client Error', err));

module.exports = redisClient;
