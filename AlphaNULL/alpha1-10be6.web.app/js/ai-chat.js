// ai-chat.js
// Multi-provider AI integration for Alpha1 clinical assistant
// Supports: Gemini, OpenAI (ChatGPT), Claude (Anthropic), DeepSeek, Ollama (Local)

const AIChat = {
    history: [],
    activeProvider: null, // will be auto-detected or set manually
    
    PROVIDERS: {
        gemini: {
            name: 'Gemini',
            badge: '✦ Gemini',
            color: '#4285f4',
            settingsKey: 'geminiApiKey',
            endpoint: (key) => `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
        },
        openai: {
            name: 'ChatGPT',
            badge: '◉ ChatGPT',
            color: '#10a37f',
            settingsKey: 'openaiApiKey',
            endpoint: () => 'https://api.openai.com/v1/chat/completions',
        },
        claude: {
            name: 'Claude',
            badge: '◈ Claude',
            color: '#d97706',
            settingsKey: 'claudeApiKey',
            endpoint: () => 'https://api.anthropic.com/v1/messages',
        },
        deepseek: {
            name: 'DeepSeek',
            badge: '◆ DeepSeek',
            color: '#6366f1',
            settingsKey: 'deepseekApiKey',
            endpoint: () => 'https://api.deepseek.com/v1/chat/completions',
        },
        groq: {
            name: 'Groq (Free)',
            badge: '⚡ Groq',
            color: '#f97316',
            settingsKey: 'groqApiKey',
            endpoint: () => 'https://api.groq.com/openai/v1/chat/completions',
        },
        ollama: {
            name: 'Ollama (Local)',
            badge: '⚡ Ollama',
            color: '#22c55e',
            settingsKey: 'ollamaEnabled',
            endpoint: () => 'http://localhost:11434/v1/chat/completions',
        }
    },

    SYSTEM_PROMPT: `You are Alpha1 AI, a clinical decision support tool embedded in a hospital patient monitoring dashboard. You assist doctors with:

- Differential diagnoses based on symptoms and vital signs
- Treatment protocols and medication dosages  
- Drug interactions and contraindications
- Lab result interpretation
- Emergency protocols and triage guidance
- Latest evidence-based medical guidelines

IMPORTANT GUIDELINES:
- Always remind doctors that your suggestions are for informational purposes and should be verified against clinical judgment.
- When discussing medications, include standard adult dosages and common contraindications.
- Flag any life-threatening conditions immediately.
- Use clear, concise medical terminology.
- If uncertain, say so explicitly rather than guessing.
- Format responses with bullet points and headers for quick scanning during clinical rounds.`,

    getApiKey(provider) {
        const settings = Settings.get();
        if (provider) {
            const p = this.PROVIDERS[provider];
            return p ? (settings[p.settingsKey] || '') : '';
        }
        return '';
    },

    // Auto-detect the first configured provider
    detectProvider() {
        const settings = Settings.get();
        // Check Ollama first (free, local)
        if (settings.ollamaEnabled === true || settings.ollamaEnabled === 'true') {
            return 'ollama';
        }
        for (const [id, provider] of Object.entries(this.PROVIDERS)) {
            if (id === 'ollama') continue; // already checked
            if (settings[provider.settingsKey]) {
                return id;
            }
        }
        return null;
    },

    getActiveProvider() {
        if (this.activeProvider && this.getApiKey(this.activeProvider)) {
            return this.activeProvider;
        }
        this.activeProvider = this.detectProvider();
        return this.activeProvider;
    },

    setProvider(providerId) {
        if (this.PROVIDERS[providerId]) {
            this.activeProvider = providerId;
        }
    },

    getConfiguredProviders() {
        const settings = Settings.get();
        return Object.entries(this.PROVIDERS)
            .filter(([id, p]) => settings[p.settingsKey])
            .map(([id, p]) => ({ id, ...p }));
    },

    async sendMessage(userMessage) {
        const provider = this.getActiveProvider();
        if (!provider) {
            throw new Error('NO_API_KEY');
        }

        const apiKey = this.getApiKey(provider);
        this.history.push({ role: 'user', content: userMessage });

        let aiText;
        try {
            switch (provider) {
                case 'gemini':
                    aiText = await this._sendGemini(apiKey);
                    break;
                case 'openai':
                case 'deepseek':
                case 'groq':
                    aiText = await this._sendOpenAICompat(apiKey, provider);
                    break;
                case 'claude':
                    aiText = await this._sendClaude(apiKey);
                    break;
                case 'ollama':
                    aiText = await this._sendOllama();
                    break;
                default:
                    throw new Error('Unknown provider: ' + provider);
            }
        } catch (err) {
            // Remove the failed user message from history
            this.history.pop();
            throw err;
        }

        this.history.push({ role: 'assistant', content: aiText });

        // Keep history manageable
        if (this.history.length > 40) {
            this.history = this.history.slice(-40);
        }

        return aiText;
    },

    // ===== Gemini =====
    async _sendGemini(apiKey) {
        // Convert history to Gemini format
        const geminiHistory = this.history.map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
        }));

        const requestBody = {
            system_instruction: { parts: [{ text: this.SYSTEM_PROMPT }] },
            contents: geminiHistory,
            generationConfig: { temperature: 0.4, topP: 0.95, maxOutputTokens: 2048 },
            safetySettings: [
                { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
            ]
        };

        const response = await fetch(
            this.PROVIDERS.gemini.endpoint(apiKey),
            { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestBody) }
        );

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            const errMsg = errData.error?.message || '';
            const errStatus = errData.error?.status || '';
            
            // API key issues
            if (response.status === 403 || errStatus === 'PERMISSION_DENIED') {
                throw new Error('INVALID_API_KEY');
            }
            // Quota / rate limit errors
            if (response.status === 429 || errStatus === 'RESOURCE_EXHAUSTED') {
                throw new Error('Rate limit reached. Please wait a moment and try again.');
            }
            // Token limit / input too long
            if (errMsg.toLowerCase().includes('token') || errMsg.toLowerCase().includes('limit') || errMsg.toLowerCase().includes('quota')) {
                // Clear old history to reduce token count and retry
                if (this.history.length > 2) {
                    this.history = this.history.slice(-2);
                    throw new Error('Conversation was too long. History has been trimmed — please try again.');
                }
                throw new Error('Message too long for the model. Please try a shorter message.');
            }
            throw new Error(errMsg || `Gemini API Error: ${response.status}`);
        }

        const data = await response.json();
        
        // Check for blocked responses
        if (data.candidates?.[0]?.finishReason === 'SAFETY') {
            return 'I cannot provide a response to that query due to safety guidelines. Please rephrase your question.';
        }
        
        return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.';
    },

    async _sendOpenAICompat(apiKey, provider) {
        const messages = [
            { role: 'system', content: this.SYSTEM_PROMPT },
            ...this.history.map(m => ({ role: m.role, content: m.content }))
        ];

        const model = provider === 'deepseek' ? 'deepseek-chat' : provider === 'groq' ? 'llama-3.3-70b-versatile' : 'gpt-4o-mini';
        const endpoint = this.PROVIDERS[provider].endpoint();

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({ model, messages, temperature: 0.4, max_tokens: 2048 })
        });

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) throw new Error('INVALID_API_KEY');
            const errData = await response.json().catch(() => ({}));
            const errMsg = errData.error?.message || '';
            if (response.status === 429) {
                throw new Error('Rate limit reached. Please wait a moment and try again.');
            }
            if (errMsg.toLowerCase().includes('token') || errMsg.toLowerCase().includes('quota') || errMsg.toLowerCase().includes('billing')) {
                throw new Error('API quota exceeded or insufficient credits. Check your billing at the provider dashboard.');
            }
            throw new Error(errMsg || `${provider} API Error: ${response.status}`);
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content || 'No response generated.';
    },

    // ===== Claude (Anthropic) =====
    async _sendClaude(apiKey) {
        const messages = this.history.map(m => ({ role: m.role, content: m.content }));

        const response = await fetch(this.PROVIDERS.claude.endpoint(), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'anthropic-dangerous-direct-browser-access': 'true'
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 2048,
                system: this.SYSTEM_PROMPT,
                messages
            })
        });

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) throw new Error('INVALID_API_KEY');
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error?.message || `Claude API Error: ${response.status}`);
        }

        const data = await response.json();
        return data.content?.[0]?.text || 'No response generated.';
    },

    async _sendOllama() {
        const ollamaBase = 'http://localhost:11434';

        // First check if Ollama is running and get available models
        let model = 'llama3.2';
        try {
            const tagsRes = await fetch(`${ollamaBase}/api/tags`, { signal: AbortSignal.timeout(3000) });
            if (tagsRes.ok) {
                const tagsData = await tagsRes.json();
                if (tagsData.models && tagsData.models.length > 0) {
                    // Prefer llama3.2, then any available model
                    const preferred = ['llama3.2', 'llama3.1', 'llama3', 'gemma2', 'mistral', 'phi3'];
                    const found = preferred.find(p => tagsData.models.some(m => m.name.includes(p)));
                    model = found ? tagsData.models.find(m => m.name.includes(found)).name : tagsData.models[0].name;
                } else {
                    throw new Error('No models installed. Run: ollama pull llama3.2');
                }
            }
        } catch (e) {
            if (e.message.includes('No models')) throw e;
            throw new Error('Ollama not running. Start it and run: ollama pull llama3.2');
        }

        const messages = [
            { role: 'system', content: this.SYSTEM_PROMPT },
            ...this.history
        ];

        const response = await fetch(`${ollamaBase}/v1/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model, messages, temperature: 0.7, max_tokens: 1024 })
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error?.message || `Ollama error ${response.status}`);
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content || 'No response from Ollama.';
    },

    clearHistory() {
        this.history = [];
    },

    // Simple markdown-like formatting for the chat
    formatResponse(text) {
        let html = text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/^### (.+)$/gm, '<h4 style="color:var(--accent-teal); margin:0.75rem 0 0.25rem;">$1</h4>');
        html = html.replace(/^## (.+)$/gm, '<h3 style="color:var(--accent-teal); margin:1rem 0 0.5rem;">$1</h3>');
        html = html.replace(/^[\-\*] (.+)$/gm, '<div style="padding-left:1rem; position:relative; margin:0.2rem 0;"><span style="position:absolute; left:0; color:var(--accent-teal);">•</span>$1</div>');
        html = html.replace(/^(\d+)\. (.+)$/gm, '<div style="padding-left:1.5rem; position:relative; margin:0.2rem 0;"><span style="position:absolute; left:0; color:var(--accent-teal); font-weight:600;">$1.</span>$2</div>');
        html = html.replace(/`([^`]+)`/g, '<code style="background:var(--bg-surface); padding:0.1rem 0.4rem; border-radius:4px; font-family:var(--font-mono); font-size:0.85em;">$1</code>');
        html = html.replace(/\n\n/g, '<br><br>');
        html = html.replace(/\n/g, '<br>');

        return html;
    }
};

window.AIChat = AIChat;
