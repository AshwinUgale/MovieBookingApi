const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const errorHandler = require('./middleware/errorHandler');
const connectDB = require('/config/db');



dotenv.config();


const app = express()

app.use(express.json());
app.use(cors());

connectDB();

app.get('/',(req,res)=>{
    res.send("Movie Booking")
});

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT,()=> console.log(`Server running on port ${PORT}`));
