const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Showtime = require('../models/Showtime');
const redisClient = require('../config/redis');

exports.createBooking = async (req,res)=>{
    const session = await mongoose.startSession()
    session.startTransaction();

    try{
        const { showtimeId, seats } = req.body;
        const userId = req.user ? req.user.id : null; // ✅ Check if userId exists

        console.log("🔍 Debugging createBooking:");
        console.log("➡️ showtimeId:", showtimeId);
        console.log("➡️ userId:", userId);
        console.log("➡️ seats:", seats);

        if (!userId) {
            throw new Error("User ID is undefined. Authentication might be missing.");
        }

        if (!showtimeId) {
            throw new Error("showtimeId is undefined. Make sure you're sending it in the request.");
        }

        if (!seats || seats.length === 0) {
            throw new Error("No seats selected. Please provide at least one seat.");
        }
        for (const seat in seats){
            const seatKey = `seat:${showtimeId}:${seat}`;
            const seatLocked = await redisClient.get(seatKey);
            if(seatLocked){
                await session.abortTransaction();
                return res.status(400).json({message:`Seat${seat} is temporarily locked`});
            }
        }

        for(const seat in seats){
            const seatKey = `seat:${showtimeId}:${seat}`;
            await redisClient.set(seatKey, userId.toString(), { EX: 300 });

        }


        let showtime = await Showtime.findOne({_id:showtimeId}).session(session);
        if(!showtime){
            await session.abortTransaction();
            return res.status(404).json({message:'Showtime not found'});
        }

        const unavailableSeats = seats.some(seat => !showtime.availableSeats.includes(seat));
        if (unavailableSeats) {
            await session.abortTransaction();
            return res.status(400).json({ message: 'Some seats are already booked' });
        }

        const oldVersion = showtime.version;
        showtime.availableSeats = showtime.availableSeats.filter(seat => !seats.includes(seat));
        showtime.version += 1;

        const updatedShowtime = await Showtime.findOneAndUpdate(
            { _id: showtimeId, version: oldVersion },
            { availableSeats: showtime.availableSeats, version: showtime.version },
            { new: true, session }
        );

        if (!updatedShowtime) {
            await session.abortTransaction();
            return res.status(409).json({ message: 'Booking conflict. Try again.' });
        }

        
        const booking = new Booking({ user: userId, showtime: showtimeId, seats, paymentStatus: 'pending' });
        await booking.save({ session });

        await session.commitTransaction();
        res.status(201).json({ message: 'Booking successful', booking });

    }catch (error) {
        await session.abortTransaction();
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    } finally {
        session.endSession();
    }



};