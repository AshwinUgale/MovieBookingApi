const axios = require("axios");
const config = require("../config/config");
const Movie = require("../models/Movie");

const TMDB_MOVIES_URL = "https://api.themoviedb.org/3/movie/popular?language=en-US&page=1";
const TMDB_GENRES_URL = "https://api.themoviedb.org/3/genre/movie/list?language=en-US";

/**
 * Fetch genre names from TMDb
 */
const fetchGenres = async () => {
    try {
        console.log("📌 Fetching genres from TMDB...");
        console.log("🔑 Using API Key:", config.TMDB_API_KEY); // ✅ Now using API Key

        const response = await axios.get(TMDB_GENRES_URL, {
            params: { api_key: config.TMDB_API_KEY }, // ✅ Correct API Key usage
        });

        console.log("✅ TMDB Response:", response.data);
        return response.data.genres.reduce((map, genre) => {
            map[genre.id] = genre.name;
            return map;
        }, {});
    } catch (error) {
        console.error("🚨 ERROR in fetchGenres:", error.response?.data || error.message);
        throw new Error("Failed to fetch genres from TMDB");
    }
};
/**
 * Fetch movies from TMDb and store them in MongoDB
 */
const fetchMoviesFromAPI = async () => {
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

        return { message: "Movies loaded successfully from TMDb" };
    } catch (error) {
        console.error("🚨 Error fetching movies:", error.message);
        throw new Error("Failed to fetch movies from TMDb");
    }
};

module.exports = { fetchMoviesFromAPI,fetchGenres };
