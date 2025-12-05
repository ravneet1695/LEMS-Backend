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
    return req.ip || req.connection.remoteAddress || 'Unknown';
}

/**
 * Clean and normalize IP address
 * Removes IPv6 prefix from IPv4 addresses
 * @param {string} ip - IP address
 * @returns {string} - Cleaned IP address
 */
function cleanIP(ip) {
    if (!ip) return 'Unknown';

    // Remove IPv6 prefix from IPv4-mapped addresses
    // ::ffff:192.168.1.1 -> 192.168.1.1
    if (ip.startsWith('::ffff:')) {
        return ip.substring(7);
    }

    // Remove port if present
    // 192.168.1.1:8080 -> 192.168.1.1
    const portIndex = ip.lastIndexOf(':');
    if (portIndex > 0 && !ip.includes('::')) {
        return ip.substring(0, portIndex);
    }

    return ip;
}

/**
 * Get the real, cleaned IP address from request
 * @param {Object} req - Express request object
 * @returns {string} - Real, cleaned IP address
 */
function getClientIP(req) {
    const rawIP = getRealIP(req);
    return cleanIP(rawIP);
}

module.exports = { getClientIP, getRealIP, cleanIP };
