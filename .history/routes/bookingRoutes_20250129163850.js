const express = require('express');
const router = express.Router();
const { createBooking } = require('../controllers/bookingController');
const { auth } = require('../middleware/authMiddleware');

router.post('/', auth, createBooking);

module.exports = router;
