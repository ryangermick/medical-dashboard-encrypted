export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
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
  "vitals": [{ "vital_type": "heart_rate|blood_pressure|temperature|oxygen_sat|respiratory_rate|resting_hr|weight", "value": "{JSON with avg/min/max or systolic/diastolic}", "unit": "string", "recorded_at": "YYYY-MM-DD", "status": "normal|elevated|high", "reference_range": "string" }],
  "labResults": [{ "panel_name": "string", "panel_abbr": "string", "drawn_date": "YYYY-MM-DD", "results": "[{name, value, unit, range, status}]" }],
  "medications": [{ "name": "string", "dose": "string", "frequency": "string", "purpose": "string", "start_date": "YYYY-MM-DD", "active": true }],
  "allergies": [{ "allergen": "string", "severity": "Mild|Moderate|Severe", "reaction": "string", "confirmed": true }],
  "genetics": { "riskFactors": [{ "condition": "string", "gene": "string", "snp": "string", "odds": "string (e.g. '1.3x')", "status": "watch|good" }], "pharmacogenomics": [{ "drug": "string", "gene": "string", "metabolism": "Normal|Poor|Rapid|Intermediate", "note": "string" }], "ancestry": { "summary": "string" }, "rawSnps": [{ "rsid": "string", "genotype": "string", "gene": "string", "significance": "string" }] }
}
Only include arrays/objects that have data. For 23andMe or genetic data, extract risk factors, pharmacogenomics, and notable SNPs. Return ONLY valid JSON, no markdown.`;

  try {
    const parts = [
      { text: 'Parse this medical document and extract structured data as JSON.' }
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
