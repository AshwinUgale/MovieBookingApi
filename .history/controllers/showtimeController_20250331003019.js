const Showtime = require('../models/Showtime');
const Booking = require('../models/Booking');

// Get all showtimes
exports.getShowtimes = async (req, res) => {
    try {
        const { movie } = req.query;  

        let query = {};
        if (movie) {
            query.movie = movie;  
        }
    
        // Get showtimes with populated movie data - don't modify the seats
        const showtimes = await Showtime.find(query)
            .populate('movie', 'title posterUrl overview releaseDate'); 
        
        if (!showtimes || showtimes.length === 0) {
            console.log("No showtimes found for query:", query);
            return res.status(404).json({ message: "No showtimes found" });
        }
        
        console.log(`Found ${showtimes.length} showtimes`);
        res.json(showtimes);
    } catch (error) {
        console.error("Error fetching showtimes:", error);
        res.status(500).json({ message: 'Server error' });
    }
};


exports.getOrCreateFakeShowtimes = async (req, res) => {
    try {
        const { movie } = req.query;
        if (!movie) {
            return res.status(400).json({ message: "Movie ID is required" });
        }
  
        const mongoose = require('mongoose');
        
        // Check for existing showtimes - we'll reuse them if they exist
        const existingShowtimes = await Showtime.find({ 
            movie: new mongoose.Types.ObjectId(movie) 
        }).populate('movie', 'title posterUrl');
        
        // If showtimes already exist, simply return them without modification
        if (existingShowtimes && existingShowtimes.length > 0) {
            console.log(`✅ Found ${existingShowtimes.length} existing showtimes for this movie`);
            return res.json(existingShowtimes);
        }
        
        // If no showtimes exist, generate new ones
        console.log("🎬 Generating new showtimes for movie ID:", movie);
  
        const defaultTimes = [
            "2025-03-05T12:00:00",
            "2025-03-05T15:00:00",
            "2025-03-05T18:00:00",
            "2025-03-05T21:00:00",
        ];
  
        // Generate seats - all initially available
        const generateSeats = (rows = 12, seatsPerRow = 16) => {
            const seatArray = [];
            const rowLetters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  
            for (let row = 0; row < rows; row++) {
                const rowLetter = rowLetters[row];
                for (let seat = 1; seat <= seatsPerRow; seat++) {
                    const seatNumber = `${rowLetter}${seat}`;
                    seatArray.push({
                        id: seatNumber,
                        number: seatNumber,
                        type: seat % 5 === 0 ? "Premium" : "Standard",
                        price: seat % 5 === 0 ? 2 : 1,
                        booked: false // All seats start unbooked
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
            version: 0
        }));
  
        // Save the new showtimes permanently
        const created = await Showtime.insertMany(fakeShowtimes);
        
        // Populate movie details before returning
        const populatedShowtimes = await Showtime.find({
            _id: { $in: created.map(s => s._id) }
        }).populate('movie', 'title posterUrl');
        
        console.log(`✅ Created ${created.length} new showtimes for movie ID: ${movie}`);
        res.json(populatedShowtimes);
    } catch (error) {
        console.error("❌ Error with showtimes:", error);
        res.status(500).json({ message: "Server error" });
    }
};
  
  



exports.getShowtimeById = async (req, res) => {
    try {
        const { showtimeId } = req.params;
        const Booking = require('../models/Booking'); // Make sure Booking is loaded
        
        // Get the showtime and populate movie details
        const showtime = await Showtime.findById(showtimeId).populate('movie');

        if (!showtime) {
            return res.status(404).json({ message: "Showtime not found" });
        }
        
        // Sync with active bookings to ensure seat status is accurate
        const bookings = await Booking.find({ 
            showtime: showtimeId, 
            canceled: { $ne: true } 
        });
        
        // Get all seat IDs that have been booked
        const bookedSeatIds = new Set();
        bookings.forEach(booking => {
            booking.seats.forEach(seat => bookedSeatIds.add(seat.id));
        });
        
        // If we have bookings, update the seat status directly in the response
        // and also persist the changes to the database
        if (bookedSeatIds.size > 0) {
            console.log(`📋 Ensuring ${bookedSeatIds.size} booked seats are marked correctly for showtime ${showtime._id}`);
            
            // Update the showtime object for the response
            showtime.availableSeats = showtime.availableSeats.map(seat => {
                if (bookedSeatIds.has(seat.id)) {
                    seat.booked = true;
                }
                return seat;
            });
            
            // Also update the database to make the change permanent
            await Showtime.findByIdAndUpdate(
                showtimeId, 
                { 
                    $set: { availableSeats: showtime.availableSeats },
                    $inc: { version: 1 }
                }
            );
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
