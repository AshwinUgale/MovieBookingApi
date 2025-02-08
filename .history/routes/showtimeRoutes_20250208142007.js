const express = require('express');
const router = express.Router();
const {
    getShowtimes,
    createShowtime,
    getShowtimeById
} = require('../controllers/showtimeController');
const { auth, adminAuth } = require('../middleware/authMiddleware');


router.get('/', getShowtimes); 
router.get("/:showtimeId", getShowtimeById); 
router.post('/', adminAuth, createShowtime); 

module.exports = router;
