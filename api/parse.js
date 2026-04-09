export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const API_KEY = process.env.GEMINI_API_KEY;
    if (!API_KEY) {
        return res.status(500).json({ error: 'API key not configured on server (Vercel Environment Variables).' });
    }

    const { text } = req.body;
    if (!text) {
        return res.status(400).json({ error: 'No text provided' });
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;
    
    const prompt = `
    You are an expert ATS resume parser. Extract information from the following text and return ONLY a single JSON object. Do not wrap it in markdown block quotes. Use this exact schema:
    {
      "firstName": "string", "lastName": "string", "email": "string", "phone": "string", "location": "string", "link": "string", "skills": "comma separated string", "certifications": "comma separated string", "summary": "string",
      "experience": [ { "role": "string", "company": "string", "date": "string", "location": "string", "desc": "bullet point strings separated by \\n" } ],
      "projects": [ { "role": "string", "company": "string", "date": "string", "desc": "bullet point strings separated by \\n" } ],
      "education": [ { "degree": "string", "school": "string", "date": "string", "location": "string" } ]
    }
    
    Resume Text:
    ${text}
    `;

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const data = await response.json();
        
        if (data.error) {
            return res.status(500).json({ error: data.error.message });
        }

        let rawResult = data.candidates[0].content.parts[0].text;
        rawResult = rawResult.replace(/```json/g, '').replace(/```/g, '').trim();

        return res.status(200).json(JSON.parse(rawResult));
    } catch (error) {
        return res.status(500).json({ error: 'Failed to communicate with AI platform' });
    }
}
