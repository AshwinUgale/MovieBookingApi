const mongoose = require("mongoose");

const MovieSchema = new mongoose.Schema({
  tmdbId: { type: Number, unique: true }, // Unique TMDb movie ID
  title: { type: String, required: true },
  originalTitle: { type: String, required: true },
  overview: { type: String, required: true },
  posterUrl: { type: String, required: true },
  backdropUrl: { type: String }, // Background image for UI
  mediaType: { type: String, default: "movie" }, // Can be movie, TV show, etc.
  genre: [{ type: String, required: true }], // Convert genre IDs to names
  popularity: { type: Number, default: 0 },
  releaseDate: { type: Date, required: true },
  video: { type: Boolean, default: false },
  voteAverage: { type: Number, default: 0 }, // TMDb rating
  voteCount: { type: Number, default: 0 }, // Number of votes
  language: { type: String, default: "English" }, // Movie language
});

module.exports = mongoose.model("Movie", MovieSchema);
