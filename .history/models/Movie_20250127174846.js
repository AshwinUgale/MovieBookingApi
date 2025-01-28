const mongoose = require('mongoose');

const MovieSchema = new mongoose.Schema({
    title: { type: String, required: [true, 'Title is required'] },
    description: { type: String, required: [true, 'Description is required'] },
    genre: { type: String, required: [true, 'Genre is required'] },
    duration: { type: Number, required: [true, 'Duration is required'] }, // in minutes
    releaseDate: { type: Date, required: [true, 'Release date is required'] },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Movie', MovieSchema);
