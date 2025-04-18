// const express = require('express');
// const router = express.Router();
// const redisClient = require('../config/redis'); // adjust path if needed

// router.get('/test-redis', async (req, res) => {
//     try {
//         await redisClient.set('testKey', 'HelloRedis', { EX: 10 }); // expires in 10s
//         const value = await redisClient.get('testKey');
//         res.send(`Redis value: ${value}`);
//     } catch (err) {
//         console.error('Redis test failed:', err);
//         res.status(500).send('Redis not working');
//     }
// });

// module.exports = router;
