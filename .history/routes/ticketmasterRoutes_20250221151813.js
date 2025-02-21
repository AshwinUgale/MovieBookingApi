const express = require("express");
const { getEvents, getVenues } = require("../controllers/ticketmasterController");

const router = express.Router();

router.get("/events", getEvents);
router.get("/venues", getVenues);

module.exports = router;
