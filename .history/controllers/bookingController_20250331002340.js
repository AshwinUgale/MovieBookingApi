const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Showtime = require('../models/Showtime');
const redisClient = require('../config/redis');
const sendEmail = require('../utils/emailService');
const User = require('../models/User');
const { fetchEvents } = require('../services/ticketmasterService');




exports.createEventBooking = async (req, res) => {
    try {
        const { eventId } = req.body;
        const userId = req.user.id;

        if (!eventId) {
            return res.status(400).json({ message: "Event ID is required" });
        }

        // Fetch event details from Ticketmaster
        const events = await fetchEvents(); // Fetches latest events
        const selectedEvent = events.find(event => event.id === eventId);

        if (!selectedEvent) {
            return res.status(404).json({ message: "Event not found in Ticketmaster API" });
        }

        // Create a new booking
        const booking = new Booking({
            user: userId,
            type: "event",
            eventId: selectedEvent.id,
            eventDetails: {
                name: selectedEvent.name,
                date: selectedEvent.date,
                time: selectedEvent.time,
                venue: selectedEvent.venue,
                city: selectedEvent.city,
                image: selectedEvent.image
            },
            paymentStatus: "pending"
        });

        await booking.save();
        res.status(201).json({ message: "Event booking successful", booking });

    } catch (error) {
        console.error("🚨 Event Booking Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};




exports.cancelBooking = async (req, res) => {
    try {
        const { id } = req.params;

        // ✅ Fetch booking details and populate 'user' field for email
        const booking = await Booking.findById(id).populate({
            path: "user",
            select: "email"
        });

        if (!booking) {
            return res.status(404).json({ message: "Booking not found" });
        }

        console.log("🟡 DEBUG: Booking Found:", booking);
        console.log("🟡 DEBUG: User in Booking:", booking.user);

        if (!booking.user || !booking.user.email) {
            console.error("❌ Error: No recipient email provided.");
            return res.status(400).json({ message: "User email is required." });
        }

        const userEmail = booking.user.email;
        console.log("📩 Sending cancellation email to:", userEmail);

        if (booking.canceled) {
            return res.status(400).json({ message: "Booking already canceled" });
        }

        // ✅ Update booking status
        booking.canceled = true;
        booking.paymentStatus = "refunded"; 
        await booking.save();

        // ✅ Determine if it's a Movie or an Event
        let subject = "";
        let message = "";

        if (booking.type === "movie") {
            subject = "Movie Ticket Cancellation";
            message = `Your movie booking (Booking ID: ${booking._id}) has been canceled. Your refund is being processed.`;
        } else if (booking.type === "event") {
            subject = "Event Ticket Cancellation";
            message = `Your event ticket for **${booking.eventDetails.name}** at **${booking.eventDetails.venue}** has been canceled. Your refund is being processed.`;
        } else {
            subject = "Booking Cancellation";
            message = `Your booking (ID: ${booking._id}) has been canceled. Your refund is being processed.`;
        }

        // ✅ Send cancellation email
        sendEmail(userEmail, subject, message);

        res.status(200).json({ message: "Booking canceled and refunded", booking });

    } catch (error) {
        console.error("🚨 Error canceling booking:", error);
        res.status(500).json({ message: "Server error" });
    }
};



exports.getUserBookings = async (req, res) => {
    try {
        const userId = req.user.id;

        const bookings = await Booking.find({ user: userId })
            .populate({
                path: "showtime",
                select: "movie theater showtime availableSeats version",
                populate: {
                    path: "movie",
                    model: "Movie",
                    select: "title posterUrl overview releaseDate"
                }
            })
            .sort({ createdAt: -1 });

        // Log for debugging
        console.log("🔍 Fetched Bookings:", JSON.stringify(bookings, null, 2));

        if (!bookings || bookings.length === 0) {
            return res.status(404).json({ message: "No bookings found" });
        }

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
    const lockKeys = [];
    try {
        const { showtimeId, seats } = req.body;
        const userId = req.user?.id;
        const userEmail = req.user?.email;

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized: User ID is missing" });
        }

        if (!Array.isArray(seats) || seats.length === 0) {
            return res.status(400).json({ message: "No seats selected for booking" });
        }

        // First, get the showtime details
        const showtime = await Showtime.findById(showtimeId).populate('movie');
        if (!showtime) {
            return res.status(404).json({ message: "Showtime not found" });
        }

        console.log("🎬 Found showtime:", { id: showtime._id, movie: showtime.movie?.title });

        const selectedIds = seats.map(seat => seat.id);

        // Check if seats exist and are available
        const existingSeats = showtime.availableSeats.filter(seat => selectedIds.includes(seat.id));
        if (existingSeats.length !== selectedIds.length) {
            return res.status(400).json({ message: "One or more selected seats do not exist" });
        }

        const bookedSeats = existingSeats.filter(seat => seat.booked);
        if (bookedSeats.length > 0) {
            return res.status(400).json({
                message: `Seats already booked: ${bookedSeats.map(s => s.number).join(", ")}`
            });
        }

        // Acquire Redis locks for all seats
        console.log("🔒 Attempting to acquire locks for seats:", selectedIds);
        
        try {
            for (const seatId of selectedIds) {
                const lockKey = `lock:${showtimeId}:${seatId}`;
                const acquired = await redisClient.set(lockKey, userId, {
                    NX: true, // Only set if key doesn't exist
                    EX: 30 // 30 seconds expiry
                });
                
                if (!acquired) {
                    throw new Error(`Seat ${seatId} is being booked by another user`);
                }
                lockKeys.push(lockKey);
            }
            console.log("✅ Successfully acquired all locks");
        } catch (error) {
            // Release any acquired locks before throwing error
            console.log("❌ Failed to acquire all locks:", error.message);
            await Promise.all(lockKeys.map(key => redisClient.del(key)));
            return res.status(409).json({ message: error.message });
        }

        // Update seats in database
        console.log("💾 Updating seats in database");
        const result = await Showtime.findOneAndUpdate(
            {
                _id: showtimeId,
                'availableSeats': {
                    $elemMatch: {
                        'id': { $in: selectedIds },
                        'booked': false
                    }
                }
            },
            {
                $set: {
                    'availableSeats.$[seat].booked': true
                }
            },
            {
                arrayFilters: [{ 'seat.id': { $in: selectedIds } }],
                new: true
            }
        );

        if (!result) {
            console.log("❌ Failed to update seats in database");
            // Release locks before returning error
            await Promise.all(lockKeys.map(key => redisClient.del(key)));
            return res.status(409).json({ message: "Failed to book seats. Please try again." });
        }

        // Create booking document
        console.log("📝 Creating booking document");
        const booking = new Booking({
            user: userId,
            type: "movie",
            showtime: showtimeId,
            seats: seats.map(seat => ({
                id: seat.id,
                number: seat.number,
                price: seat.price || 1
            })),
            paymentStatus: "pending"
        });

        await booking.save();
        console.log("✅ Booking saved successfully:", booking._id);

        // Release all locks after successful booking
        console.log("🔓 Releasing all locks");
        await Promise.all(lockKeys.map(key => redisClient.del(key)));

        // Send confirmation email
        if (userEmail) {
            console.log("📧 Sending confirmation email to:", userEmail);
            sendEmail(userEmail, "Booking Confirmation", 
                `Your booking is confirmed for ${showtime.movie?.title}. Seats: ${seats.map(s => s.number).join(", ")}`
            );
        }
        
        // Return populated booking data
        console.log("📤 Fetching populated booking data");
        const populatedBooking = await Booking.findById(booking._id)
            .populate({
                path: "showtime",
                populate: {
                    path: "movie",
                    select: "title posterUrl overview releaseDate"
                }
            });

        console.log("✅ Booking process completed successfully");
        res.status(201).json({ 
            message: "Booking successful", 
            booking: populatedBooking
        });

    } catch (error) {
        console.error("🚨 Booking Error:", error);
        // Release any locks in case of error
        if (lockKeys.length > 0) {
            console.log("🔓 Releasing locks due to error");
            await Promise.all(lockKeys.map(key => redisClient.del(key)));
        }
        res.status(500).json({ message: "Server error" });
    }
};


