const express = require('express');
const router = express.Router();
const {
    getShowtimes,
    createShowtime
} = require('../controllers/showtimeController');
const { auth, adminAuth } = require('../middleware/authMiddleware');

// Showtime routes
router.get('/', auth, getShowtimes); // Authenticated users can view showtimes
router.post('/', adminAuth, createShowtime); // Restricted: Admins can add showtimes

module.exports = router;
