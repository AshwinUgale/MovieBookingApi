const Showtime = require('../models/Showtime');
const Booking = require('../models/Booking');

// Get all showtimes
exports.getShowtimes = async (req, res) => {
    try {
        const { movie } = req.query;  
        const Booking = require('../models/Booking');

        let query = {};
        if (movie) {
            query.movie = movie;  
        }
    
        // Get showtimes with populated movie data
        const showtimes = await Showtime.find(query).populate('movie', 'title posterUrl'); 
        
        // For each showtime, sync with booking data
        for (const showtime of showtimes) {
            // Get active bookings for this showtime
            const bookings = await Booking.find({ 
                showtime: showtime._id, 
                canceled: { $ne: true } 
            });
            
            // Get all seat IDs that have been booked
            const bookedSeatIds = new Set();
            bookings.forEach(booking => {
                booking.seats.forEach(seat => bookedSeatIds.add(seat.id));
            });
            
            // If there are bookings, ensure seats are marked correctly
            if (bookedSeatIds.size > 0) {
                // Update seat data in the showtimes object
                let hasUpdates = false;
                showtime.availableSeats = showtime.availableSeats.map(seat => {
                    if (bookedSeatIds.has(seat.id) && !seat.booked) {
                        hasUpdates = true;
                        seat.booked = true;
                    }
                    return seat;
                });
                
                // If any seats needed to be updated, save changes to database
                if (hasUpdates) {
                    await Showtime.findByIdAndUpdate(
                        showtime._id, 
                        { 
                            $set: { availableSeats: showtime.availableSeats },
                            $inc: { version: 1 }
                        }
                    );
                }
            }
        }
        
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
      
      // Check for existing showtimes
      let existingShowtimes = await Showtime.find({ movie: new mongoose.Types.ObjectId(movie) })
        .populate('movie', 'title');
      
      // If showtimes exist, return them but ensure bookings are respected
      if (existingShowtimes.length > 0) {
        console.log(`✅ Found ${existingShowtimes.length} existing showtimes for movie`);
        
        // For each showtime, get all bookings and make sure seats show as booked
        for (const showtime of existingShowtimes) {
          // Get all bookings for this showtime
          const bookings = await Booking.find({ 
            showtime: showtime._id, 
            canceled: { $ne: true } 
          });
          
          // Get all seat IDs that have been booked
          const bookedSeatIds = new Set();
          bookings.forEach(booking => {
            booking.seats.forEach(seat => bookedSeatIds.add(seat.id));
          });
          
          // Make sure all booked seats are marked as booked
          if (bookedSeatIds.size > 0) {
            console.log(`📋 Ensuring ${bookedSeatIds.size} booked seats are marked correctly for showtime ${showtime._id}`);
            
            // Update the showtime document in-place to ensure consistency
            const seatUpdates = showtime.availableSeats.map(seat => {
              if (bookedSeatIds.has(seat.id)) {
                return { ...seat, booked: true };
              }
              return seat;
            });
            
            await Showtime.findByIdAndUpdate(
              showtime._id, 
              { 
                $set: { availableSeats: seatUpdates },
                $inc: { version: 1 }
              }
            );
          }
        }
        
        // Get the updated showtimes
        existingShowtimes = await Showtime.find({ movie: new mongoose.Types.ObjectId(movie) })
          .populate('movie', 'title');
          
        return res.json(existingShowtimes);
      }
  
      console.log("🎬 No existing showtimes found. Generating fake ones...");
  
      const defaultTimes = [
        "2025-03-05T12:00:00",
        "2025-03-05T15:00:00",
        "2025-03-05T18:00:00",
        "2025-03-05T21:00:00",
      ];
  
      // 🔧 Seat generator (12 rows × 16 seats)
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
              type: seat % 5 === 0 ? "Premium" : "Standard",  // Make every 5th seat premium
              price: seat % 5 === 0 ? 2 : 1,
              booked: false, // Initially no seats are booked
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
  
      const created = await Showtime.insertMany(fakeShowtimes);
      res.json(created);
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
