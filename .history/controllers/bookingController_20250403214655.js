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

// ... rest of the existing code ...