// ============================================================
//  CHÈRE — Backend Proxy
//  /api/chat.js — Vercel Serverless Function
//
//  This sits between your app and Anthropic.
//  Your API key lives here on the server — NEVER in the app.
//
//  HOW TO DEPLOY (10 minutes):
//  1. Create free account at vercel.com
//  2. Install Vercel CLI: npm i -g vercel
//  3. Run: vercel in this folder
//  4. Go to vercel.com → your project → Settings → Environment Variables
//  5. Add: ANTHROPIC_API_KEY = your key from console.anthropic.com
//  6. Your proxy URL will be: https://your-project.vercel.app/api/chat
//  7. Put that URL in your App.js as PROXY_URL
// ============================================================

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Basic CORS — restrict to your app's domain in production
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  const { model, max_tokens, messages } = req.body;

  // Validate required fields
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array is required' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // API key lives safely on the server — never in the app bundle
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: model || 'claude-sonnet-4-20250514',
        max_tokens: max_tokens || 1000,
        messages,
      }),
    });

    // Check HTTP status from Anthropic
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      console.error('Anthropic error:', response.status, errorBody);
      return res.status(response.status).json({
        error: errorBody?.error?.message || 'Anthropic request failed',
        type: 'anthropic_error',
      });
    }

    const data = await response.json();

    // Check for Anthropic error type in response body
    if (data.type === 'error') {
      return res.status(400).json({
        error: data.error?.message || 'Unknown Anthropic error',
        type: 'anthropic_error',
      });
    }

    return res.status(200).json(data);

  } catch (error) {
    console.error('Proxy error:', error);
    return res.status(500).json({
      error: 'Something went wrong on our end, darling — please try again!',
      type: 'server_error',
    });
  }
}
