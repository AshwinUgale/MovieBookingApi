const axios = require("axios");
const Movie = require("../models/Movie");
const config = require("../config/config");

// TMDb API URLs
const TMDB_MOVIES_URL = "https://api.themoviedb.org/3/movie/popular?language=en-US&page=1";
const TMDB_GENRES_URL = "https://api.themoviedb.org/3/genre/movie/list?language=en-US";

// ✅ Fetch genre names from TMDb
const fetchGenres = async () => {
    try {
        const response = await axios.get(TMDB_GENRES_URL, {
            headers: {
                Authorization: `Bearer ${config.TMDB_ACCESS_TOKEN}`,
                "Content-Type": "application/json",
            },
        });

        // Convert [{id: 28, name: "Action"}] to {28: "Action"}
        return response.data.genres.reduce((map, genre) => {
            map[genre.id] = genre.name;
            return map;
        }, {});
    } catch (error) {
        console.error("Error fetching genres:", error);
        return {};
    }
};

// ✅ Fetch movies from TMDb and store them in MongoDB
exports.fetchMoviesFromAPI = async (req, res) => {
    try {
        const genresMap = await fetchGenres();
        const response = await axios.get(TMDB_MOVIES_URL, {
            headers: {
                Authorization: `Bearer ${config.TMDB_ACCESS_TOKEN}`,
                "Content-Type": "application/json",
            },
        });

        const movies = response.data.results;

        for (let movie of movies) {
            // Check if the movie already exists in the database
            const existingMovie = await Movie.findOne({ tmdbId: movie.id });

            if (!existingMovie) {
                await Movie.create({
                    tmdbId: movie.id,
                    title: movie.title,
                    originalTitle: movie.original_title,
                    overview: movie.overview,
                    posterUrl: `https://image.tmdb.org/t/p/w500${movie.poster_path}`,
                    backdropUrl: `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}`,
                    mediaType: movie.media_type || "movie",
                    genre: movie.genre_ids.map(id => genresMap[id] || "Unknown"),
                    popularity: movie.popularity || 0,
                    releaseDate: movie.release_date,
                    video: movie.video || false,
                    voteAverage: movie.vote_average || 0,
                    voteCount: movie.vote_count || 0,
                    language: movie.original_language || "English",
                });
            }
        }

        res.status(200).json({ message: "Movies loaded successfully from TMDb" });
    } catch (error) {
        console.error("Error fetching movies:", error);
        res.status(500).json({ message: "Failed to fetch movies from TMDb" });
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
