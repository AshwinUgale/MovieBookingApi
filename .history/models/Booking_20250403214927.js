const mongoose = require("mongoose");
const Showtime = require("./Showtime"); // Add Showtime model

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
    paymentStatus: { type: String, enum: ["pending", "paid", "refunded", "failed"], default: "pending" },
    paypalPaymentId: { type: String }, // Store PayPal payment ID
    canceled: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

// Post-save hook to ensure seats are marked as booked
BookingSchema.post('save', async function(doc) {
    try {
        // Only process movie bookings with showtime and seats
        if (doc.type === 'movie' && doc.showtime && doc.seats && doc.seats.length > 0) {
            console.log(`🎬 Post-save: Updating seats for booking ${doc._id}`);
            
            // Skip if the booking is canceled
            if (doc.canceled) {
                console.log(`🎬 Booking ${doc._id} is canceled, not marking seats as booked`);
                return;
            }
            
            // Get seat IDs from the booking
            const seatIds = doc.seats.map(seat => seat.id);
            
            // Update the showtime to mark seats as booked
            const result = await Showtime.findOneAndUpdate(
                { _id: doc.showtime },
                {
                    $set: { 'availableSeats.$[seat].booked': true },
                    $inc: { version: 1 }
                },
                {
                    arrayFilters: [{ 'seat.id': { $in: seatIds } }]
                }
            );
            
            if (!result) {
                console.warn(`⚠️ Failed to mark seats as booked for booking ${doc._id}`);
            } else {
                console.log(`✅ Successfully marked seats as booked for booking ${doc._id}`);
            }
        }
    } catch (error) {
        console.error('Error in Booking post-save hook:', error);
    }
});

// Post-save hook to handle booking cancellations
BookingSchema.post('findOneAndUpdate', async function(doc) {
    try {
        // Check if this is a cancellation
        if (doc && doc.canceled && doc.type === 'movie' && doc.showtime && doc.seats && doc.seats.length > 0) {
            console.log(`🎬 Post-update: Releasing seats for canceled booking ${doc._id}`);
            
            // Get seat IDs from the booking
            const seatIds = doc.seats.map(seat => seat.id);
            
            // Update the showtime to mark seats as available
            const result = await Showtime.findOneAndUpdate(
                { _id: doc.showtime },
                {
                    $set: { 'availableSeats.$[seat].booked': false },
                    $inc: { version: 1 }
                },
                {
                    arrayFilters: [{ 'seat.id': { $in: seatIds } }]
                }
            );
            
            if (!result) {
                console.warn(`⚠️ Failed to release seats for canceled booking ${doc._id}`);
            } else {
                console.log(`✅ Successfully released seats for canceled booking ${doc._id}`);
            }
        }
    } catch (error) {
        console.error('Error in Booking post-update hook:', error);
    }
});

module.exports = mongoose.model("Booking", BookingSchema);