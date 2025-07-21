const express = require('express');
const cors = require('cors');
const { execSync } = require('child_process');
// Using built-in fetch in Node.js 18+
const app = express();

console.log('🔥 STARTING GOOGLISH SERVER...');
console.log('📝 Environment check:');
console.log('  - BRAVE_SEARCH_API_KEY:', process.env.BRAVE_SEARCH_API_KEY ? '✅ SET' : '❌ MISSING');
console.log('  - OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '✅ SET' : '❌ MISSING');
console.log('  - PORT:', process.env.PORT || 3000);

// Enable CORS for all routes
app.use(cors());

// Parse JSON bodies
app.use(express.json());

// Health check endpoint for App Runner
app.get('/health', (req, res) => {
    console.log('🩺 Health check requested');
    res.status(200).send('OK');
});

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

// OpenAI proxy endpoint
app.post('/api/openai', async (req, res) => {
    const { messages, model } = req.body;
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
        return res.status(500).json({ error: 'OPENAI_API_KEY environment variable is required' });
    }
    
    try {
        console.log('🤖 Calling OpenAI API...');
        
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: model || 'gpt-4o-mini',
                messages: messages,
                max_tokens: 1000,
                temperature: 0.7
            })
        });
        
        const data = await response.json();
        console.log('✅ OpenAI API response received');
        res.json(data);
        
    } catch (error) {
        console.error('❌ Error calling OpenAI API:', error.message);
        res.status(500).json({ 
            error: 'Failed to call OpenAI API',
            details: error.message 
        });
    }
});

const PORT = process.env.PORT || 3000;

// Function to start server with fallback port
function startServer(port) {
    console.log(`🚀 Attempting to start server on port ${port}...`);
    const server = app.listen(port, '0.0.0.0', () => {
        console.log(`✅ GOOGLISH SERVER SUCCESSFULLY STARTED!`);
        console.log(`🌐 Server running on http://0.0.0.0:${port}`);
        console.log(`🔗 Access at: http://localhost:${port}/`);
        console.log(`💚 Health endpoint: http://localhost:${port}/health`);
        console.log('🔑 API Keys:', {
            BRAVE: process.env.BRAVE_SEARCH_API_KEY ? 'SET' : 'MISSING',
            OPENAI: process.env.OPENAI_API_KEY ? 'SET' : 'MISSING'
        });
    });

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.log(`❌ Port ${port} is in use, trying port ${port + 1}...`);
            startServer(port + 1);
        } else {
            console.error('💥 FATAL SERVER ERROR:', err);
            process.exit(1);
        }
    });
}

console.log('🎬 Starting Googlish server...');

// Add error handling for uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('💥 UNCAUGHT EXCEPTION:', err);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 UNHANDLED REJECTION at:', promise, 'reason:', reason);
    process.exit(1);
});

startServer(PORT);