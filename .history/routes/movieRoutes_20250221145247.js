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

router.get("/genres",getMovieGenres);
// Public Routes
router.get('/', getMovies); // Anyone can view all movies
router.get('/:id', getMovieById); // Anyone can view a specific movie


// Admin-Only Routes

router.put('/:id', adminAuth, updateMovie); // Only admins can update movies
router.delete('/:id', adminAuth, deleteMovie); // Only admins can delete movies
router.post("/fetch-movies", adminAuth, loadMoviesFromTMDB);

module.exports = router;
