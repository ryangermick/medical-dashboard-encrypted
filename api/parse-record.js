import { verifyAuth } from './_auth.js';
import { rateLimit } from './_rateLimit.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify authenticated user
  const user = await verifyAuth(req, res);
  if (!user) return; // 401 already sent

  // Rate limit: 10 parse requests per minute per user
  const rl = rateLimit(user.id, { maxRequests: 10, windowMs: 60000 });
  if (!rl.allowed) {
    return res.status(429).json({ error: 'Too many requests. Try again shortly.', retryAfter: rl.retryAfter });
  }

  const { file, filename, mimeType } = req.body;
  if (!file) {
    return res.status(400).json({ error: 'file (base64) required' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
  }

  const systemPrompt = `You are a medical record parser. Extract structured data from medical documents.
Return a JSON object with these optional arrays:
{
  "vitals": [{ "vital_type": "heart_rate|blood_pressure|temperature|oxygen_sat|respiratory_rate|resting_hr|weight", "value": "JSON object: {avg,min,max} for most vitals or {systolic,diastolic} for blood_pressure", "unit": "string", "recorded_at": "YYYY-MM-DD (REQUIRED — extract the measurement date)", "status": "normal|elevated|high", "reference_range": "string" }],
  "labResults": [{ "panel_name": "string", "panel_abbr": "string", "drawn_date": "YYYY-MM-DD (REQUIRED — extract the specimen collection date, order date, or report date)", "results": "[{name, value, unit, range, status}]" }],
  "medications": [{ "name": "string", "dose": "string", "frequency": "string", "purpose": "string", "start_date": "YYYY-MM-DD", "active": true }],
  "allergies": [{ "allergen": "string", "severity": "Mild|Moderate|Severe", "reaction": "string", "confirmed": true }],
  "genetics": { "riskFactors": [{ "condition": "string", "gene": "string", "snp": "string", "odds": "string (e.g. '1.3x')", "status": "watch|good" }], "pharmacogenomics": [{ "drug": "string", "gene": "string", "metabolism": "Normal|Poor|Rapid|Intermediate", "note": "string" }], "ancestry": { "composition": [{"population": "string", "percentage": 0}], "maternalHaplogroup": "string", "paternalHaplogroup": "string", "summary": "string" }, "carrierStatus": [{ "condition": "string", "status": "carrier|not_a_carrier|likely_not_a_carrier", "gene": "string" }], "traits": [{ "trait": "string", "result": "string" }], "wellness": [{ "topic": "string", "result": "string", "detail": "string" }] }
}
CRITICAL: Dates are essential for tracking health over time. ALWAYS extract dates (drawn_date, recorded_at) from the document. Look for collection date, specimen date, order date, visit date, or report date. Use YYYY-MM-DD format.

IMPORTANT ROUTING RULES:
- "labResults" is ONLY for blood tests, urine tests, and clinical laboratory panels (CBC, CMP, lipid panels, A1C, etc.)
- "genetics" is for ALL genetic/genomic data including: 23andMe, ancestry composition, haplogroups, health predispositions, carrier status, wellness reports, traits, pharmacogenomics, and raw SNP data
- NEVER put ancestry, traits, wellness, carrier status, or health predisposition data into labResults — those go in genetics
- For 23andMe reports: put ancestry in genetics.ancestry, health risks in genetics.riskFactors, carrier status in genetics.carrierStatus, traits/wellness in genetics.traits
Only include arrays/objects that have data. Return ONLY valid JSON, no markdown.`;

  try {
    const parts = [
      { text: 'Parse this medical document and extract ALL structured data as JSON. This could be a lab report, vitals report, genetic/23andMe report, prescription, or other medical record. Extract everything you can find — vitals, lab results, medications, allergies, and genetics data.' }
    ];

    // Add file as inline data
    if (mimeType === 'application/pdf') {
      parts.push({
        inline_data: {
          mime_type: mimeType,
          data: file
        }
      });
    } else {
      // Image
      parts.push({
        inline_data: {
          mime_type: mimeType || 'image/jpeg',
          data: file
        }
      });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 8192,
            responseMimeType: 'application/json',
          }
        })
      }
    );

    const data = await response.json();

    if (data.error) {
      return res.status(500).json({ error: data.error.message });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return res.status(500).json({ error: 'No response from AI' });
    }

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      // Try extracting JSON from markdown
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[1]);
      } else {
        parsed = JSON.parse(text.trim());
      }
    }

    return res.status(200).json({ parsed, filename });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
