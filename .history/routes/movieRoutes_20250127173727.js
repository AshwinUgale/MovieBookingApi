const express = require('express');
const router = express.Router();

const {
    getMovies,
    getMovieById,
    createMovie,
    updateMovie,
    deleteMovie
} = require('../controllers/movieController');