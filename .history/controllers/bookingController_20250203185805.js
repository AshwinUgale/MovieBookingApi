const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Showtime = require('../models/Showtime');
const redisClient = require('../config/redis');



exports.getAllBookings = async (req, res) => {
    try {
        const bookings = await Booking.find().populate('user', 'name email').populate('showtime');
        res.status(200).json(bookings);
    } catch (error) {
        console.error("Error fetching bookings:", error);
        res.status(500).json({ message: "Server error" });
    }
};


exports.getBookingById = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id).populate('user', 'name email').populate('showtime');
        if (!booking) {
            return res.status(404).json({ message: "Booking not found" });
        }
        res.status(200).json(booking);
    } catch (error) {
        console.error("Error fetching booking:", error);
        res.status(500).json({ message: "Server error" });
    }
};




exports.createBooking = async (req, res) => {
    try {
        const { showtimeId, seats } = req.body;
        const userId = req.user ? req.user.id : null;

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized: User ID is missing" });
        }

        let showtime = await Showtime.findById(showtimeId);
        if (!showtime) {
            return res.status(404).json({ message: "Showtime not found" });
        }

       
        const invalidSeats = seats.filter(seat => !showtime.availableSeats.includes(seat));
        if (invalidSeats.length > 0) {
            return res.status(400).json({
                message: `Invalid seat(s): ${invalidSeats.join(", ")}. Please select from available seats: ${showtime.availableSeats.join(", ")}`,
            });
        }

  
        if (seats.length > showtime.availableSeats.length) {
            return res.status(400).json({
                message: `Not enough seats available. Only ${showtime.availableSeats.length} left.`,
            });
        }

        
        for (const seat of seats) {
            console.log(`🔍 Checking seat:`, seat);
            const seatKey = `seat:${showtimeId}:${seat}`;

            const seatLocked = await redisClient.get(seatKey);
            if (seatLocked) {
                console.log(`🚨 Seat ${seat} is locked in Redis.`);
                return res.status(400).json({ message: `Seat ${seat} is temporarily locked` });
            }

            await redisClient.set(seatKey, userId.toString(), { EX: 300 }); 
        }

       

      
        const unavailableSeats = seats.some(seat => !showtime.availableSeats.includes(seat));
        if (unavailableSeats) {
            return res.status(400).json({ message: "Some seats are already booked" });
        }

    
        const oldVersion = showtime.version;
        showtime.availableSeats = showtime.availableSeats.filter(seat => !seats.includes(seat));
        showtime.version += 1;

        const updatedShowtime = await Showtime.findOneAndUpdate(
            { _id: showtimeId, version: oldVersion }, 
            { availableSeats: showtime.availableSeats, version: showtime.version },
            { new: true }
        );

        if (!updatedShowtime) {
            return res.status(409).json({ message: "Booking conflict. Try again." });
        }

        const booking = new Booking({ user: userId, showtime: showtimeId, seats, paymentStatus: "pending" });
        await booking.save();

        res.status(201).json({ message: "Booking successful", booking });

    } catch (error) {
        console.error("🚨 Booking Error:", error);

       
        for (const seat of seats) {
            const seatKey = `seat:${showtimeId}:${seat}`;
            await redisClient.del(seatKey);
        }

        res.status(500).json({ message: "Server error" });
    }
};
