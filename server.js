import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { franc } from 'franc';
import cors from 'cors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;  // Use environment variable PORT or default to 3000

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Language mapping for franc to our language codes
const languageMap = {
    'eng': 'English',
    'ben': 'বাংলা (Bangla)'
};

// Function to detect language
function detectLanguage(text) {
    if (!text || text.trim().length < 3) {
        return 'unsupported';
    }
    
    // Ensure franc only tries to detect English or Bengali with a minimum length of 3 characters
    const detectedLangCode = franc(text, { only: ['eng', 'ben'], minLength: 3 });
    
    if (detectedLangCode === 'eng') {
        return 'English';
    } else if (detectedLangCode === 'ben') {
        return 'বাংলা (Bangla)';
    } else {
        return 'unsupported';
    }
}

// API endpoint for suggestions
app.post('/api/suggest', async (req, res) => {
    try {
        const { text, category, language, title, apiKey } = req.body;
        
        if (!text) {
            return res.status(400).json({ error: 'No text provided' });
        }

        if (!apiKey) {
            return res.status(400).json({ error: 'No API key provided' });
        }

        // Auto-detect language
        const detectedLanguage = detectLanguage(text);

        if (detectedLanguage === 'unsupported') {
            return res.json({
                suggestion: 'Language not supported.',
                detectedLanguage: 'Unsupported',
                isLanguageSupported: false
            });
        }
        
        // Initialize Google AI with user's API key
        const genAI = new GoogleGenerativeAI(apiKey);
        
        // Use gemini-2.0-flash model
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        
        const prompt = `As a writing assistant, analyze the following ${category} story and provide a natural continuation:

Title: ${title || 'Untitled'}
Previous content: "${text}"

Based on the story's context, genre, and writing style, provide a single-line suggestion that naturally continues the narrative. The suggestion should:
1. Match the established tone and style
2. Be relevant to the story's context
3. Be written in ${detectedLanguage}
4. Be concise and flow naturally from the previous text

Provide only the suggestion text, no explanations or additional context.`;
        
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const suggestion = response.text();
        
        res.json({ 
            suggestion,
            detectedLanguage,
            isLanguageSupported: true
        });
    } catch (error) {
        console.error('Error generating suggestion:', error);
        res.status(500).json({ 
            error: 'Failed to generate suggestion. Please check your API key and try again.',
            details: error.message 
        });
    }
});

// Endpoint to list available models
app.get('/api/models', async (req, res) => {
    try {
        const models = await genAI.listModels();
        res.json(models);
    } catch (error) {
        console.error('Error listing models:', error);
        res.status(500).json({ error: 'Failed to list models' });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ 
        error: 'Internal server error',
        details: err.message 
    });
});

// Start server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
}); 