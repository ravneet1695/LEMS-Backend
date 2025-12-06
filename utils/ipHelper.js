/**
 * Extract the real IP address from request
 * Handles proxies, load balancers, and forwarded headers
 * @param {Object} req - Express request object
 * @returns {string} - Real IP address
 */
function getRealIP(req) {
    // Check various headers that might contain the real IP
    // Order matters - check most reliable sources first

    // 1. X-Forwarded-For (most common for proxies/load balancers)
    const xForwardedFor = req.headers['x-forwarded-for'];
    if (xForwardedFor) {
        // X-Forwarded-For can contain multiple IPs: "client, proxy1, proxy2"
        // The first one is the original client IP
        const ips = xForwardedFor.split(',').map(ip => ip.trim());
        return ips[0];
    }

    // 2. X-Real-IP (used by nginx and other proxies)
    const xRealIP = req.headers['x-real-ip'];
    if (xRealIP) {
        return xRealIP;
    }

    // 3. CF-Connecting-IP (Cloudflare)
    const cfConnectingIP = req.headers['cf-connecting-ip'];
    if (cfConnectingIP) {
        return cfConnectingIP;
    }

    // 4. X-Client-IP
    const xClientIP = req.headers['x-client-ip'];
    if (xClientIP) {
        return xClientIP;
    }

    // 5. X-Cluster-Client-IP (used by some cloud providers)
    const xClusterClientIP = req.headers['x-cluster-client-ip'];
    if (xClusterClientIP) {
        return xClusterClientIP;
    }

    // 6. Forwarded header (RFC 7239)
    const forwarded = req.headers['forwarded'];
    if (forwarded) {
        // Format: "for=192.0.2.60;proto=http;by=203.0.113.43"
        const forMatch = forwarded.match(/for=([^;,\s]+)/);
        if (forMatch && forMatch[1]) {
            return forMatch[1].replace(/"/g, '');
        }
    }

    // 7. Fall back to req.ip (Express default)
    // This might be the proxy IP if behind a proxy
    return req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || 'Unknown';
}

/**
 * Clean and normalize IP address
 * Removes IPv6 prefix from IPv4 addresses
 * @param {string} ip - IP address
 * @returns {string} - Cleaned IP address
 */
function cleanIP(ip) {
    if (!ip || ip === 'Unknown') return null;

    // Remove IPv6 prefix from IPv4-mapped addresses
    // ::ffff:192.168.1.1 -> 192.168.1.1
    if (ip.startsWith('::ffff:')) {
        ip = ip.substring(7);
    }

    // Handle localhost variations
    if (ip === '::1' || ip === '127.0.0.1' || ip === 'localhost') {
        return 'localhost';
    }

    // Remove port if present
    // 192.168.1.1:8080 -> 192.168.1.1
    const portIndex = ip.lastIndexOf(':');
    if (portIndex > 0 && !ip.includes('::')) {
        ip = ip.substring(0, portIndex);
    }

    return ip;
}

/**
 * Detect if IP is from local network
 * @param {string} ip - IP address
 * @returns {boolean} - True if local network IP
 */
function isLocalNetwork(ip) {
    if (!ip) return false;

    // Localhost
    if (ip === 'localhost' || ip === '127.0.0.1' || ip === '::1') {
        return true;
    }

    // Private IP ranges
    // 10.0.0.0 - 10.255.255.255
    if (ip.startsWith('10.')) return true;

    // 172.16.0.0 - 172.31.255.255
    if (ip.startsWith('172.')) {
        const second = parseInt(ip.split('.')[1]);
        if (second >= 16 && second <= 31) return true;
    }

    // 192.168.0.0 - 192.168.255.255
    if (ip.startsWith('192.168.')) return true;

    return false;
}

/**
 * Get the real, cleaned IP address from request
 * @param {Object} req - Express request object
 * @returns {string} - Real, cleaned IP address or null
 */
function getClientIP(req) {
    if (!req) return null;

    const rawIP = getRealIP(req);
    const cleanedIP = cleanIP(rawIP);

    // Return null for localhost in development to avoid storing useless data
    if (cleanedIP === 'localhost' && process.env.NODE_ENV === 'development') {
        return null;
    }

    return cleanedIP;
}

/**
 * Get detailed IP information
 * @param {Object} req - Express request object
 * @returns {Object} - IP details
 */
function getIPDetails(req) {
    const ip = getClientIP(req);
    const isLocal = isLocalNetwork(ip);

    return {
        ip: ip,
        isLocal: isLocal,
        type: isLocal ? 'local' : 'public',
        raw: getRealIP(req)
    };
}

module.exports = {
    getClientIP,
    getRealIP,
    cleanIP,
    isLocalNetwork,
    getIPDetails
};
