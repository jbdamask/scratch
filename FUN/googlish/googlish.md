# GOOGLISH 🔍😈

*The World's Most Unhelpful Search Engine*

GOOGLISH is a hilariously broken search engine that looks just like Google but behaves in delightfully unpredictable ways. Every search is a surprise - you never know if you'll get random results, reversed text, a single unhelpful result, or if the search engine will just refuse to work entirely.

## Features

- **Beautiful Google-like interface** - Looks professional, acts chaotic
- **Four unpredictable search algorithms** that randomly activate:
  - **Random Mode (30%)**: Ignores your search, uses GPT-4 to generate completely random search terms
  - **Single Result Mode (30%)**: Uses your search term but only shows 1 randomly selected result
  - **Phantom Mode (30%)**: Silently reverses the letters in your search box as you type
  - **Moody Mode (10%)**: Refuses to search with messages like "I'm not in the mood right now"
- **Real search results** powered by Brave Search API (when it actually searches)
- **GPT-4 integration** for generating hilariously random search terms

## Requirements

- Node.js (any recent version)
- OpenAI API key (for GPT-4.1-nano)
- Brave Search API key (free tier: 2,000 searches/month)

## Installation

1. Clone or download the files to a directory
2. Install dependencies:
   ```bash
   npm install
   ```

## Configuration

### API Keys

You'll need two API keys:

#### OpenAI API Key
1. Get your API key from https://platform.openai.com/api-keys
2. Set the environment variable:
   ```bash
   export OPENAI_API_KEY="your_openai_key_here"
   ```

#### Brave Search API Key
1. Sign up at https://brave.com/search/api/
2. Get your free API key from the dashboard
3. Set the environment variable:
   ```bash
   export BRAVE_SEARCH_API_KEY="your_brave_key_here"
   ```

### Quick Setup Script
```bash
# Set your API keys (replace with your actual keys)
export OPENAI_API_KEY="sk-..."
export BRAVE_SEARCH_API_KEY="BSA..."

# Install and run
npm install
npm start
```

## Running GOOGLISH

1. Start the server:
   ```bash
   npm start
   ```

2. The server will automatically find an available port (starting from 3000)

3. Open your browser and go to the URL shown in the terminal:
   ```
   🚀 GOOGLISH server running on http://localhost:3000
   Open http://localhost:3000/googlish.html in your browser
   ```

4. Start searching and enjoy the chaos! 😈

## How It Works

GOOGLISH uses a Node.js backend to proxy API calls (avoiding browser CORS restrictions) and a frontend that looks exactly like Google. When you search, one of four algorithms randomly activates:

### The Four Modes of Chaos

#### 1. Random Mode (30% chance)
- Completely ignores whatever you typed
- GPT-4 generates a random search term like "how to teach dolphins calculus"
- Shows real search results for the random term
- Your search box updates to show what was actually searched

#### 2. Single Result Mode (30% chance)
- Uses your actual search term
- Fetches real results from Brave Search
- Only shows 1 randomly selected result from the list (could be the 8th most relevant)
- Unhelpfully minimal but technically accurate

#### 3. Phantom Mode (30% chance)
- Silently activates as you type
- Reverses letters in your search box every 300ms
- Type "pizza" → becomes "azzip" → searches for "azzip"
- Shows real results for whatever reversed nonsense you end up with
- Users think they're losing their typing skills

#### 4. Moody Mode (10% chance)
- Search engine just refuses to work
- Shows messages like "I'm not in the mood right now" or "Maybe tomorrow"
- Displays a 😑 emoji and "About 0 results"
- Suggests trying again when it "feels better"

## File Structure

- `googlish.html` - The main search interface
- `googlish-server.js` - Node.js backend server
- `package.json` - Dependencies and scripts
- `googlish.md` - This documentation

## Troubleshooting

### Server Won't Start
- Make sure both API keys are set as environment variables
- Check that Node.js is installed: `node --version`
- Try a different port if 3000 is busy (the server auto-detects)

### No Search Results
- Verify your Brave Search API key is valid
- Check the server console for error messages
- Make sure you haven't exceeded the free tier limit (2,000 searches/month)

### GPT-4 Not Working
- Confirm your OpenAI API key is correct
- Ensure you have API credits in your OpenAI account
- The app uses GPT-4.1-nano (cheaper than regular GPT-4)

### Browser Shows "Could not connect to server"
- Make sure the server is running (`npm start`)
- Check the correct port in your browser URL
- Look for any error messages in the terminal

## Why GOOGLISH?

Sometimes you need a search engine that:
- ✅ Ignores what you're actually looking for
- ✅ Shows you exactly one unhelpful result
- ✅ Sabotages your typing in real-time
- ✅ Occasionally refuses to work because it's "not in the mood"

Perfect for pranking friends, testing user patience, or just having a good laugh at the absurdity of search engines that actually try to be helpful.

## Contributing

Feel free to add more algorithms! Ideas:
- Results in random languages
- Searches that redirect to competitor sites
- Results that are all from the same domain
- Autocorrect that makes searches worse
- Loading screens that take forever

## License

Use this to confuse and delight. The world needs more delightfully broken software.

---

*"Finally, a search engine that's as confused as I am!"* - Anonymous User