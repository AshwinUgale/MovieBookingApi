const dotenv = require('dotenv');

dotenv.config();
console.log("✅ Loaded TMDB Key:", process.env.TMDB_ACCESS_TOKEN ? "YES" : "NO");
module.exports = {
    port: process.env.PORT || 5000,
    mongoURI: process.env.MONGO_URI,
    jwtSecret: process.env.JWT_SECRET,
    TMDB_API_KEY: process.env.TMDB_API_KEY,
    TMDB_ACCESS_TOKEN: process.env.TMDB_ACCESS_TOKEN,
    TICKETMASTER_API_KEY: process.env.TICKETMASTER_API_KEY
};
