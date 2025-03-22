const mongoose = require("mongoose");

const BookingSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ["movie", "event"], required: true }, // ✅ New field to differentiate movie/event bookings
    showtime: { type: mongoose.Schema.Types.ObjectId, ref: "Showtime" }, // Only for movie bookings
    eventId: { type: String }, // Only for Ticketmaster events
    eventDetails: { type: Object }, // Stores event name, date, venue, etc.
    seats: [{
        id: { type: String, required: true },
        number: { type: String, required: true },
        price: { type: Number, default: 1 }
    }],
    paymentStatus: { type: String, enum: ["pending", "paid", "refunded"], default: "pending" },
    canceled: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Booking", BookingSchema);
