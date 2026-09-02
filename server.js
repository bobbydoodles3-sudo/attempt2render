const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(__dirname));

// Password verification endpoint
app.post('/api/login', (req, res) => {
    const { password } = req.body;
    const serverPassword = process.env.SITE_PASSWORD;

    if (!serverPassword) {
        return res.status(500).json({ error: "Site password not configured on server." });
    }

    if (password === serverPassword) {
        return res.json({ success: true });
    } else {
        return res.status(401).json({ success: false, error: "Incorrect password" });
    }
});

// Secure chat endpoint
app.post('/api/chat', async (req, res) => {
    const apiKey = process.env.GROQ_API_KEY;
    const clientPassword = req.headers['x-site-password'];

    // Verify password matches before allowing AI access
    if (!clientPassword || clientPassword !== process.env.SITE_PASSWORD) {
        return res.status(401).json({ error: "Unauthorized. Please log in." });
    }
    
    if (!apiKey) {
        console.error("CRITICAL: GROQ_API_KEY environment variable is missing!");
        return res.status(500).json({ error: "Server missing API key configuration." });
    }

    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'openai/gpt-oss-20b',
                messages: req.body.messages,
                temperature: 0.7
            })
        });

        const data = await response.json();
        
        if (!response.ok) {
            console.error("Groq API Error Response:", data);
            return res.status(response.status).json({ error: data.error?.message || "Groq rejected the request" });
        }

        res.json(data);
    } catch (error) {
        console.error("Fetch exception:", error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
