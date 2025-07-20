const express = require('express');
const cors = require('cors');
const { execSync } = require('child_process');
const app = express();

// Enable CORS for all routes
app.use(cors());

// Parse JSON bodies
app.use(express.json());

// Serve static files (your HTML)
app.use(express.static('.'));

// Proxy endpoint for Brave Search
app.get('/api/search', async (req, res) => {
    const query = req.query.q;
    const apiKey = process.env.BRAVE_SEARCH_API_KEY;
    
    if (!query) {
        return res.status(400).json({ error: 'Query parameter q is required' });
    }
    
    if (!apiKey) {
        return res.status(500).json({ error: 'BRAVE_SEARCH_API_KEY environment variable is required' });
    }
    
    try {
        console.log(`Searching for: ${query}`);
        
        // Use curl to call Brave API (exactly like your working command)
        const curlCommand = `curl -s --compressed "https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=10" -H "Accept: application/json" -H "Accept-Encoding: gzip" -H "X-Subscription-Token: ${apiKey}"`;
        
        const result = execSync(curlCommand, { encoding: 'utf8' });
        const data = JSON.parse(result);
        
        console.log(`Found ${data.web?.results?.length || 0} results`);
        res.json(data);
        
    } catch (error) {
        console.error('Error calling Brave API:', error.message);
        res.status(500).json({ 
            error: 'Failed to fetch search results',
            details: error.message 
        });
    }
});

const PORT = process.env.PORT || 3000;

// Function to start server with fallback port
function startServer(port) {
    const server = app.listen(port, () => {
        console.log(`🚀 GOOGLISH server running on http://localhost:${port}`);
        console.log('Make sure BRAVE_SEARCH_API_KEY environment variable is set');
        console.log(`Open http://localhost:${port}/googlish.html in your browser`);
    });

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.log(`Port ${port} is in use, trying port ${port + 1}...`);
            startServer(port + 1);
        } else {
            console.error('Server error:', err);
        }
    });
}

startServer(PORT);