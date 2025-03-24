const axios = require("axios");
const Movie = require("../models/Movie");
const config = require("../config/config");
const { fetchMoviesFromAPI, fetchGenres } = require("../services/tmdbService");

/**
 * @route GET /api/movies/popular
 * @desc Fetch movies from TMDB and store in MongoDB
 */
exports.loadMoviesFromTMDB = async (req, res) => {
    try {
        const result = await fetchMoviesFromAPI();
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @route GET /api/movies/genres
 * @desc Fetch genres from TMDB
 */
exports.getMovieGenres = async (req, res) => {
    console.log("📌 Received request for /api/movies/genres");
    try {
        console.log("📌 Received request for /api/movies/genres");
        const genres = await fetchGenres();
        console.log("✅ Genres fetched successfully:", genres);
        res.status(200).json(genres);
    } catch (error) {
        console.error("🚨 Error in getMovieGenres:", error);
        res.status(500).json({ message: error.message });
    }
};


// ✅ GET /api/movies → Get all movies (with filters & sorting)
exports.getMovies = async (req, res) => {
    try {
      const { genre, language, year, minRating, sortBy } = req.query;
  
      // Always fetch from TMDB
      const tmdbMovies = await fetchMoviesFromAPI(); // <- your TMDB fetch service
  
      // Optional: filter them locally
      let filtered = tmdbMovies;
  
      if (genre) {
        filtered = filtered.filter(m => m.genre?.includes(genre));
      }
      if (language) {
        filtered = filtered.filter(m => m.language === language);
      }
  
      // Sort if needed
      if (sortBy === "rating") {
        filtered.sort((a, b) => b.voteAverage - a.voteAverage);
      }
  
      res.json(filtered);
    } catch (error) {
      console.error("❌ Error in getMovies:", error.message);
      res.status(500).json({ message: "Could not fetch fresh movies" });
    }
  };
  
// ✅ GET /api/movies/:id → Get a single movie by MongoDB `_id` or `tmdbId`
exports.getMovieById = async (req, res) => {
    try {
        let movie = await Movie.findById(req.params.id);

        // If not found by `_id`, try `tmdbId`
        if (!movie) {
            movie = await Movie.findOne({ tmdbId: req.params.id });
        }

        if (!movie) return res.status(404).json({ message: "Movie not found" });

        res.json(movie);
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};

// ✅ PUT /api/movies/:id → Update movie details (Admin only)
exports.updateMovie = async (req, res) => {
    try {
        const updatedMovie = await Movie.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updatedMovie) return res.status(404).json({ message: "Movie not found" });
        res.json(updatedMovie);
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};

// ✅ DELETE /api/movies/:id → Delete a movie (Admin only)
exports.deleteMovie = async (req, res) => {
    try {
        const deletedMovie = await Movie.findByIdAndDelete(req.params.id);
        if (!deletedMovie) return res.status(404).json({ message: "Movie not found" });
        res.json({ message: "Movie deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};
