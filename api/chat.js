import { verifyAuth } from './_auth.js';
import { rateLimit } from './_rateLimit.js';

// Server-side system prompt — never accept from client
const SYSTEM_PROMPT = `You are MedDash AI, a personal health assistant. Be helpful, clear, and conversational. Note you're not a replacement for professional medical advice.

When the user provides their health context in messages, use it to give personalized responses. Always recommend consulting a healthcare provider for medical decisions.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify authenticated user
  const user = await verifyAuth(req, res);
  if (!user) return; // 401 already sent

  // Rate limit: 20 chat requests per minute per user
  const rl = rateLimit(user.id, { maxRequests: 20, windowMs: 60000 });
  if (!rl.allowed) {
    return res.status(429).json({ error: 'Too many requests. Try again shortly.', retryAfter: rl.retryAfter });
  }

  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array required' });
  }

  // Limit message count to prevent abuse
  if (messages.length > 50) {
    return res.status(400).json({ error: 'Too many messages in context' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
  }

  // Sanitize messages — only allow user/assistant roles, text content
  const contents = messages
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: String(m.content || '').slice(0, 20000) }]
    }));

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 4096,
          }
        })
      }
    );

    const data = await response.json();

    if (data.error) {
      return res.status(500).json({ error: data.error.message });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, I could not generate a response.';
    return res.status(200).json({ response: text });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
