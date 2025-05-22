const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Showtime = require('../models/Showtime');
const sendEmail = require('../utils/emailService');
const User = require('../models/User');
const { fetchEvents } = require('../services/ticketmasterService');
const paypalService = require('../services/paypalservice');


// ... existing code ...

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
                image: selectedEvent.image,
                price: selectedEvent.price || 10 // Default price if not set
            },
            paymentStatus: "pending"
        });

        await booking.save();

        // Initiate payment
        const paymentData = await paypalService.createPayment(booking);

        res.status(201).json({ 
            message: "Event booking created", 
            booking,
            paymentUrl: paymentData.approvalUrl
        });

    } catch (error) {
        console.error("🚨 Event Booking Error:", error);
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

        // Get showtime with movie data
        const showtime = await Showtime.findById(showtimeId).populate('movie');
        if (!showtime) {
            return res.status(404).json({ message: "Showtime not found" });
        }

        console.log("🎬 Found showtime:", { id: showtime._id, movie: showtime.movie?.title || 'Unknown movie' });

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

        // Create booking document
        console.log("📝 Creating booking document");
        const booking = new Booking({
            user: userId,
            type: "movie",
            showtime: showtimeId,
            seats: seats.map(seat => ({
                id: seat.id,
                number: seat.number,
                price: seat.price || 10 // Default price if not set
            })),
            paymentStatus: "pending"
        });

        await booking.save();
        console.log("✅ Booking saved successfully:", booking._id);

        // Initiate payment
        const paymentData = await paypalService.createPayment(booking);
        booking.paypalPaymentId = paymentData.id; // Store PayPal ID returned
        await booking.save(); // Save again with updated info


        // Return populated booking data with payment URL
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
            message: "Booking created", 
            booking: populatedBooking,
            paymentUrl: paymentData.approvalUrl
        });

    } catch (error) {
        console.error("🚨 Booking Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};




exports.cancelBooking = async (req, res) => {
    try {
        const { id } = req.params;

        // Fetch booking details and populate related data
        const booking = await Booking.findById(id)
            .populate({
                path: "user",
                select: "email"
            })
            .populate({
                path: "showtime",
                populate: {
                    path: "movie",
                    select: "title"
                }
            });

        if (!booking) {
            return res.status(404).json({ message: "Booking not found" });
        }

        console.log("🟡 DEBUG: Booking Found:", booking._id);

        if (!booking.user || !booking.user.email) {
            console.error("❌ Error: No recipient email provided.");
            return res.status(400).json({ message: "User email is required." });
        }

        if (booking.canceled) {
            return res.status(400).json({ message: "Booking already canceled" });
        }

        // Update booking status - this will trigger the post-update hook in the model
        booking.canceled = true;
        booking.paymentStatus = "refunded"; 
        await booking.save();

        console.log("✅ Booking marked as canceled:", booking._id);

        // Determine email content
        let subject = "";
        let message = "";
        const userEmail = booking.user.email;

        if (booking.type === "movie") {
            const movieTitle = booking.showtime?.movie?.title || 'your movie';
            subject = "Movie Ticket Cancellation";
            message = `Your booking for ${movieTitle} (Booking ID: ${booking._id}) has been canceled. Your refund is being processed.`;
        } else if (booking.type === "event") {
            subject = "Event Ticket Cancellation";
            message = `Your event ticket for ${booking.eventDetails.name} at ${booking.eventDetails.venue} has been canceled. Your refund is being processed.`;
        } else {
            subject = "Booking Cancellation";
            message = `Your booking (ID: ${booking._id}) has been canceled. Your refund is being processed.`;
        }

        // Send cancellation email
        console.log("📩 Sending cancellation email to:", userEmail);
        sendEmail(userEmail, subject, message);

        res.status(200).json({ 
            message: "Booking canceled and refund initiated", 
            booking 
        });

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





