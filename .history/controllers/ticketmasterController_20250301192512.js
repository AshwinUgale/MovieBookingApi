const { fetchEvents, fetchVenues } = require("../services/ticketmasterService");

/**
 * @route GET /api/ticketmaster/events
 * @desc Get events from Ticketmaster
 * @queryParam city (optional) - Filter by city
 * @queryParam category (optional) - Filter by event type (music, sports, theatre, film, miscellaneous)
 */
exports.getEvents = async (req, res) => {
    try {
        const { city, category } = req.query; // ✅ Make city optional

        console.log(`📌 Fetching Ticketmaster events for ${city || "all cities"} in ${category || "all categories"}...`);

        const events = await fetchEvents(city, category?.toLowerCase()); // ✅ Only send city if provided
        res.status(200).json(events);
    } catch (error) {
        console.error("🚨 ERROR in getEvents:", error.message);
        res.status(500).json({ message: "Failed to fetch events" });
    }
};

/**
 * @route GET /api/ticketmaster/venues
 * @desc Get venues from Ticketmaster
 * @queryParam city (optional) - Filter by city
 */
exports.getVenues = async (req, res) => {
    try {
        const { city = "New York" } = req.query;
        console.log(`📌 Fetching Ticketmaster venues for ${city}...`);

        const venues = await fetchVenues(city);
        res.status(200).json(venues);
    } catch (error) {
        console.error("🚨 ERROR in getVenues:", error.message);
        res.status(500).json({ message: "Failed to fetch venues" });
    }
};
