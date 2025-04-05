import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api",
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const fetchMovies = async () => {
  const response = await api.get("/movies");
  return response.data;
};

export const fetchShowtimes = async (movieId) => {
  try {
    const response = await api.get(`/showtimes/fake?movie=${movieId}`);
    console.log("🎬 API response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error fetching showtimes:", error);
    return [];
  }
};

export const addMovie = async (movieData) => {
  const token = localStorage.getItem("token");
  const response = await api.post("/movies", movieData, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const addShowtime = async (showtimeData) => {
  const token = localStorage.getItem("token");
  const response = await api.post("/showtimes", showtimeData, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const fetchSeats = async (showtimeId) => {
  try {
    const response = await api.get(`/showtimes/${showtimeId}`);
    console.log("🎯 Seat API response:", response.data);

    if (response.data && Array.isArray(response.data.availableSeats) && response.data.availableSeats.length > 0) {
      return response.data.availableSeats;
    } else {
      console.warn("🚨 No availableSeats or empty, falling back.");
      return generateReducedSeats();
    }
  } catch (error) {
    console.error("❌ Error fetching seats:", error);
    return generateReducedSeats();
  }
};

// ✅ Function to Generate a Reduced Theater Layout (30-40% fewer seats)
const generateReducedSeats = () => {
  const sections = ["VIP", "Platinum", "Gold", "Silver", "Economy"];
  let generatedSeats = [];

  sections.forEach((section) => {
    for (let row = 1; row <= 5; row++) {
      for (let seat = 1; seat <= 8; seat++) {
        generatedSeats.push({
          id: `${section}-${row}-${seat}`,
          number: `${section[0]}${row}${seat}`,
          type: section,
          booked: Math.random() < 0.1
        });
      }
    }
  });

  return generatedSeats;
};

export const bookSeats = async (showtimeId, selectedSeats) => {
  const response = await api.post("/bookings", {
    showtimeId,
    seats: selectedSeats,
  });
  return response.data;
};

// New payment-related functions
export const verifyPayment = async (bookingId, paymentId) => {
  try {
    const response = await api.post("/payments/verify", {
      bookingId,
      paymentId
    });
    return response.data;
  } catch (error) {
    console.error("❌ Payment verification error:", error);
    throw error.response?.data || error.message;
  }
};

export const getPaymentStatus = async (bookingId) => {
  try {
    const response = await api.get(`/payments/status/${bookingId}`);
    return response.data;
  } catch (error) {
    console.error("❌ Error getting payment status:", error);
    throw error.response?.data || error.message;
  }
};

export const cancelPayment = async (bookingId) => {
  try {
    const response = await api.post(`/payments/cancel/${bookingId}`);
    return response.data;
  } catch (error) {
    console.error("❌ Error canceling payment:", error);
    throw error.response?.data || error.message;
  }
};

export const fetchBookingHistory = async () => {
  try {
    const response = await api.get("/bookings/history");
    return response.data;
  } catch (error) {
    console.error("Error fetching booking history:", error);
    throw error;
  }
};

export const cancelBooking = async (bookingId) => {
  try {
    const response = await api.delete(`/bookings/${bookingId}`);
    return response.data;
  } catch (error) {
    console.error("Error canceling booking:", error);
    throw error;
  }
};

export const fetchEvents = async (city = "", category = "") => {
  try {
    let url = "/ticketmaster/events";

    const queryParams = [];
    if (city) queryParams.push(`city=${encodeURIComponent(city)}`);
    if (category) queryParams.push(`category=${category}`);

    if (queryParams.length > 0) {
      url += "?" + queryParams.join("&");
    }

    console.log("🔍 Fetching events from:", url);

    const response = await api.get(url);
    console.log("✅ Received Events Data:", response.data);

    return response.data;
  } catch (error) {
    console.error("❌ Error fetching live events:", error.response?.data || error.message);
    return [];
  }
};

export default api;

