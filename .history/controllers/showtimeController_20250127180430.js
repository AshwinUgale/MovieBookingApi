const Showtime = require('../models/Showtime');

// Get all showtimes
exports.getShowtimes = async (req, res) => {
    try {
        const showtimes = await Showtime.find().populate('movie', 'title'); // Populates movie title
        res.json(showtimes);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// Create a new showtime
exports.createShowtime = async (req, res) => {
    const { movie, theater, showtime, availableSeats } = req.body;
    try {
        const newShowtime = new Showtime({ movie, theater, showtime, availableSeats });
        await newShowtime.save();
        res.status(201).json(newShowtime);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
