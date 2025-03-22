const mongoose = require('mongoose');

const ShowtimeSchema = new mongoose.Schema({
    movie: { type: mongoose.Schema.Types.ObjectId, ref: 'Movie', required: true },
    theater: { type: String, required: true },
    showtime: { type: Date, required: true },
    availableSeats: [{ type: String, required: true }], 
    version: { type: Number, default: 0 }, 
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Showtime', ShowtimeSchema);
