const axios = require("axios");
const config = require("../config/config");

const TICKETMASTER_BASE_URL = "https://app.ticketmaster.com/discovery/v2";

/**
 * Fetch events from Ticketmaster API
 * @param {string} city - City name for event search
 * @param {string} category - Classification (music, sports, theatre)
 */
const fetchEvents = async (city = "New York", category = "music") => {
    try {
        console.log("📌 Fetching events from Ticketmaster...");
        console.log("🔑 Using API Key:", config.TICKETMASTER_API_KEY);

        const response = await axios.get(`${TICKETMASTER_BASE_URL}/events.json`, {
            params: {
                apikey: config.TICKETMASTER_API_KEY, // ✅ Correct API Key usage
                city,
                classificationName: category,
                size: 10, // Limit results
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
