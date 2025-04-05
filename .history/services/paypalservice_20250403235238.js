// services/paypalService.js
const axios = require('axios');

const SPRING_BOOT_URL = process.env.SPRING_BOOT_URL || 'http://localhost:8080';

class PayPalService {

    async executePayment(paymentId, payerId) {
        try {
            const response = await axios.post(`${SPRING_BOOT_URL}/api/payments/execute`, {
                paymentId,
                PayerID: payerId
            });
            return response.data;
        } catch (error) {
            console.error('PayPal payment execution error:', error);
            throw error;
        }
    }

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

            const response = await axios.post(`${SPRING_BOOT_URL}/api/payments/create`, {
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

    async verifyPayment(paymentId, payerId) {
        try {
            const response = await axios.post(`${SPRING_BOOT_URL}/api/payments/verify`, {
                paymentId,
                PayerID: payerId  // Make sure to include PayerID
            });
            return response.data;
        } catch (error) {
            console.error('Payment verification error:', error);
            throw error;
        }
    }

    async getPaymentDetails(paymentId) {
        try {
            const response = await axios.get(`${SPRING_BOOT_URL}/api/payments/status/${paymentId}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching payment details:', error);
            throw error;
        }
    }

    async refundPayment(paymentId) {
        try {
            const response = await axios.post(`${SPRING_BOOT_URL}/api/payments/refund/${paymentId}`);
            return response.data;
        } catch (error) {
            console.error('Error processing refund:', error);
            throw error;
        }
    }
}

module.exports = new PayPalService();