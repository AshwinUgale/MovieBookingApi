const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const errorHandler = require('./middleware/errorHandler');
const connectDB = require('./config/db');
const listEndpoints = require("express-list-endpoints");


const authRoutes = require('./routes/authRoutes');
const movieRoutes = require('./routes/movieRoutes');
const showtimeRoutes = require('./routes/showtimeRoutes');
const bookingRoutes = require('./routes/bookingRoutes');

const ticketmasterRoutes = require("./routes/ticketmasterRoutes");

const paymentRoutes = require('./routes/paymentRoutes');
dotenv.config();

// const testRedisRoutes = require('./routes/testRedis'); // adjust path
// app.use('/', testRedisRoutes);

 
  


const app = express()
app.get('/ping-db', async (req, res) => {
    const mongoose = require('mongoose');
    try {
      await mongoose.connection.db.admin().ping();
      res.send('✅ MongoDB is alive');
    } catch (e) {
      console.error(e);
      res.status(500).send('❌ MongoDB connection failed');
    }
  });
  
app.use(express.json());
app.use(cors());

connectDB();

app.get('/',(req,res)=>{
    res.send("Movie Booking")
});

app.use(errorHandler);
app.use('/api/auth', authRoutes);
app.use('/api/movies', movieRoutes);
app.use('/api/showtimes',showtimeRoutes);
app.use('/api/bookings', bookingRoutes); 
app.use('/api/payments', paymentRoutes);
app.use("/api/ticketmaster", ticketmasterRoutes);

app.use((req, res, next) => {
    res.status(404).json({ message: 'Route not found' });
});

// Error Handling Middleware
app.use(errorHandler);




const PORT = process.env.PORT || 5000;
app.listen(PORT,()=> console.log(`Server running on port ${PORT}`));
console.log("📌 Registered Routes:");
console.table(listEndpoints(app));

