const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const errorHandler = require('./middleware/errorHandler');
const connectDB = require('./config/db');

const authRoutes = require('./routes/authRoutes');
const movieRoutes = require('./routes/movieRoutes')

dotenv.config();


const app = express()

app.use(express.json());
app.use(cors());

connectDB();

app.get('/',(req,res)=>{
    res.send("Movie Booking")
});

app.use(errorHandler);
app.use('/api/auth', authRoutes);
app.use('/api/movies', movieRoutes);


const PORT = process.env.PORT || 5000;
app.listen(PORT,()=> console.log(`Server running on port ${PORT}`));
