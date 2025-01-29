const cron = require('node-cron');
const redisClient = require('../config/redis');

cron.schedule('*/5 * * * *', async () => {
    console.log('Running seat release job...');
    const keys = await redisClient.keys('seat:*'); 
    for (const key of keys) {
        await redisClient.del(key); // Release seats
    }
    console.log('Expired seat locks cleared.');
});
