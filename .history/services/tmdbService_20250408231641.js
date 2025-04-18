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
    console.log("🎬 Fetching genres from TMDB...");
    
    const response = await axios.get(TMDB_GENRES_URL, {
      params: { api_key: config.TMDB_API_KEY }, // ✅ API Key included
    });

    console.log("✅ TMDB Response:", response.data);

    // Ensure response has valid data
    if (!response.data.genres || response.data.genres.length === 0) {
      console.warn("⚠️ No genres found in TMDB response.");
      return [];
    }

    // Convert genres into an array of objects [{ id, name }]
    const genres = response.data.genres.map((genre) => ({
      id: genre.id,
      name: genre.name,
    }));

    return genres;
  } catch (error) {
    console.error("❌ ERROR in fetchGenres:", error.response?.data || error.message);
    return []; // Return an empty array instead of throwing an error
  }
};

/**
 * Fetch movies from TMDb and store them in MongoDB
 */
const fetchMoviesFromAPI = async () => {
    try {
        const genreList = await fetchGenres();
        const genresMap = {};
        genreList.forEach(({ id, name }) => {
          genresMap[id] = name;
        });
      
        const response = await axios.get(TMDB_MOVIES_URL, {
          params: {
            api_key: config.TMDB_API_KEY, // ✅ This is the v3 method
          },
        });
        

        const movies = response.data.results;
        // Don't delete existing movies, update them or add new ones
        let updatedCount = 0;
        let createdCount = 0;
        
        for (let movie of movies) {
            // Check if the movie already exists in the database
            const existingMovie = await Movie.findOne({ tmdbId: movie.id });

            if (existingMovie) {
                // Update the existing movie
                await Movie.findByIdAndUpdate(existingMovie._id, {
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
                updatedCount++;
            } else {
                // Create a new movie if it doesn't exist
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
                createdCount++;
            }
        }

        console.log(`✅ Movies updated from TMDB: ${updatedCount} updated, ${createdCount} created`);
        return { message: "Movies loaded successfully from TMDb" };
    } catch (error) {
        console.error("🚨 Error fetching movies:", error.message);
        throw new Error("Failed to fetch movies from TMDb");
    }
};

module.exports = { fetchMoviesFromAPI,fetchGenres };
