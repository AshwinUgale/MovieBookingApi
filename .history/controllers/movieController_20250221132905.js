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
        let query = {};
        let sort = { popularity: -1 }; // Default sorting by popularity (highest first)

        // 🎭 Filter by Genre
        if (req.query.genre) {
            query.genre = req.query.genre;
        }

        // 🔍 Filter by Language
        if (req.query.language) {
            query.language = req.query.language;
        }

        // ⭐ Filter by Minimum Rating
        if (req.query.minRating) {
            query.voteAverage = { $gte: parseFloat(req.query.minRating) };
        }

        // 📆 Filter by Release Year
        if (req.query.year) {
            query.releaseDate = {
                $gte: new Date(`${req.query.year}-01-01`),
                $lt: new Date(`${parseInt(req.query.year) + 1}-01-01`)
            };
        }

        // 🔝 Sorting Options
        if (req.query.sortBy) {
            if (req.query.sortBy === "rating") sort = { voteAverage: -1 };
            if (req.query.sortBy === "releaseDate") sort = { releaseDate: -1 };
        }

        const movies = await Movie.find(query).sort(sort);
        res.json(movies);
    } catch (error) {
        res.status(500).json({ message: "Server Error" });
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
