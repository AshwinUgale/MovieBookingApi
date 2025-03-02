const axios = require("axios");
const config = require("../config/config");

const TICKETMASTER_BASE_URL = "https://app.ticketmaster.com/discovery/v2";

// Map category names to Ticketmaster segment IDs
const categoryToSegmentId = {
    music: "KZFzniwnSyZfZ7v7nJ",
    sports: "KZFzniwnSyZfZ7v7nE",
    theatre: "KZFzniwnSyZfZ7v7na",
    film: "KZFzniwnSyZfZ7v7nn",
    miscellaneous: "KZFzniwnSyZfZ7v7n1"
};

/**
 * Fetch events from Ticketmaster API
 * @param {string} city - City name for event search
 * @param {string} category - Classification (music, sports, theatre, film, miscellaneous)
 */
const fetchEvents = async (city = "New York", category) => {
    try {
        console.log(`📌 Fetching ${category} events from Ticketmaster in ${city}...`);

        // Get segment ID from category, default to "music"
        const segmentId = categoryToSegmentId[category.toLowerCase()] || categoryToSegmentId.music;

        const response = await axios.get(`${TICKETMASTER_BASE_URL}/events.json`, {
            params: {
                apikey: config.TICKETMASTER_API_KEY,
                city,
                segmentId, // ✅ Correctly filtering by segment ID
                size: 60,
            },
        });

        return response.data._embedded?.events || [];
    } catch (error) {
        console.error("🚨 ERROR in fetchEvents:", error.response?.data || error.message);
        throw new Error("Failed to fetch events from Ticketmaster");
    }
};




/**
 * Fetch venue details by city
 * @param {string} city - City name to find venues
 */
const fetchVenues = async (city = "New York") => {
    try {
        console.log(`📌 Fetching venues in ${city} from Ticketmaster...`);

        const response = await axios.get(`${TICKETMASTER_BASE_URL}/venues.json`, {
            params: { apikey: config.TICKETMASTER_API_KEY, size: 50 }
        });

        const allVenues = response.data._embedded?.venues || [];
        const filteredVenues = allVenues.filter(venue => 
            venue.city?.name?.toLowerCase() === city.toLowerCase()
        );

        return filteredVenues;
    } catch (error) {
        console.error("🚨 ERROR in fetchVenues:", error.response?.data || error.message);
        throw new Error("Failed to fetch venues from Ticketmaster");
    }
};

module.exports = { fetchEvents, fetchVenues };
