const dotenv = require('dotenv');

dotenv.config();
module.exports = {
    port: process.env.PORT || 5000,
    mongoURI: process.env.MONGO_URI,
    jwtSecret: process.env.JWT_SECRET,
    TMDB_API_KEY: process.env.TMDB_API_KEY,
    TICKETMASTER_API_KEY: process.env.TICKETMASTER_API_KEY
};
