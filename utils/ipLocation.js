const axios = require('axios');

/**
 * Get location information from IP address using ip-api.com
 * @param {string} ipAddress - The IP address to lookup
 * @returns {Promise<string>} - Location string (City, State)
 */
async function getLocationFromIP(ipAddress) {
    try {
        // Skip for localhost/private IPs
        if (!ipAddress ||
            ipAddress === '::1' ||
            ipAddress === '127.0.0.1' ||
            ipAddress.startsWith('192.168.') ||
            ipAddress.startsWith('10.') ||
            ipAddress.startsWith('172.')) {
            return 'Local Network';
        }

        // Use ip-api.com free API (no key required, 45 requests/minute limit)
        const response = await axios.get(`http://ip-api.com/json/${ipAddress}`, {
            timeout: 3000 // 3 second timeout
        });

        if (response.data && response.data.status === 'success') {
            const { city, regionName } = response.data;
            const locationParts = [];

            // Only include city and state/region
            if (city) locationParts.push(city);
            if (regionName) locationParts.push(regionName);

            return locationParts.join(', ') || 'Unknown';
        }

        return null;
    } catch (error) {
        console.error('Error fetching location:', error.message);
        return null; // Return null on error, don't block the audit log creation
    }
}

module.exports = { getLocationFromIP };
