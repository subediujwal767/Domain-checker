const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static frontend files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

/**
 * High-Accuracy Domain Checker API Endpoint
 * Uses official RDAP (Registration Data Access Protocol) registry servers
 * with automatic Cloudflare DoH fallback for max reliability.
 */
app.get('/api/check-domain', async (req, res) => {
    const domain = req.query.domain ? req.query.domain.trim().toLowerCase() : '';

    if (!domain) {
        return res.status(400).json({ error: 'Domain name is required' });
    }

    try {
        let isRegistered = false;
        let methodUsed = 'RDAP';

        // Select official RDAP registry server based on domain extension (TLD)
        let rdapUrl = '';
        if (domain.endsWith('.com') || domain.endsWith('.net')) {
            rdapUrl = `https://rdap.verisign.com/com/v1/domain/${domain}`;
        } else if (domain.endsWith('.org')) {
            rdapUrl = `https://rdap.publicinterestregistry.org/rdap/domain/${domain}`;
        } else if (domain.endsWith('.io')) {
            rdapUrl = `https://rdap.identitydigital.services/rdap/domain/${domain}`;
        }

        if (rdapUrl) {
            const rdapResponse = await fetch(rdapUrl, { 
                headers: { 'Accept': 'application/json' } 
            });

            if (rdapResponse.status === 200) {
                // Status 200 OK -> Registered in database (TAKEN)
                isRegistered = true;
            } else if (rdapResponse.status === 404) {
                // Status 404 Not Found -> Unregistered in database (AVAILABLE)
                isRegistered = false;
            } else {
                // Fallback to DNS if RDAP rate-limits or returns error
                methodUsed = 'DNS Fallback';
                isRegistered = await checkViaDNS(domain);
            }
        } else {
            // Fallback for other TLDs using high-speed DNS lookup
            methodUsed = 'DNS Lookup';
            isRegistered = await checkViaDNS(domain);
        }

        return res.json({
            domain,
            available: !isRegistered,
            status: isRegistered ? 'TAKEN' : 'AVAILABLE',
            method: methodUsed
        });

    } catch (error) {
        return res.status(500).json({ error: 'Lookup failed due to network error.' });
    }
});

/**
 * Helper function for DNS-over-HTTPS (DoH) fallback lookup via Cloudflare
 */
async function checkViaDNS(domain) {
    try {
        const response = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=A`, {
            headers: { 'Accept': 'application/dns-json' }
        });
        const data = await response.json();
        // Status 0 -> Active DNS records exist (Taken)
        return data.Status === 0;
    } catch {
        return false;
    }
}

/**
 * Dynamic SEO Routes: robots.txt & sitemap.xml
 */
app.get('/robots.txt', (req, res) => {
    res.type('text/plain');
    res.send("User-agent: *\nAllow: /\nSitemap: https://domain-checker-oh01.onrender.com/sitemap.xml");
});

app.get('/sitemap.xml', (req, res) => {
    res.type('application/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://domain-checker-oh01.onrender.com/</loc>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://domain-checker-oh01.onrender.com/about.html</loc>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://domain-checker-oh01.onrender.com/privacy.html</loc>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>https://domain-checker-oh01.onrender.com/terms.html</loc>
    <priority>0.5</priority>
  </url>
</urlset>`);
});

// Fallback route for static page requests
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`High-performance SEO Domain Checker server running on port ${PORT}`);
});
