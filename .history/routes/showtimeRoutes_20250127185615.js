const express = require('express');
const router = express.Router();
const {
    getShowtimes,
    createShowtime
} = require('../controllers/showtimeController');
const { auth, adminAuth } = require('../middleware/authMiddleware');


router.get('/', getShowtimes); 
router.post('/', adminAuth, createShowtime); 

module.exports = router;
