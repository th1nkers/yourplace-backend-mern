const axios = require('axios');
const HttpError = require('../models/http-error');

const API_KEY = 'AiHJqCPLkqCBAcU7rFAqigKg4yTLsM9Q3tnbQ1ePctT4SwjVu_m1zDt26tZx2I1T';

async function getCoordsForAddress(address) {
    try {
        const response = await axios.get(`http://dev.virtualearth.net/REST/v1/Locations?query=${encodeURIComponent(
            address
        )}&key=${API_KEY}`);

        const data = response.data;

        if (!data || data.status === 'ZERO_RESULTS' || !data.results || data.results.length === 0) {
            throw new HttpError(
                'Could not find location for the specified address.',
                422
            );
        }

        const coordinates = data.resourceSets[0].resources[0].point.coordinates;
        return coordinates;
    } catch (error) {
        // Handle any axios-related errors or other issues
        throw new HttpError('Error fetching location data.', 500);
    }
}

module.exports = getCoordsForAddress;
