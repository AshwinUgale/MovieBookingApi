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
      if (!movie) {
        return res.status(400).json({ message: "Movie ID is required" });
      }
  
      const mongoose = require('mongoose'); // Make sure this is imported at the top
      let existing = await Showtime.find({ movie: new mongoose.Types.ObjectId(movie) });
      
      if (existing.length > 0) return res.json(existing);
  
      console.log("🎬 No existing showtimes found. Generating fake ones...");
  
      const defaultTimes = [
        "2025-03-05T12:00:00",
        "2025-03-05T15:00:00",
        "2025-03-05T18:00:00",
        "2025-03-05T21:00:00",
      ];
  
      // 🔧 Seat generator (6 rows × 8 seats = 48 total)
      const generateSeats = (rows = 12, seatsPerRow = 16) => {
        const seatArray = [];
        const rowLetters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  
        for (let row = 0; row < rows; row++) {
          const rowLetter = rowLetters[row];
          for (let seat = 1; seat <= seatsPerRow; seat++) {
            const seatNumber = `${rowLetter}${seat}`;
            seatArray.push({
              id: seatNumber,       // used as unique identifier
              number: seatNumber,   // what’s displayed on frontend
              type: "Standard",        // 👈 Add a default type
              price: 1,  
              booked: Math.random() < 0.1, // 10% booked
            });
          }
        }
  
        return seatArray;
      };
  
      const fakeShowtimes = defaultTimes.map((time, index) => ({
        movie,
        theater: `Screen ${index + 1}`,
        showtime: new Date(time),
        availableSeats: generateSeats(),
      }));
  
      const created = await Showtime.insertMany(fakeShowtimes);
      res.json(created);
    } catch (error) {
      console.error("❌ Error generating fake showtimes:", error);
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
