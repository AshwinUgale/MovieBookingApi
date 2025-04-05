const express = require('express');
const router = express.Router();
const { mockPayment } = require('../controllers/paymentController');

router.post('/pay', mockPayment); 

module.exports = router;
