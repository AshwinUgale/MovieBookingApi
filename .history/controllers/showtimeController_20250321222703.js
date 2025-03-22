const Showtime = require('../models/Showtime');

// Get all showtimes
exports.getShowtimes = async (req, res) => {
    try {
        const { movie } = req.query;  

        let query = {};
        if (movie) {
            query.movie = movie;  
        }
    
        const showtimes = await Showtime.find(query).populate('movie', 'title'); // Populates movie title
        res.json(showtimes);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};


exports.getOrCreateFakeShowtimes = async (req, res) => {
    try {
      const { movie } = req.query;
      if (!movie) return res.status(400).json({ message: "Movie ID is required" });
  
      let showtimes = await Showtime.find({ movie });
      if (showtimes.length > 0) return res.json(showtimes);
  
      const fakeShowtimes = [
        { movie, theater: "Screen 1", showtime: new Date("2025-03-05T12:00:00"), availableSeats: Array.from({ length: 30 }, (_, i) => i + 1) },
        { movie, theater: "Screen 2", showtime: new Date("2025-03-05T15:00:00"), availableSeats: Array.from({ length: 30 }, (_, i) => i + 31) },
        { movie, theater: "Screen 3", showtime: new Date("2025-03-05T18:00:00"), availableSeats: Array.from({ length: 30 }, (_, i) => i + 61) },
      ];
  
      const createdShowtimes = await Showtime.insertMany(fakeShowtimes);
      res.json(createdShowtimes);
    } catch (err) {
      console.error("❌ Error in fallback showtime creation:", err);
      res.status(500).json({ message: "Server error" });
    }
  };
  




exports.getShowtimeById = async (req, res) => {
    try {
        const { showtimeId } = req.params;
        const showtime = await Showtime.findById(showtimeId);

        if (!showtime) {
            return res.status(404).json({ message: "Showtime not found" });
        }

        res.status(200).json(showtime);
    } catch (error) {
        console.error("Error fetching showtime:", error);
        res.status(500).json({ message: "Server error" });
    }
};


// Create a new showtime
exports.createShowtime = async (req, res) => {
    let { movie, theater, showtime, availableSeats } = req.body;
    try {
        // Validate required fields
        if (!movie || !theater || !showtime || availableSeats == null) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        if (!movie.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({ message: "Invalid movie ID format" });
        }

        // Convert availableSeats from string to array of numbers (fix for validation error)
        if (typeof availableSeats === "string") {
            availableSeats = availableSeats.split(",").map(seat => Number(seat.trim())); // Convert "1,2,3" → [1,2,3]
        }
        // Create new showtime
        const newShowtime = new Showtime({ movie, theater, showtime, availableSeats });
        await newShowtime.save();
        res.status(201).json(newShowtime);
    } catch (error) {
        console.error("Error creating showtime:", error.message);
        res.status(500).json({ message: 'Server error' });
    }
};
