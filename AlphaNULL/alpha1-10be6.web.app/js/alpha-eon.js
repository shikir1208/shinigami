// ═══════════════════════════════════════════════════════════════
// ALPHA-EON — JARVIS-Style Voice AI Assistant
// Voice recognition + AI brain + Text-to-Speech + Audio viz
// ═══════════════════════════════════════════════════════════════

const AlphaEon = {
    // ── State ────────────────────────────────────────────────
    isActive: false,
    state: 'idle', // idle | listening | thinking | speaking | error
    recognition: null,
    synth: window.speechSynthesis,
    jarvisVoice: null,
    audioCtx: null,
    analyser: null,
    micStream: null,
    animFrame: null,
    isListening: false,
    isSpeaking: false,
    hasGreeted: false,

    // ── DOM refs (populated in init) ─────────────────────────
    overlay: null,
    orb: null,
    statusLabel: null,
    transcriptEl: null,
    responseEl: null,
    canvas: null,
    ctx: null,

    // ── Voice Config ─────────────────────────────────────────
    voiceConfig: {
        rate: 0.95,
        pitch: 0.9,
        volume: 1.0,
        preferredVoices: [
            'Google UK English Male',
            'Microsoft George',
            'Microsoft Ryan',
            'Daniel',
            'Arthur',
            'James',
            'en-GB'
        ]
    },

    // ── System Prompt (JARVIS-style) ─────────────────────────
    SYSTEM_PROMPT: `You are Alpha-Eon, an advanced AI intelligence assistant embedded in the Alpha 1 clinical patient monitoring system. You are modeled after JARVIS — Tony Stark's AI from Iron Man. 

Your personality:
- Calm, composed, and highly articulate
- British-style sophistication with dry wit when appropriate
- Proactive — anticipate what the doctor needs
- Address the user as "Doctor" naturally in conversation
- Keep responses concise and spoken-word friendly (2-4 sentences max unless asked for detail)
- Never use markdown formatting, bullet points, or special characters — speak naturally as if in a conversation
- When giving medical data, state numbers clearly

You have full access to the patient monitoring dashboard. When patient data is provided in context, reference it naturally.

Example responses:
- "All systems nominal, Doctor. Nine patients currently under observation with one critical alert in ICU-2."
- "Patient Khalid Othman is showing elevated heart rate at 162 BPM with SpO2 at 84 percent. I would recommend immediate assessment."
- "Of course, Doctor. I've noted the intervention in the patient record."`,

    // ══════════════════════════════════════════════════════════
    // INIT
    // ══════════════════════════════════════════════════════════
    init() {
        // Cache DOM refs
        this.overlay = document.getElementById('eon-overlay');
        this.statusLabel = document.getElementById('eon-status');
        this.transcriptEl = document.getElementById('eon-transcript');
        this.responseEl = document.getElementById('eon-response');
        this.canvas = document.getElementById('eon-canvas');
        if (this.canvas) {
            this.ctx = this.canvas.getContext('2d');
        }
        this.outputPanel = document.getElementById('eon-output-panel');

        // Provider selector
        this.providerSelect = document.getElementById('eon-provider-select');
        this._populateProviders();
        if (this.providerSelect) {
            this.providerSelect.addEventListener('change', (e) => {
                AIChat.setProvider(e.target.value);
            });
        }

        // Trigger button
        const trigger = document.getElementById('eon-trigger');
        if (trigger) trigger.addEventListener('click', () => this.toggle());

        // Close button
        const closeBtn = document.getElementById('eon-close');
        if (closeBtn) closeBtn.addEventListener('click', () => this.deactivate());

        // Overlay background click
        if (this.overlay) {
            this.overlay.addEventListener('click', (e) => {
                if (e.target === this.overlay || e.target === this.canvas) this.deactivate();
            });
        }

        // Mic button
        const micBtn = document.getElementById('eon-mic-btn');
        if (micBtn) micBtn.addEventListener('click', () => this.toggleListening());

        // Text input
        const textInput = document.getElementById('eon-text-input');
        const sendBtn = document.getElementById('eon-input-send');
        if (textInput) {
            textInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.handleTextInput();
                }
            });
        }
        if (sendBtn) sendBtn.addEventListener('click', () => this.handleTextInput());

        // Keyboard shortcut
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
            if (e.key === '`') {
                if (!document.querySelector('.modal-overlay.active')) {
                    e.preventDefault();
                    this.toggle();
                }
            }
            if (e.key === 'Escape' && this.isActive) {
                this.deactivate();
            }
        });

        // Load voices
        this._loadVoices();
        if (this.synth.onvoiceschanged !== undefined) {
            this.synth.onvoiceschanged = () => this._loadVoices();
        }

        console.log('⚡ Alpha-Eon initialized');
    },

    _populateProviders() {
        if (!this.providerSelect) return;
        this.providerSelect.innerHTML = '';
        const settings = typeof Settings !== 'undefined' ? Settings.get() : {};
        const providers = typeof AIChat !== 'undefined' ? AIChat.PROVIDERS : {};
        const active = typeof AIChat !== 'undefined' ? AIChat.getActiveProvider() : null;

        for (const [id, p] of Object.entries(providers)) {
            const hasKey = id === 'ollama'
                ? (settings.ollamaEnabled === true || settings.ollamaEnabled === 'true')
                : !!settings[p.settingsKey];
            if (hasKey) {
                const opt = document.createElement('option');
                opt.value = id;
                opt.textContent = p.name;
                opt.style.color = p.color;
                if (id === active) opt.selected = true;
                this.providerSelect.appendChild(opt);
            }
        }

        // If no providers, show hint
        if (this.providerSelect.options.length === 0) {
            const opt = document.createElement('option');
            opt.textContent = 'No AI configured';
            opt.disabled = true;
            this.providerSelect.appendChild(opt);
        }
    },

    _showOutput() {
        if (this.outputPanel) this.outputPanel.classList.add('has-content');
    },
    _hideOutput() {
        if (this.outputPanel) this.outputPanel.classList.remove('has-content');
    },

    // ══════════════════════════════════════════════════════════
    // VOICE SELECTION
    // ══════════════════════════════════════════════════════════
    _loadVoices() {
        const voices = this.synth.getVoices();
        if (voices.length === 0) return;

        // Try preferred voices in order
        for (const pref of this.voiceConfig.preferredVoices) {
            const found = voices.find(v =>
                v.name.includes(pref) || (pref.length <= 5 && v.lang.startsWith(pref))
            );
            if (found) {
                this.jarvisVoice = found;
                console.log(`🎙 Alpha-Eon voice: ${found.name} (${found.lang})`);
                return;
            }
        }

        // Fallback: any English male voice
        const englishMale = voices.find(v =>
            v.lang.startsWith('en') && (v.name.toLowerCase().includes('male') || v.name.includes('George') || v.name.includes('Daniel') || v.name.includes('James'))
        );
        if (englishMale) {
            this.jarvisVoice = englishMale;
            console.log(`🎙 Alpha-Eon voice (fallback): ${englishMale.name}`);
            return;
        }

        // Last resort: first English voice
        const anyEnglish = voices.find(v => v.lang.startsWith('en'));
        if (anyEnglish) {
            this.jarvisVoice = anyEnglish;
            console.log(`🎙 Alpha-Eon voice (last resort): ${anyEnglish.name}`);
        }
    },

    // ══════════════════════════════════════════════════════════
    // ACTIVATION / DEACTIVATION
    // ══════════════════════════════════════════════════════════
    toggle() {
        if (this.isActive) this.deactivate();
        else this.activate();
    },

    activate() {
        this.isActive = true;
        this.overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        this._setState('idle');
        this.transcriptEl.textContent = '';
        this.responseEl.textContent = '';
        this._hideOutput();
        this._populateProviders();
        this._startViz();

        // Greeting on first activation
        if (!this.hasGreeted) {
            this.hasGreeted = true;
            setTimeout(() => {
                const patientCount = typeof PatientsDB !== 'undefined' ? PatientsDB.getAll().length : 0;
                const greeting = patientCount > 0
                    ? `Alpha-Eon online. All systems operational. Currently monitoring ${patientCount} patients, Doctor.`
                    : `Alpha-Eon online. All systems operational. Standing by, Doctor.`;
                this.speak(greeting);
            }, 600);
        }
    },

    deactivate() {
        this.isActive = false;
        this.stopListening();
        this.synth.cancel();
        this.overlay.classList.remove('active');
        document.body.style.overflow = '';
        this._setState('idle');
        this._stopViz();
        this.isSpeaking = false;
    },

    // ══════════════════════════════════════════════════════════
    // STATE MANAGEMENT
    // ══════════════════════════════════════════════════════════
    _setState(state) {
        this.state = state;
        // Remove all state classes
        this.overlay.classList.remove('state-idle', 'state-listening', 'state-thinking', 'state-speaking', 'state-error');
        this.overlay.classList.add(`state-${state}`);

        const labels = {
            idle: 'ALPHA-EON READY',
            listening: 'LISTENING',
            thinking: 'PROCESSING',
            speaking: 'SPEAKING',
            error: 'ERROR'
        };
        if (this.statusLabel) this.statusLabel.textContent = labels[state] || 'ALPHA-EON';

        // Update mic button
        const micBtn = document.getElementById('eon-mic-btn');
        if (micBtn) {
            micBtn.classList.toggle('active', state === 'listening');
        }
    },

    // ══════════════════════════════════════════════════════════
    // SPEECH RECOGNITION (Voice Input)
    // ══════════════════════════════════════════════════════════
    toggleListening() {
        if (this.isListening) this.stopListening();
        else this.startListening();
    },

    startListening() {
        if (this.isSpeaking) {
            this.synth.cancel();
            this.isSpeaking = false;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            this._setState('error');
            this.responseEl.textContent = 'Speech recognition is not supported in this browser. Please use Chrome or Edge.';
            return;
        }

        this.recognition = new SpeechRecognition();
        this.recognition.lang = 'en-US';
        this.recognition.interimResults = true;
        this.recognition.continuous = false;
        this.recognition.maxAlternatives = 1;

        this.recognition.onstart = () => {
            this.isListening = true;
            this._setState('listening');
            this.transcriptEl.textContent = '';
            this._showOutput();
            this.responseEl.textContent = '';
        };

        this.recognition.onresult = (event) => {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                } else {
                    interimTranscript += transcript;
                }
            }

            this.transcriptEl.textContent = finalTranscript || interimTranscript;
            if (finalTranscript || interimTranscript) this._showOutput();

            if (finalTranscript) {
                this.isListening = false;
                this.processCommand(finalTranscript.trim());
            }
        };

        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            this.isListening = false;
            if (event.error === 'no-speech') {
                this._setState('idle');
                this.transcriptEl.textContent = 'No speech detected. Click the mic to try again.';
            } else if (event.error === 'not-allowed') {
                this._setState('error');
                this.responseEl.textContent = 'Microphone access denied. Please enable microphone permissions.';
            } else {
                this._setState('idle');
            }
        };

        this.recognition.onend = () => {
            this.isListening = false;
            if (this.state === 'listening') {
                this._setState('idle');
            }
        };

        try {
            this.recognition.start();
        } catch (e) {
            console.error('Failed to start recognition:', e);
        }
    },

    stopListening() {
        if (this.recognition) {
            try { this.recognition.stop(); } catch (e) {}
            this.isListening = false;
        }
    },

    // ══════════════════════════════════════════════════════════
    // TEXT INPUT HANDLER
    // ══════════════════════════════════════════════════════════
    handleTextInput() {
        const input = document.getElementById('eon-text-input');
        if (!input) return;
        const text = input.value.trim();
        if (!text) return;
        input.value = '';
        this.transcriptEl.textContent = text;
        this.processCommand(text);
    },

    // ══════════════════════════════════════════════════════════
    // COMMAND PROCESSING — Voice/Text → AI → Speech
    // ══════════════════════════════════════════════════════════
    async processCommand(text) {
        this._setState('thinking');
        this.responseEl.textContent = '';

        try {
            // Build patient context
            const context = this._buildPatientContext();

            // Get active AI provider
            const provider = AIChat.getActiveProvider();
            if (!provider) {
                this.speak('I need an API key to process requests, Doctor. Please configure one in Settings.');
                return;
            }

            const apiKey = AIChat.getApiKey(provider);
            const fullPrompt = context
                ? `[PATIENT DASHBOARD CONTEXT]\n${context}\n\n[DOCTOR'S REQUEST]\n${text}`
                : text;

            // Send to AI
            const response = await this._sendToAI(provider, apiKey, fullPrompt);

            // Speak the response
            this.responseEl.textContent = response;
            this._showOutput();
            this.speak(response);

        } catch (err) {
            console.error('Alpha-Eon processing error:', err);
            this._setState('error');
            const errMsg = err.message === 'NO_API_KEY'
                ? 'No API key configured. Please add one in Settings, Doctor.'
                : `I encountered an issue: ${err.message}`;
            this.responseEl.textContent = errMsg;
            this._showOutput();
            this.speak(errMsg);
        }
    },

    // ══════════════════════════════════════════════════════════
    // AI COMMUNICATION
    // ══════════════════════════════════════════════════════════
    async _sendToAI(provider, apiKey, userMessage) {
        switch (provider) {
            case 'gemini': return this._sendGemini(apiKey, userMessage);
            case 'openai':
            case 'deepseek':
            case 'groq': return this._sendOpenAI(apiKey, provider, userMessage);
            case 'claude': return this._sendClaude(apiKey, userMessage);
            case 'ollama': return this._sendOllama(userMessage);
            default: throw new Error('Unknown provider');
        }
    },

    async _sendGemini(apiKey, userMessage) {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    system_instruction: { parts: [{ text: this.SYSTEM_PROMPT }] },
                    contents: [{ role: 'user', parts: [{ text: userMessage }] }],
                    generationConfig: { temperature: 0.5, topP: 0.9, maxOutputTokens: 300 },
                    safetySettings: [
                        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
                        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
                        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
                        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
                    ]
                })
            }
        );
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error?.message || `API Error ${response.status}`);
        }
        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || 'I was unable to generate a response.';
    },

    async _sendOpenAI(apiKey, provider, userMessage) {
        const model = provider === 'deepseek' ? 'deepseek-chat' : provider === 'groq' ? 'llama-3.3-70b-versatile' : 'gpt-4o-mini';
        const endpoint = provider === 'deepseek' ? 'https://api.deepseek.com/v1/chat/completions'
            : provider === 'groq' ? 'https://api.groq.com/openai/v1/chat/completions'
            : 'https://api.openai.com/v1/chat/completions';
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify({
                model,
                messages: [
                    { role: 'system', content: this.SYSTEM_PROMPT },
                    { role: 'user', content: userMessage }
                ],
                temperature: 0.5, max_tokens: 300
            })
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error?.message || `API Error ${response.status}`);
        }
        const data = await response.json();
        return data.choices?.[0]?.message?.content || 'I was unable to generate a response.';
    },

    async _sendClaude(apiKey, userMessage) {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'anthropic-dangerous-direct-browser-access': 'true'
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 300,
                system: this.SYSTEM_PROMPT,
                messages: [{ role: 'user', content: userMessage }]
            })
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error?.message || `API Error ${response.status}`);
        }
        const data = await response.json();
        return data.content?.[0]?.text || 'I was unable to generate a response.';
    },

    async _sendOllama(userMessage) {
        const base = 'http://localhost:11434';
        let model = 'llama3.2';
        try {
            const tags = await fetch(`${base}/api/tags`, { signal: AbortSignal.timeout(3000) });
            if (tags.ok) {
                const data = await tags.json();
                if (data.models && data.models.length > 0) {
                    const pref = ['llama3.2', 'llama3.1', 'llama3', 'gemma2', 'mistral', 'phi3'];
                    const found = pref.find(p => data.models.some(m => m.name.includes(p)));
                    model = found ? data.models.find(m => m.name.includes(found)).name : data.models[0].name;
                } else {
                    throw new Error('No models installed');
                }
            }
        } catch (e) {
            throw new Error('Ollama not running. Please start Ollama on your PC.');
        }
        const response = await fetch(`${base}/v1/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model,
                messages: [
                    { role: 'system', content: this.SYSTEM_PROMPT },
                    { role: 'user', content: userMessage }
                ],
                temperature: 0.5, max_tokens: 300
            })
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error?.message || `Ollama error ${response.status}`);
        }
        const data = await response.json();
        return data.choices?.[0]?.message?.content || 'No response from Ollama.';
    },

    // ══════════════════════════════════════════════════════════
    // PATIENT CONTEXT BUILDER
    // ══════════════════════════════════════════════════════════
    _buildPatientContext() {
        if (typeof PatientsDB === 'undefined') return '';

        const patients = PatientsDB.getAll();
        if (patients.length === 0) return '';

        let context = `Dashboard Status: ${patients.length} patients monitored\n`;

        let criticalCount = 0;
        let warningCount = 0;
        const wards = {};

        patients.forEach(p => {
            if (!wards[p.ward]) wards[p.ward] = 0;
            wards[p.ward]++;

            // Get live data if available
            const live = typeof dashboardLiveData !== 'undefined' ? dashboardLiveData[p.id] : null;
            let vitals = '';
            let status = p.conditionProfile || 'normal';

            if (live && live.ppg && live.ppg.value > 0) {
                vitals = `HR:${live.ppg.value} SpO2:${live.spo2.value}% GSR:${live.gsr.value} EMG:${live.emg.value} IMU:${live.imu.value}`;
                const diag = DoctorHelper.processReadings(live);
                status = diag.overallStatus;
                if (diag.overallStatus === 'critical') criticalCount++;
                else if (diag.overallStatus === 'warning') warningCount++;
            } else {
                if (p.conditionProfile === 'critical_multi') criticalCount++;
                else if (p.conditionProfile !== 'normal') warningCount++;
            }

            context += `- ${p.name} (${p.id}), ${p.age}${p.gender}, Ward: ${p.ward}, Status: ${status}${vitals ? ', Vitals: ' + vitals : ''}\n`;
        });

        context += `\nSummary: ${criticalCount} critical, ${warningCount} warning alerts\n`;
        context += `Wards: ${Object.entries(wards).map(([w, c]) => `${w}(${c})`).join(', ')}\n`;
        context += `Bed Occupancy: ${Math.round((patients.length / 15) * 100)}%`;

        return context;
    },

    // ══════════════════════════════════════════════════════════
    // TEXT-TO-SPEECH (JARVIS Voice)
    // ══════════════════════════════════════════════════════════
    speak(text) {
        this.synth.cancel();
        this._setState('speaking');
        this.isSpeaking = true;

        // Try ElevenLabs first (for real JARVIS voice)
        const settings = typeof Settings !== 'undefined' ? Settings.get() : {};
        if (settings.elevenLabsApiKey) {
            this._speakElevenLabs(text, settings.elevenLabsApiKey, settings.elevenLabsVoiceId);
            return;
        }

        // Fallback: browser TTS
        this._speakBrowserTTS(text);
    },

    async _speakElevenLabs(text, apiKey, voiceId) {
        // Alpha-Eon permanent voice
        const vid = voiceId || 'G17SuINrv2H9FC6nvetn';
        const url = `https://api.elevenlabs.io/v1/text-to-speech/${vid}`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'xi-api-key': apiKey
                },
                body: JSON.stringify({
                    text: text,
                    model_id: 'eleven_turbo_v2_5',
                    voice_settings: {
                        stability: 0.75,
                        similarity_boost: 0.85,
                        style: 0.2,
                        use_speaker_boost: true
                    }
                })
            });

            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                console.warn('ElevenLabs error, falling back to browser TTS:', err);
                this._speakBrowserTTS(text);
                return;
            }

            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);

            audio.onended = () => {
                URL.revokeObjectURL(audioUrl);
                this.isSpeaking = false;
                if (this.isActive) this._setState('idle');
            };

            audio.onerror = () => {
                URL.revokeObjectURL(audioUrl);
                console.warn('ElevenLabs playback error, falling back to browser TTS');
                this._speakBrowserTTS(text);
            };

            audio.play();

        } catch (err) {
            console.warn('ElevenLabs failed, falling back to browser TTS:', err);
            this._speakBrowserTTS(text);
        }
    },

    _speakBrowserTTS(text) {
        const utterance = new SpeechSynthesisUtterance(text);

        if (this.jarvisVoice) {
            utterance.voice = this.jarvisVoice;
        }
        utterance.rate = this.voiceConfig.rate;
        utterance.pitch = this.voiceConfig.pitch;
        utterance.volume = this.voiceConfig.volume;

        utterance.onend = () => {
            this.isSpeaking = false;
            if (this.isActive) {
                this._setState('idle');
            }
        };

        utterance.onerror = (e) => {
            console.error('Speech error:', e);
            this.isSpeaking = false;
            this._setState('idle');
        };

        // Chrome bug workaround: long utterances get cut off
        if (text.length > 200) {
            this._speakChunked(text);
        } else {
            this.synth.speak(utterance);
        }
    },

    _speakChunked(text) {
        const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
        let index = 0;

        const speakNext = () => {
            if (index >= sentences.length || !this.isActive) {
                this.isSpeaking = false;
                if (this.isActive) this._setState('idle');
                return;
            }

            const utterance = new SpeechSynthesisUtterance(sentences[index].trim());
            if (this.jarvisVoice) utterance.voice = this.jarvisVoice;
            utterance.rate = this.voiceConfig.rate;
            utterance.pitch = this.voiceConfig.pitch;
            utterance.volume = this.voiceConfig.volume;

            utterance.onend = () => {
                index++;
                speakNext();
            };
            utterance.onerror = () => {
                this.isSpeaking = false;
                this._setState('idle');
            };

            this.synth.speak(utterance);
        };

        speakNext();
    },

    // ══════════════════════════════════════════════════════════
    // FULL-SCREEN PARTICLE ENGINE
    // ══════════════════════════════════════════════════════════
    particles: [],
    arcs: [],
    shootingStars: [],
    W: 0, H: 0,

    _startViz() {
        if (!this.canvas || !this.ctx) return;
        this._resizeCanvas();
        window.addEventListener('resize', () => this._resizeCanvas());
        this._initParticles();
        this._drawViz();
    },

    _resizeCanvas() {
        const dpr = window.devicePixelRatio || 1;
        this.W = window.innerWidth;
        this.H = window.innerHeight;
        this.canvas.width = this.W * dpr;
        this.canvas.height = this.H * dpr;
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    },

    _stopViz() {
        if (this.animFrame) {
            cancelAnimationFrame(this.animFrame);
            this.animFrame = null;
        }
    },

    _initParticles() {
        this.particles = [];
        this.arcs = [];
        this.shootingStars = [];
        const cx = this.W / 2, cy = this.H * 0.38;
        const baseR = Math.min(this.W, this.H) * 0.12;

        // SPHERE TRACE PARTICLES — orbit in shells to form the sphere outline
        for (let shell = 0; shell < 7; shell++) {
            const r = baseR + shell * (baseR * 0.14);
            const count = 25 + shell * 12;
            const dir = shell % 2 === 0 ? 1 : -1;
            for (let i = 0; i < count; i++) {
                this.particles.push({
                    type: 'sphere',
                    angle: (i / count) * Math.PI * 2 + Math.random() * 0.4,
                    radius: r + (Math.random() - 0.5) * 8,
                    speed: (0.12 + shell * 0.04) * dir + (Math.random() - 0.5) * 0.06,
                    size: 0.6 + Math.random() * 1.6,
                    alpha: 0.12 + Math.random() * 0.4,
                    hue: Math.random() > 0.75 ? 265 : 187,
                    wobblePhase: Math.random() * Math.PI * 2,
                    wobbleFreq: 0.8 + Math.random() * 2.5,
                    wobbleAmp: 2 + Math.random() * 10,
                    trail: [],
                    trailLen: 4 + Math.floor(Math.random() * 10),
                });
            }
        }

        // FREE-FLYING PARTICLES — drift across the full screen
        const flyCount = Math.floor(Math.max(80, this.W * this.H / 8000));
        for (let i = 0; i < flyCount; i++) {
            this.particles.push({
                type: 'free',
                x: Math.random() * this.W,
                y: Math.random() * this.H,
                vx: (Math.random() - 0.5) * 0.6,
                vy: (Math.random() - 0.5) * 0.6,
                size: 0.4 + Math.random() * 2,
                alpha: 0.03 + Math.random() * 0.12,
                hue: Math.random() > 0.65 ? 265 : 187,
                life: Math.random() * 999,
                driftAngle: Math.random() * Math.PI * 2,
                driftSpeed: 0.001 + Math.random() * 0.003,
            });
        }

        // EDGE PARTICLES — float along screen edges
        for (let i = 0; i < 40; i++) {
            const edge = Math.floor(Math.random() * 4);
            let x, y, vx, vy;
            if (edge === 0) { x = Math.random() * this.W; y = 0; vx = (Math.random()-0.5)*0.3; vy = 0.2 + Math.random()*0.3; }
            else if (edge === 1) { x = this.W; y = Math.random() * this.H; vx = -(0.2 + Math.random()*0.3); vy = (Math.random()-0.5)*0.3; }
            else if (edge === 2) { x = Math.random() * this.W; y = this.H; vx = (Math.random()-0.5)*0.3; vy = -(0.2 + Math.random()*0.3); }
            else { x = 0; y = Math.random() * this.H; vx = 0.2 + Math.random()*0.3; vy = (Math.random()-0.5)*0.3; }
            this.particles.push({
                type: 'edge', x, y, vx, vy,
                size: 0.5 + Math.random() * 1.5,
                alpha: 0.05 + Math.random() * 0.1,
                hue: 187,
                trail: [], trailLen: 8 + Math.floor(Math.random() * 15),
            });
        }

        this._spawnArcs(5);
    },

    _spawnArcs(n) {
        const cx = this.W / 2, cy = this.H * 0.38;
        const baseR = Math.min(this.W, this.H) * 0.12;
        for (let i = 0; i < n; i++) {
            const a0 = Math.random() * Math.PI * 2;
            this.arcs.push({
                a0, a1: a0 + 0.2 + Math.random() * 1.5,
                r: baseR * (0.7 + Math.random() * 1.2),
                cx, cy,
                life: 0, max: 15 + Math.random() * 50,
                w: 0.3 + Math.random() * 1.8,
                hue: Math.random() > 0.4 ? 187 : 265,
            });
        }
    },

    _spawnShootingStar() {
        const fromEdge = Math.random() > 0.5;
        let x, y, angle;
        if (fromEdge) {
            const side = Math.floor(Math.random() * 4);
            if (side === 0) { x = Math.random() * this.W; y = -5; }
            else if (side === 1) { x = this.W + 5; y = Math.random() * this.H; }
            else if (side === 2) { x = Math.random() * this.W; y = this.H + 5; }
            else { x = -5; y = Math.random() * this.H; }
            angle = Math.atan2(this.H * 0.38 - y, this.W / 2 - x) + (Math.random() - 0.5) * 1;
        } else {
            const cx = this.W / 2, cy = this.H * 0.38;
            const a = Math.random() * Math.PI * 2;
            const r = Math.min(this.W, this.H) * 0.12;
            x = cx + Math.cos(a) * r;
            y = cy + Math.sin(a) * r;
            angle = a + (Math.random() - 0.5) * 0.5;
        }
        const speed = 3 + Math.random() * 6;
        this.shootingStars.push({
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: 1 + Math.random() * 2,
            alpha: 0.5 + Math.random() * 0.5,
            life: 0, max: 30 + Math.random() * 80,
            hue: Math.random() > 0.6 ? 265 : 187,
            trail: [], trailLen: 10 + Math.floor(Math.random() * 20),
        });
    },

    _drawViz() {
        if (!this.isActive) return;
        const ctx = this.ctx;
        const W = this.W, H = this.H;
        const cx = W / 2, cy = H * 0.38;
        const t = Date.now() / 1000;
        const baseR = Math.min(W, H) * 0.12;

        const I = this.state === 'speaking' ? 2.2
            : this.state === 'listening' ? 1.6
            : this.state === 'thinking' ? 1.3 : 0.7;

        // Fade (creates trail effect)
        ctx.fillStyle = `rgba(2, 4, 12, ${0.15 + (1 - I * 0.3) * 0.1})`;
        ctx.fillRect(0, 0, W, H);

        // ── NEBULA CLOUDS (full screen) ──
        const nebulaData = [
            { ox: -0.15, oy: -0.08, r: 0.25, hue: 187 },
            { ox: 0.12, oy: 0.05, r: 0.2, hue: 265 },
            { ox: 0, oy: -0.02, r: 0.18, hue: 200 },
            { ox: -0.25, oy: 0.2, r: 0.15, hue: 187 },
            { ox: 0.3, oy: -0.15, r: 0.12, hue: 265 },
        ];
        nebulaData.forEach((n, i) => {
            const nx = cx + Math.cos(t * 0.08 + i * 1.7) * W * n.ox;
            const ny = cy + Math.sin(t * 0.06 + i * 2.3) * H * n.oy;
            const nr = Math.min(W, H) * n.r * (0.9 + Math.sin(t * 0.3 + i) * 0.15) * I * 0.6;
            const g = ctx.createRadialGradient(nx, ny, 0, nx, ny, nr);
            g.addColorStop(0, `hsla(${n.hue}, 80%, 45%, ${0.025 * I})`);
            g.addColorStop(0.6, `hsla(${n.hue}, 70%, 35%, ${0.01 * I})`);
            g.addColorStop(1, 'transparent');
            ctx.beginPath();
            ctx.arc(nx, ny, nr, 0, Math.PI * 2);
            ctx.fillStyle = g;
            ctx.fill();
        });

        // ── HORIZONTAL BEAM (full width) ──
        const bA = (0.03 + I * 0.05) * (0.8 + Math.sin(t * 3) * 0.2);
        const bG = ctx.createLinearGradient(0, cy, W, cy);
        bG.addColorStop(0, 'transparent');
        bG.addColorStop(0.15, `hsla(187, 80%, 55%, ${bA * 0.2})`);
        bG.addColorStop(0.4, `hsla(187, 80%, 55%, ${bA * 0.7})`);
        bG.addColorStop(0.5, `hsla(187, 80%, 60%, ${bA})`);
        bG.addColorStop(0.6, `hsla(187, 80%, 55%, ${bA * 0.7})`);
        bG.addColorStop(0.85, `hsla(187, 80%, 55%, ${bA * 0.2})`);
        bG.addColorStop(1, 'transparent');
        ctx.fillStyle = bG;
        const bH1 = 1.5 + I * 2.5 + Math.sin(t * 5) * 0.8;
        ctx.fillRect(0, cy - bH1 / 2, W, bH1);
        // Soft glow beam
        ctx.globalAlpha = 0.35;
        const bH2 = 6 + I * 10;
        ctx.fillRect(0, cy - bH2 / 2, W, bH2);
        ctx.globalAlpha = 1;

        // ── SPHERE PARTICLES + TRAILS ──
        this.particles.forEach(p => {
            if (p.type === 'sphere') {
                p.angle += p.speed * 0.016 * I;
                const w = Math.sin(t * p.wobbleFreq + p.wobblePhase) * p.wobbleAmp * I;
                const r = p.radius + w;
                const x = cx + Math.cos(p.angle) * r;
                const y = cy + Math.sin(p.angle) * r;
                p.trail.push({ x, y });
                if (p.trail.length > p.trailLen) p.trail.shift();

                // Trail
                if (p.trail.length > 1) {
                    ctx.beginPath();
                    ctx.moveTo(p.trail[0].x, p.trail[0].y);
                    for (let j = 1; j < p.trail.length; j++) ctx.lineTo(p.trail[j].x, p.trail[j].y);
                    ctx.strokeStyle = `hsla(${p.hue}, 85%, 60%, ${p.alpha * 0.25 * I})`;
                    ctx.lineWidth = p.size * 0.5;
                    ctx.stroke();
                }
                // Dot
                const s = p.size * (0.7 + I * 0.4);
                ctx.beginPath();
                ctx.arc(x, y, s, 0, Math.PI * 2);
                ctx.fillStyle = `hsla(${p.hue}, 85%, 62%, ${p.alpha * I * 0.9})`;
                ctx.fill();
                // Glow
                if (I > 1) {
                    ctx.beginPath();
                    ctx.arc(x, y, s * 3.5, 0, Math.PI * 2);
                    ctx.fillStyle = `hsla(${p.hue}, 80%, 55%, ${p.alpha * 0.04 * I})`;
                    ctx.fill();
                }

            } else if (p.type === 'free') {
                p.driftAngle += p.driftSpeed;
                p.x += p.vx * I + Math.cos(p.driftAngle) * 0.15;
                p.y += p.vy * I + Math.sin(p.driftAngle) * 0.15;
                p.life++;
                if (p.x < -10) p.x = W + 10;
                if (p.x > W + 10) p.x = -10;
                if (p.y < -10) p.y = H + 10;
                if (p.y > H + 10) p.y = -10;
                const fl = 0.5 + Math.sin(t * 2 + p.life * 0.05) * 0.5;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * (0.8 + I * 0.2), 0, Math.PI * 2);
                ctx.fillStyle = `hsla(${p.hue}, 70%, 55%, ${p.alpha * fl * I})`;
                ctx.fill();

            } else if (p.type === 'edge') {
                p.x += p.vx * I;
                p.y += p.vy * I;
                if (p.x < -20 || p.x > W + 20 || p.y < -20 || p.y > H + 20) {
                    // Reset to random edge
                    const e = Math.floor(Math.random() * 4);
                    if (e === 0) { p.x = Math.random() * W; p.y = 0; p.vx = (Math.random()-0.5)*0.3; p.vy = 0.2+Math.random()*0.3; }
                    else if (e === 1) { p.x = W; p.y = Math.random() * H; p.vx = -(0.2+Math.random()*0.3); p.vy = (Math.random()-0.5)*0.3; }
                    else if (e === 2) { p.x = Math.random() * W; p.y = H; p.vx = (Math.random()-0.5)*0.3; p.vy = -(0.2+Math.random()*0.3); }
                    else { p.x = 0; p.y = Math.random() * H; p.vx = 0.2+Math.random()*0.3; p.vy = (Math.random()-0.5)*0.3; }
                    p.trail = [];
                }
                p.trail.push({ x: p.x, y: p.y });
                if (p.trail.length > p.trailLen) p.trail.shift();
                if (p.trail.length > 1) {
                    ctx.beginPath();
                    ctx.moveTo(p.trail[0].x, p.trail[0].y);
                    for (let j = 1; j < p.trail.length; j++) ctx.lineTo(p.trail[j].x, p.trail[j].y);
                    ctx.strokeStyle = `hsla(${p.hue}, 75%, 55%, ${p.alpha * 0.5 * I})`;
                    ctx.lineWidth = p.size * 0.4;
                    ctx.stroke();
                }
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fillStyle = `hsla(${p.hue}, 75%, 55%, ${p.alpha * I})`;
                ctx.fill();
            }
        });

        // ── ENERGY ARCS ──
        this.arcs = this.arcs.filter(a => {
            a.life++;
            if (a.life > a.max) return false;
            const prog = a.life / a.max;
            const fade = Math.min(1, a.life / 4) * Math.max(0, 1 - (prog - 0.6) / 0.4);
            const al = fade * 0.5 * I;
            ctx.beginPath();
            for (let i = 0; i <= 15; i++) {
                const ang = a.a0 + (a.a1 - a.a0) * (i / 15);
                const jit = (Math.random() - 0.5) * 5 * I;
                const x = a.cx + Math.cos(ang) * (a.r + jit);
                const y = a.cy + Math.sin(ang) * (a.r + jit);
                i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
            }
            ctx.strokeStyle = `hsla(${a.hue}, 85%, 65%, ${al})`;
            ctx.lineWidth = a.w;
            ctx.stroke();
            ctx.strokeStyle = `hsla(${a.hue}, 85%, 65%, ${al * 0.25})`;
            ctx.lineWidth = a.w * 5;
            ctx.stroke();
            return true;
        });
        const arcRate = I > 1.5 ? 0.2 : I > 1 ? 0.08 : 0.015;
        if (Math.random() < arcRate) this._spawnArcs(1 + Math.floor(Math.random() * 2));

        // ── SHOOTING STARS ──
        this.shootingStars = this.shootingStars.filter(s => {
            s.life++;
            if (s.life > s.max) return false;
            s.x += s.vx; s.y += s.vy;
            s.vx *= 0.985; s.vy *= 0.985;
            s.trail.push({ x: s.x, y: s.y });
            if (s.trail.length > s.trailLen) s.trail.shift();
            const fo = 1 - s.life / s.max;
            if (s.trail.length > 1) {
                ctx.beginPath();
                ctx.moveTo(s.trail[0].x, s.trail[0].y);
                for (let j = 1; j < s.trail.length; j++) ctx.lineTo(s.trail[j].x, s.trail[j].y);
                ctx.strokeStyle = `hsla(${s.hue}, 80%, 60%, ${s.alpha * fo * 0.35})`;
                ctx.lineWidth = s.size * 0.5;
                ctx.stroke();
            }
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size * fo, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${s.hue}, 85%, 68%, ${s.alpha * fo})`;
            ctx.fill();
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size * 3.5 * fo, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${s.hue}, 80%, 60%, ${s.alpha * fo * 0.08})`;
            ctx.fill();
            return true;
        });
        const starRate = I > 1.5 ? 0.3 : I > 1 ? 0.1 : 0.02;
        if (Math.random() < starRate) this._spawnShootingStar();

        // ── THE SPHERE — BALL OF DEATH & DESPAIR ──
        const sphereR = baseR * (0.55 + Math.sin(t * 0.8) * 0.04 + I * 0.12);

        // Layer 1: Outer sinister aura (large, faint, pulsing)
        const auraR = sphereR * (2.8 + Math.sin(t * 0.5) * 0.4);
        const auraG = ctx.createRadialGradient(cx, cy, sphereR * 0.3, cx, cy, auraR);
        auraG.addColorStop(0, `hsla(270, 70%, 15%, ${0.06 * I})`);
        auraG.addColorStop(0.3, `hsla(300, 60%, 10%, ${0.04 * I})`);
        auraG.addColorStop(0.6, `hsla(187, 50%, 8%, ${0.02 * I})`);
        auraG.addColorStop(1, 'transparent');
        ctx.beginPath();
        ctx.arc(cx, cy, auraR, 0, Math.PI * 2);
        ctx.fillStyle = auraG;
        ctx.fill();

        // Layer 2: Distortion halo ring
        const haloR = sphereR * (1.15 + Math.sin(t * 2.5) * 0.06);
        const haloWidth = 1.5 + I * 1.5 + Math.sin(t * 4) * 0.5;
        ctx.beginPath();
        ctx.arc(cx, cy, haloR, 0, Math.PI * 2);
        ctx.strokeStyle = `hsla(187, 90%, 50%, ${0.08 + I * 0.06})`;
        ctx.lineWidth = haloWidth;
        ctx.stroke();
        // Second halo, offset phase
        const haloR2 = sphereR * (1.25 + Math.cos(t * 1.8) * 0.05);
        ctx.beginPath();
        ctx.arc(cx, cy, haloR2, 0, Math.PI * 2);
        ctx.strokeStyle = `hsla(265, 80%, 45%, ${0.04 + I * 0.04})`;
        ctx.lineWidth = haloWidth * 0.6;
        ctx.stroke();

        // Layer 3: The dark void core (solid sphere body)
        const darkG = ctx.createRadialGradient(cx - sphereR * 0.2, cy - sphereR * 0.2, 0, cx, cy, sphereR);
        darkG.addColorStop(0, `hsla(240, 20%, ${4 + I * 2}%, 0.95)`);
        darkG.addColorStop(0.3, `hsla(260, 30%, ${3 + I}%, 0.92)`);
        darkG.addColorStop(0.7, `hsla(270, 40%, ${2 + I * 0.5}%, 0.88)`);
        darkG.addColorStop(0.92, `hsla(187, 60%, ${5 + I * 3}%, 0.7)`);
        darkG.addColorStop(1, `hsla(187, 80%, ${12 + I * 5}%, 0.3)`);
        ctx.beginPath();
        ctx.arc(cx, cy, sphereR, 0, Math.PI * 2);
        ctx.fillStyle = darkG;
        ctx.fill();

        // Layer 4: Inner energy rings (concentric pulsing bands)
        for (let ring = 0; ring < 4; ring++) {
            const rr = sphereR * (0.25 + ring * 0.18);
            const ringPulse = Math.sin(t * (1.5 + ring * 0.7) + ring * 1.2);
            const ringAlpha = (0.04 + ringPulse * 0.03) * I;
            if (ringAlpha > 0) {
                ctx.beginPath();
                ctx.arc(cx, cy, rr + ringPulse * 3, 0, Math.PI * 2);
                ctx.strokeStyle = `hsla(${ring % 2 === 0 ? 187 : 280}, 70%, 50%, ${ringAlpha})`;
                ctx.lineWidth = 0.5 + I * 0.5;
                ctx.stroke();
            }
        }

        // Layer 5: Fracture veins crawling across the sphere surface
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, sphereR - 1, 0, Math.PI * 2);
        ctx.clip();
        const veinCount = 12;
        for (let v = 0; v < veinCount; v++) {
            const vAngle = (v / veinCount) * Math.PI * 2 + t * 0.15;
            const vLen = sphereR * (0.5 + Math.sin(t * 0.9 + v * 2.1) * 0.3);
            const startX = cx + Math.cos(vAngle) * sphereR * 0.08;
            const startY = cy + Math.sin(vAngle) * sphereR * 0.08;
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            let vx = startX, vy = startY;
            const segments = 6 + Math.floor(Math.random() * 2);
            for (let s = 1; s <= segments; s++) {
                const frac = s / segments;
                const jitter = (Math.sin(t * 3.5 + v * 5 + s * 1.7) * 0.3 + (Math.sin(t * 7 + v + s * 3) * 0.15));
                vx = cx + Math.cos(vAngle + jitter) * vLen * frac;
                vy = cy + Math.sin(vAngle + jitter) * vLen * frac;
                ctx.lineTo(vx, vy);
            }
            const veinPulse = 0.5 + Math.sin(t * 2 + v * 1.3) * 0.5;
            const veinHue = v % 3 === 0 ? 187 : v % 3 === 1 ? 265 : 310;
            ctx.strokeStyle = `hsla(${veinHue}, 80%, 55%, ${(0.08 + veinPulse * 0.12) * I})`;
            ctx.lineWidth = 0.4 + veinPulse * 0.8 * I;
            ctx.stroke();
            // Glow on veins
            ctx.strokeStyle = `hsla(${veinHue}, 70%, 45%, ${(0.02 + veinPulse * 0.04) * I})`;
            ctx.lineWidth = 2 + veinPulse * 3 * I;
            ctx.stroke();
        }
        ctx.restore();

        // Layer 6: Specular highlight (3D illusion — faint top-left shine)
        const specG = ctx.createRadialGradient(
            cx - sphereR * 0.3, cy - sphereR * 0.35, 0,
            cx - sphereR * 0.15, cy - sphereR * 0.15, sphereR * 0.6
        );
        specG.addColorStop(0, `hsla(200, 60%, 70%, ${0.06 * I})`);
        specG.addColorStop(0.5, `hsla(220, 40%, 50%, ${0.02 * I})`);
        specG.addColorStop(1, 'transparent');
        ctx.beginPath();
        ctx.arc(cx, cy, sphereR, 0, Math.PI * 2);
        ctx.fillStyle = specG;
        ctx.fill();

        // Layer 7: Edge rim light (thin bright border)
        const rimG = ctx.createRadialGradient(cx, cy, sphereR * 0.85, cx, cy, sphereR);
        rimG.addColorStop(0, 'transparent');
        rimG.addColorStop(0.7, `hsla(187, 90%, 55%, ${0.03 * I})`);
        rimG.addColorStop(1, `hsla(187, 85%, 60%, ${(0.12 + Math.sin(t * 3) * 0.05) * I})`);
        ctx.beginPath();
        ctx.arc(cx, cy, sphereR, 0, Math.PI * 2);
        ctx.fillStyle = rimG;
        ctx.fill();

        // Layer 8: Pulsing death-energy flicker at the core
        const flickR = sphereR * (0.12 + Math.sin(t * 6) * 0.04 + I * 0.06);
        const flickG = ctx.createRadialGradient(cx, cy, 0, cx, cy, flickR);
        flickG.addColorStop(0, `hsla(187, 100%, 75%, ${(0.2 + Math.sin(t * 8) * 0.1) * I})`);
        flickG.addColorStop(0.4, `hsla(260, 80%, 50%, ${0.1 * I})`);
        flickG.addColorStop(1, 'transparent');
        ctx.beginPath();
        ctx.arc(cx, cy, flickR, 0, Math.PI * 2);
        ctx.fillStyle = flickG;
        ctx.fill();

        // ── CORE GLOW (enhanced to complement the sphere) ──
        const cR = baseR * (0.5 + Math.sin(t * 1.5) * 0.1 + I * 0.25);
        const cG = ctx.createRadialGradient(cx, cy, 0, cx, cy, cR);
        cG.addColorStop(0, `hsla(187, 85%, 55%, ${0.1 * I})`);
        cG.addColorStop(0.4, `hsla(187, 80%, 45%, ${0.04 * I})`);
        cG.addColorStop(1, 'transparent');
        ctx.beginPath();
        ctx.arc(cx, cy, cR, 0, Math.PI * 2);
        ctx.fillStyle = cG;
        ctx.fill();

        this.animFrame = requestAnimationFrame(() => this._drawViz());
    },
};

// ── Initialize on DOM ready ──────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    AlphaEon.init();
});

window.AlphaEon = AlphaEon;
