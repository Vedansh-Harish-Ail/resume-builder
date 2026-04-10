export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { text, openAIKey, vipPassword, action, context } = req.body;
    if (!text && !context) {
        return res.status(400).json({ error: 'No content provided' });
    }

    const VIP_PASSWORD = "AIRESUME2026";
    const SYSTEM_GEMINI_KEY = process.env.GEMINI_API_KEY;

    let useOpenAI = !!openAIKey;
    let apiKey = openAIKey;
    let useGemini = false;

    // VIP Logic: If VIP password is correct and system has a Gemini key, use Gemini
    if (vipPassword === VIP_PASSWORD && SYSTEM_GEMINI_KEY) {
        useOpenAI = false;
        useGemini = true;
        apiKey = SYSTEM_GEMINI_KEY;
    }

    if (!apiKey && !useGemini) {
        return res.status(400).json({ error: 'No valid API key or VIP password provided.' });
    }

    let schemaPrompt = `
    Extract information from the following resume text. 
    IMPORTANT RULES:
    1. NEVER put "Projects", "Project & Leadership", or "Academic Projects" items in the 'experience' array.
    2. Items under headings like "Personal Projects" or "Technical Projects" MUST go into the 'projects' array.
    3. Return ONLY a single JSON object.
    
    SCHEMA:
    {
      "firstName": "string", "lastName": "string", "email": "string", "phone": "string", "location": "string", "link": "string", "skills": "comma separated string", "certifications": "comma separated string", "summary": "string",
      "experience": [ { "role": "string", "company": "string", "date": "string", "location": "string", "desc": "bullet point strings separated by \\n" } ],
      "projects": [ { "role": "string", "company": "string", "date": "string", "desc": "bullet point strings separated by \\n" } ],
      "education": [ { "degree": "string", "school": "string", "date": "string", "location": "string" } ]
    }
    `;

    if (action === 'generate_summary') {
        schemaPrompt = `Write a professional 3-4 sentence resume summary for a person with the following background: ${context}. Focus on achievements and key skills. Return ONLY the summary text.`;
    } else if (action === 'enhance_bullets') {
        schemaPrompt = `Enhance the following resume bullet points to be more impactful and result-oriented using action verbs. Maintain the bullet point format (starting with - or •). Return ONLY the enhanced bullets. Text to enhance: ${text}`;
    }

    try {
        let resultData;

        if (useGemini) {
            const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
            const promptText = action ? schemaPrompt : (schemaPrompt + "\n\nResume Text:\n" + text);
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: promptText }] }]
                })
            });
            const data = await response.json();
            if (data.error) throw new Error(data.error.message);
            resultData = data.candidates[0].content.parts[0].text;
        } else {
            // OpenAI
            const promptText = action ? schemaPrompt : (schemaPrompt + "\n\nResume Text:\n" + text);
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: [
                        { role: 'system', content: 'You are a professional ATS resume assistant. Output clean text or JSON as requested.' },
                        { role: 'user', content: promptText }
                    ],
                    response_format: action ? { type: "text" } : { type: "json_object" }
                })
            });
            const data = await response.json();
            if (data.error) throw new Error(data.error.message);
            resultData = data.choices[0].message.content;
        }

        if (action) {
            return res.status(200).json({ result: resultData.trim() });
        }

        let rawResult = resultData.replace(/```json/g, '').replace(/```/g, '').trim();
        return res.status(200).json(JSON.parse(rawResult));

    } catch (error) {
        console.error("API Parse Error:", error);
        return res.status(500).json({ error: error.message || 'Failed to communicate with AI platform' });
    }
}
