const Movie = require('../models/Movie');

exports.getMovies = async (req,res)=>{
    try{
        const movies = await Movie.find();
        res.json(movies);
    } catch (error) {
        res.status(500).json({message:'Server Error'});
    }
};

exports.getMovieById = async (req,res)=>{
    try{
        const movie = await Movie.findById(req.params.id);
        if (!movie) return res.status(404).json({ message: 'Movie not found'});
        res.json(movie);
    }catch(error){
        res.status(500).json({message:'Server error'});
    }
};

exports.createMovie = async (req,res)=>{
    const {title,description,genre,duration,releaseDate} = req.body;
    try{
        const newMovie = new Movie({title,description,genre,duration,releaseDate});
        await newMovie.save();
        res.status(201).json(newMovie);
    } catch(error){
        res.status(500).json({message: 'Server error'});
    }
};


exports.updateMovie = async (req,res)=>{
    try{
        const updatedMovie = await Movie.findByIdAndUpdate(req.params.id,req.body,{new:true});
        if (!updatedMovie) return res.status(404).json({message:'Movie not found'});
        res.json(updatedMovie);
    } catch (error){
        res.status(500).json({message: 'Server error'});
    }
};

exports.deleteMovie = async (req, res) => {
    try {
        const deletedMovie = await Movie.findByIdAndDelete(req.params.id);
        if (!deletedMovie) return res.status(404).json({ message: 'Movie not found' });
        res.json({ message: 'Movie deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};