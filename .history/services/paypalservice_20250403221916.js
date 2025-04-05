// services/paypalService.js
const axios = require('axios');

const SPRING_BOOT_URL = process.env.SPRING_BOOT_URL || 'http://localhost:8080/api/payments';

class PayPalService {
    async createPayment(booking) {
        try {
            let description = '';
            let amount = 0;

            if (booking.type === 'movie') {
                amount = booking.seats.reduce((total, seat) => total + seat.price, 0);
                description = `Movie Ticket Booking - ${booking.seats.length} seats`;
            } else if (booking.type === 'event') {
                amount = booking.eventDetails.price || 10;
                description = `Event Ticket - ${booking.eventDetails.name}`;
            }

            const response = await axios.post(`${SPRING_BOOT_URL}/create`, {
                currency: 'USD',
                description,
                amount,
                returnUrl: `${process.env.CLIENT_URL}/payment/success?bookingId=${booking._id}`,
                cancelUrl: `${process.env.CLIENT_URL}/payment/cancel?bookingId=${booking._id}`
            });

            return response.data;
        } catch (error) {
            console.error('PayPal payment creation error:', error);
            throw error;
        }
    }

    async getPaymentDetails(paymentId) {
        try {
            const response = await axios.get(`${SPRING_BOOT_URL}/local/${paymentId}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching payment details:', error);
            throw error;
        }
    }

    // Add the new refundPayment method
    async refundPayment(paymentId) {
        try {
            const response = await axios.post(`${SPRING_BOOT_URL}/refund/${paymentId}`);
            return response.data;
        } catch (error) {
            console.error('Error processing refund:', error);
            throw error;
        }
    }
}

module.exports = new PayPalService();