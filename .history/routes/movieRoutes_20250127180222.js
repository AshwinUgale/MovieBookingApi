const express = require('express');
const router = express.Router();
const {
    getMovies,
    getMovieById,
    createMovie,
    updateMovie,
    deleteMovie
} = require('../controllers/movieController');
const { auth, adminAuth } = require('../middleware/authMiddleware');

// Movie CRUD routes
router.get('/', auth, getMovies); // Public: Authenticated users can view movies
router.get('/:id', auth, getMovieById); // Public: Authenticated users can view movie details
router.post('/', adminAuth, createMovie); // Restricted: Admins can add movies
router.put('/:id', adminAuth, updateMovie); // Restricted: Admins can update movies
router.delete('/:id', adminAuth, deleteMovie); // Restricted: Admins can delete movies

module.exports = router;
