const express = require('express');
const router = express.Router();
const {
    getShowtimes,
    createShowtime,
    getShowtimeById,
    getOrCreateFakeShowtimes
} = require('../controllers/showtimeController');
const { auth, adminAuth } = require('../middleware/authMiddleware');


router.get('/', getShowtimes); 
router.get("/:showtimeId", getShowtimeById); 
router.post('/', adminAuth, createShowtime); 
router.get('/fake', getOrCreateFakeShowtimes);


module.exports = router;
