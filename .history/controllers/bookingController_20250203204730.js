const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Showtime = require('../models/Showtime');
const redisClient = require('../config/redis');
const sendEmail = require('../utils/emailService');



exports.cancelBooking = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);

        if (!booking) {
            return res.status(404).json({ message: "Booking not found" });
        }

   
        if (booking.canceled) {
            return res.status(400).json({ message: "Booking already canceled" });
        }

        booking.canceled = true;
        booking.paymentStatus = "refunded"; 
        await booking.save();

        sendEmail(booking.user.email, "Booking Cancellation", `Your booking ${booking._id} has been canceled. Refund will be processed shortly.`);

        res.status(200).json({ message: "Booking canceled and refunded", booking });

    } catch (error) {
        console.error("Error canceling booking:", error);
        res.status(500).json({ message: "Server error" });
    }
};



exports.getUserBookings = async (req, res) => {
    try {
        const userId = req.user.id;

        const bookings = await Booking.find({ user: userId })
            .populate('showtime')
            .sort({ createdAt: -1 });

        res.status(200).json(bookings);
    } catch (error) {
        console.error("Error fetching user bookings:", error);
        res.status(500).json({ message: "Server error" });
    }
};



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
        const userEmail = req.user.email;

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

        sendEmail(req.user.email, "Booking Confirmation", `Your booking for showtime ${showtime._id} is confirmed. Seats: ${seats.join(", ")}`);
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
