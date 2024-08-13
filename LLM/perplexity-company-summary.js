const OpenAI = require('openai');

async function researchCompany(url) {
    const prompt = `${url} Research information about the the company found at this URL. Once you identify the company, you should search for additional information but should use the company's website as your primary source. Include sections for Business Model and Services, Growth and Expansion, Partnerships and Market Position. Include a list of references in your output with URLs as plain text.`;

    // console.log(prompt);

    const client = new OpenAI({
        apiKey: process.env.PERPLEXITY_API_KEY,
        baseURL: 'https://api.perplexity.ai',
    });

    const messages = [
        {
            role: 'system',
            content: 'You are an artificial intelligence assistant and you need to engage in a helpful, detailed, polite conversation with a user.',
        },
        {
            role: 'user',
            content: prompt,
        },
    ];

    try {
        const response = await client.chat.completions.create({
            model: 'llama-3-sonar-large-32k-online',
            messages: messages,
        });
        console.log(response.choices[0].message.content);
    } catch (error) {
        console.error('Error:', error);
    }
}

// Get the URL from command-line arguments
const url = process.argv[2];
if (url) {
    researchCompany(url);
} else {
    console.error('Please provide a URL as a command-line argument.');
}