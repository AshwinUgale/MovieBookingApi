const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Showtime = require('../models/Showtime');
const redisClient = require('../config/redis');

exports.createBooking = async (req,res)=>{
 

    try{
        const { showtimeId, seats } = req.body;
        const userId = req.user ? req.user.id : null;

       
        for (const seat of seats) {
            console.log(`🔍 Checking seat:`, seat);  // ✅ Debugging Log
            const seatKey = `seat:${showtimeId}:${seat}`;
        
            const seatLocked = await redisClient.get(seatKey);
            if (seatLocked) {
                
                console.log(`🚨 Seat ${seat} is locked in Redis.`);
                return res.status(400).json({ message: `Seat ${seat} is temporarily locked` });
            }
        
            await redisClient.set(seatKey, userId.toString(), { EX: 300 }); // Lock seat for 5 min
        }
        


        let showtime = await Showtime.findOne({_id:showtimeId}).session(session);
        if(!showtime){
            
            return res.status(404).json({message:'Showtime not found'});
        }

        const unavailableSeats = seats.some(seat => !showtime.availableSeats.includes(seat));
        if (unavailableSeats) {
            
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
            
            return res.status(409).json({ message: 'Booking conflict. Try again.' });
        }

        
        const booking = new Booking({ user: userId, showtime: showtimeId, seats, paymentStatus: 'pending' });
        await booking.save({ session });

       
        res.status(201).json({ message: 'Booking successful', booking });

    }catch (error) {
       
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    } 



};