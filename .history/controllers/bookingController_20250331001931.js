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
                populate: {
                    path: "movie",
                    select: "title posterUrl overview releaseDate"
                }
            })
            .sort({ createdAt: -1 });

        if (!bookings) {
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

        const showtime = await Showtime.findById(showtimeId);
        if (!showtime) {
            return res.status(404).json({ message: "Showtime not found" });
        }

        const selectedIds = seats.map(seat => seat.id);

        // Check for already booked seats with fresh data
        const freshShowtime = await Showtime.findById(showtimeId);
        const alreadyBooked = freshShowtime.availableSeats.filter(seat => selectedIds.includes(seat.id) && seat.booked);
        if (alreadyBooked.length > 0) {
            return res.status(400).json({
                message: `Some seats are already booked: ${alreadyBooked.map(s => s.number).join(", ")}`
            });
        }

        // Lock seats in Redis for concurrency control
        const lockPromises = selectedIds.map(async seatId => {
            const seatKey = `seat:${showtimeId}:${seatId}`;
            const seatLocked = await redisClient.get(seatKey);
            if (seatLocked) {
                throw new Error(`Seat ${seatId} is temporarily locked`);
            }
            return redisClient.set(seatKey, userId.toString(), { EX: 300 }); // 5 minutes lock
        });

        try {
            await Promise.all(lockPromises);
        } catch (error) {
            return res.status(400).json({ message: error.message });
        }

        // Use optimistic locking with version field
        const updatedShowtime = await Showtime.findOneAndUpdate(
            {
                _id: showtimeId,
                version: freshShowtime.version,
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
                },
                $inc: { version: 1 }
            },
            {
                arrayFilters: [{ 'seat.id': { $in: selectedIds } }],
                new: true
            }
        );

        if (!updatedShowtime) {
            // Release Redis locks
            await Promise.all(selectedIds.map(seatId => 
                redisClient.del(`seat:${showtimeId}:${seatId}`)
            ));
            return res.status(409).json({ message: "Seats no longer available. Please try again." });
        }

        // Create booking document
        const booking = new Booking({
            user: userId,
            type: "movie",
            showtime: showtimeId,
            seats,
            paymentStatus: "pending"
        });

        await booking.save();

        // Release Redis locks after successful booking
        await Promise.all(selectedIds.map(seatId => 
            redisClient.del(`seat:${showtimeId}:${seatId}`)
        ));

        // Send confirmation email
        if (userEmail) {
            sendEmail(userEmail, "Booking Confirmation", `Your booking is confirmed. Seats: ${selectedIds.join(", ")}`);
        }
        
        res.status(201).json({ message: "Booking successful", booking });

    } catch (error) {
        console.error("🚨 Booking Error:", error);
        // Release any Redis locks in case of error
        if (selectedIds) {
            await Promise.all(selectedIds.map(seatId => 
                redisClient.del(`seat:${showtimeId}:${seatId}`)
            ));
        }
        res.status(500).json({ message: "Server error" });
    }
};


