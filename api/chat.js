// API endpoint for chat functionality
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { messages, model } = req.body;
    const apiKey = process.env.VITE_OPENROUTER_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: 'API key not configured' });
    }

    // Map model names to OpenRouter model IDs
    const modelMap = {
      'mistral-small-3.2': 'mistralai/mistral-7b-instruct',
      'llama-3-8b': 'meta-llama/llama-3-8b-instruct',
      'grok-4': 'x-ai/grok-beta',
      'claude-4-sonnet': 'anthropic/claude-3-sonnet',
      'openai-gpt-5-nano': 'openai/gpt-4-turbo'
    };

    const selectedModel = modelMap[model] || modelMap['mistral-small-3.2'];

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:5173',
        'X-Title': 'Hyperfocus AI'
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: messages,
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenRouter API error:', errorData);
      return res.status(response.status).json({ 
        error: `API request failed: ${response.status}`,
        details: errorData
      });
    }

    const data = await response.json();
    return res.status(200).json(data);

  } catch (error) {
    console.error('Chat API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message
    });
  }
}