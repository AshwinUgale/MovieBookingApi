const express = require('express');
const router = express.Router();
const {
    getMovies,
    getMovieById,
    updateMovie,
    deleteMovie,
    loadMoviesFromTMDB,
    getMovieGenres
    
} = require('../controllers/movieController');
const { adminAuth } = require('../middleware/authMiddleware'); // Admin-only middleware

// Public Routes
router.get('/', getMovieGenres); // Anyone can view all movies
router.get('/:id', getMovieById); // Anyone can view a specific movie
router.get("/genres", (req, res, next) => {
    console.log("✅ /api/movies/genres route hit! Passing to controller...");
    getMovieGenres(req, res, next);
});

// Admin-Only Routes

router.put('/:id', adminAuth, updateMovie); // Only admins can update movies
router.delete('/:id', adminAuth, deleteMovie); // Only admins can delete movies
router.post("/fetch-movies", adminAuth, loadMoviesFromTMDB);

module.exports = router;
