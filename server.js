const express = require('express');
const dns = require('dns').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static frontend files from 'public' directory
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// API Endpoint to check domain availability
app.get('/api/check-domain', async (req, res) => {
    const domain = req.query.domain;

    if (!domain) {
        return res.status(400).json({ error: 'Domain parameter is required' });
    }

    try {
        // Perform a real DNS lookup from backend
        await dns.resolve(domain);
        // If lookup succeeds, the domain has active records (Taken)
        return res.json({ domain, status: 'TAKEN', available: false });
    } catch (error) {
        if (error.code === 'ENOTFOUND' || error.code === 'ENODATA') {
            // ENOTFOUND means no DNS records exist (Likely Available)
            return res.json({ domain, status: 'AVAILABLE', available: true });
        }
        return res.status(500).json({ error: 'DNS lookup failed on backend', code: error.code });
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});