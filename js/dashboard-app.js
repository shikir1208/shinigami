// dashboard-app.js
// Live sensor data from Firebase (no simulation)
let dashboardLiveData = {};   // { patientId: { ppg:{value,wave}, spo2:{value,wave}, gsr:{...}, emg:{...}, imu:{...} } }
let dashboardCharts = {};
let dashboardListeners = {};  // Firestore unsubscribe functions
let compareList = [];

window.navigateTo = function(url) {
    document.body.classList.add('fade-out');
    setTimeout(() => {
        window.location.href = url;
    }, 300);
};

// Body scroll lock — prevents dashboard scrolling behind modals/overlays
function lockBodyScroll() { document.body.style.overflow = 'hidden'; }
function unlockBodyScroll() { document.body.style.overflow = ''; }

document.addEventListener('DOMContentLoaded', () => {
    Auth.requireAuth();
    
    // Set UI
    const user = Auth.getUser();
    document.getElementById('doctor-name').textContent = `Dr. ${user.username}`;
    
    // Initialize Phi-3.5 Hero AI Orb Visualizer
    if (typeof OrbVisualizer !== 'undefined' && document.getElementById('ai-hero-orb')) {
        window.activeOrb = new OrbVisualizer('ai-hero-orb');
    }

    // Hero AI In-Place Command Console Handler
    const heroInput = document.getElementById('ai-hero-input');
    const heroSubmit = document.getElementById('ai-hero-submit');
    const actionPills = document.querySelectorAll('.ai-prompt-pill');
    const consoleCard = document.getElementById('ai-console-card');
    const consoleText = document.getElementById('ai-console-text');
    const consoleClose = document.getElementById('ai-console-close');

    if (consoleClose) {
        consoleClose.addEventListener('click', () => {
            if (consoleCard) consoleCard.style.display = 'none';
        });
    }

    const handleHeroAIQuery = async (queryText) => {
        if (!queryText) return;
        if (window.activeOrb) window.activeOrb.setState('thinking');
        
        if (consoleCard) consoleCard.style.display = 'block';
        if (consoleText) consoleText.innerHTML = '<span class="ai-typing-cursor">✦ Phi-3.5 Engine Executing Telemetry Reasoner...</span>';

        const response = await Alpha1Brain.query(queryText);

        if (consoleText) {
            // Typewriter stream effect
            consoleText.innerHTML = '';
            let formattedHtml = response
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\n/g, '<br>');
            
            let i = 0;
            const speed = 12;
            const typeWriter = () => {
                if (i < formattedHtml.length) {
                    if (formattedHtml.substring(i, i + 4) === '<br>') {
                        consoleText.innerHTML += '<br>';
                        i += 4;
                    } else {
                        consoleText.innerHTML += formattedHtml.charAt(i);
                        i++;
                    }
                    setTimeout(typeWriter, speed);
                } else {
                    if (window.activeOrb) window.activeOrb.setState('speaking');
                    setTimeout(() => { if (window.activeOrb) window.activeOrb.setState('idle'); }, 2000);
                }
            };
            typeWriter();
        }
    };

    if (heroSubmit) {
        heroSubmit.addEventListener('click', () => {
            handleHeroAIQuery(heroInput ? heroInput.value : '');
        });
    }
    if (heroInput) {
        heroInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') handleHeroAIQuery(heroInput.value);
        });
    }
    actionPills.forEach(pill => {
        pill.addEventListener('click', () => {
            const prompt = pill.getAttribute('data-prompt');
            if (heroInput) heroInput.value = prompt;
            handleHeroAIQuery(prompt);
        });
    });


    // Load patients — subscribe to real-time Firestore updates
    PatientsDB.onUpdate((patients) => {
        const filtered = getFilteredAndSortedPatients();
        renderPatients(filtered);
        updateStats();
    });
    // Also do an initial render from cache
    const patients = PatientsDB.getAll();
    if (patients.length > 0) {
        renderPatients(patients);
        updateStats();
    }

    const searchInput = document.getElementById('patient-search');
    const sortSelect = document.getElementById('sort-select');

    function getFilteredAndSortedPatients() {
        let currentPatients = PatientsDB.getAll();
        
        const query = searchInput.value.toLowerCase();
        if (query) {
            currentPatients = currentPatients.filter(p => 
                p.name.toLowerCase().includes(query) || 
                p.id.toLowerCase().includes(query) || 
                p.ward.toLowerCase().includes(query)
            );
        }

        const sortVal = sortSelect.value;
        currentPatients.sort((a, b) => {
            if (sortVal === 'admission-desc') {
                return new Date(b.date) - new Date(a.date);
            } else if (sortVal === 'admission-asc') {
                return new Date(a.date) - new Date(b.date);
            } else if (sortVal === 'name-asc') {
                return a.name.localeCompare(b.name);
            } else if (sortVal === 'name-desc') {
                return b.name.localeCompare(a.name);
            } else if (sortVal === 'severity') {
                const getSev = (p) => {
                    if (p.conditionProfile === 'critical_multi') return 3;
                    if (p.conditionProfile !== 'normal') return 2;
                    return 1;
                };
                if (getSev(b) === getSev(a)) {
                     return new Date(b.date) - new Date(a.date);
                }
                return getSev(b) - getSev(a);
            }
            return 0;
        });
        
        return currentPatients;
    }

    function updatePatientList() {
        const currentPatients = getFilteredAndSortedPatients();
        renderPatients(currentPatients);
        updateStats();
    }

    searchInput.addEventListener('input', updatePatientList);
    sortSelect.addEventListener('change', updatePatientList);

    // Modal Logic
    const modal = document.getElementById('add-patient-modal');
    const btnAdd = document.getElementById('btn-add-patient');
    const btnClose = document.getElementById('btn-close-modal');
    const btnResync = document.getElementById('btn-resync-db');
    const form = document.getElementById('form-add-patient');

    if (btnResync) {
        btnResync.addEventListener('click', async () => {
            if (confirm("Are you sure you want to resync the database? This will delete all current patients and restore the defaults.")) {
                try {
                    // Wipe the cache to prevent immediate re-renders
                    PatientsDB._cache = [];
                    // We only need to delete the patients collection docs
                    // The init() function will recreate the defaults
                    const currentPatients = await db.collection('patients').get();
                    const batch = db.batch();
                    currentPatients.forEach(doc => {
                        batch.delete(doc.ref);
                    });
                    await batch.commit();
                    
                    // Force re-init to seed defaults
                    PatientsDB._initialized = false;
                    await PatientsDB.init();
                    alert("Database resynced successfully.");
                } catch (err) {
                    console.error("Failed to resync DB:", err);
                    alert("Failed to resync database.");
                }
            }
        });
    }

    btnAdd.addEventListener('click', () => { modal.classList.add('active'); lockBodyScroll(); });
    btnClose.addEventListener('click', () => { modal.classList.remove('active'); unlockBodyScroll(); });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) { modal.classList.remove('active'); unlockBodyScroll(); }
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newPatient = {
            name: document.getElementById('pt-new-name').value,
            age: parseInt(document.getElementById('pt-new-age').value),
            gender: document.getElementById('pt-new-gender').value,
            ward: document.getElementById('pt-new-ward').value,
            conditionProfile: document.getElementById('pt-new-condition').value
        };
        
        await PatientsDB.addPatient(newPatient);
        
        // Firestore listener will auto-refresh the patient list
        modal.classList.remove('active');
        unlockBodyScroll();
        form.reset();
    });

    // Chart rendering loop — reads from dashboardLiveData (populated by Firebase listeners)
    let lastStatsUpdate = performance.now();
    function dashRenderLoop(time) {
        const currentPatients = PatientsDB.getAll();
        currentPatients.forEach(p => {
            const liveData = dashboardLiveData[p.id];
            const charts = dashboardCharts[p.id];
            if (liveData && charts) {
                // Push data to charts
                if (liveData.ppg) {
                    charts.hr.pushData(liveData.ppg.wave || 0);
                    charts.hr.render();
                    const hrEl = document.getElementById(`dash-hr-${p.id}`);
                    if (hrEl) hrEl.textContent = liveData.ppg.value || '--';
                }
                if (liveData.spo2) {
                    charts.spo2.pushData(liveData.spo2.wave || liveData.spo2.value || 0);
                    charts.spo2.render();
                    const spo2El = document.getElementById(`dash-spo2-${p.id}`);
                    if (spo2El) spo2El.textContent = `${liveData.spo2.value || '--'}%`;
                }

                // Update compare modal if active
                if (charts.compHr && liveData.ppg) {
                    charts.compHr.pushData(liveData.ppg.wave || 0);
                    charts.compHr.render();
                    const cHrEl = document.getElementById(`comp-hr-${p.id}`);
                    const cSpo2El = document.getElementById(`comp-spo2-${p.id}`);
                    if (cHrEl) cHrEl.textContent = liveData.ppg.value || '--';
                    if (cSpo2El && liveData.spo2) cSpo2El.textContent = `${liveData.spo2.value || '--'}%`;
                }
            }
        });

        if (time - lastStatsUpdate > 2000) {
            updateStats();
            lastStatsUpdate = time;
        }
        requestAnimationFrame(dashRenderLoop);
    }
    requestAnimationFrame(dashRenderLoop);

    // Settings Logic
    const settingsModal = document.getElementById('settings-modal');
    document.getElementById('btn-settings').addEventListener('click', () => {
        const s = Settings.get();
        document.getElementById('setting-theme').value = s.theme;
        document.getElementById('setting-sound').value = s.sound;
        document.getElementById('setting-gemini-key').value = s.geminiApiKey || '';
        document.getElementById('setting-openai-key').value = s.openaiApiKey || '';
        document.getElementById('setting-claude-key').value = s.claudeApiKey || '';
        document.getElementById('setting-deepseek-key').value = s.deepseekApiKey || '';
        document.getElementById('setting-groq-key').value = s.groqApiKey || '';
        document.getElementById('setting-ollama-enabled').checked = s.ollamaEnabled === true || s.ollamaEnabled === 'true';
        document.getElementById('setting-elevenlabs-key').value = s.elevenLabsApiKey || '';
        document.getElementById('setting-elevenlabs-voice').value = s.elevenLabsVoiceId || 'G17SuINrv2H9FC6nvetn';
        settingsModal.classList.add('active');
        lockBodyScroll();
    });
    document.getElementById('btn-close-settings').addEventListener('click', () => { settingsModal.classList.remove('active'); unlockBodyScroll(); });
    document.getElementById('btn-save-settings').addEventListener('click', () => {
        Settings.update({
            theme: document.getElementById('setting-theme').value,
            sound: document.getElementById('setting-sound').value,
            geminiApiKey: document.getElementById('setting-gemini-key').value.trim(),
            openaiApiKey: document.getElementById('setting-openai-key').value.trim(),
            claudeApiKey: document.getElementById('setting-claude-key').value.trim(),
            deepseekApiKey: document.getElementById('setting-deepseek-key').value.trim(),
            groqApiKey: document.getElementById('setting-groq-key').value.trim(),
            ollamaEnabled: document.getElementById('setting-ollama-enabled').checked,
            elevenLabsApiKey: document.getElementById('setting-elevenlabs-key').value.trim(),
            elevenLabsVoiceId: document.getElementById('setting-elevenlabs-voice').value.trim()
        });
        updateProviderSelector();
        settingsModal.classList.remove('active');
        unlockBodyScroll();
    });

    // AI Chat Logic
    const aiModal = document.getElementById('ai-chat-modal');
    const aiBody = document.getElementById('ai-chat-body');
    const aiInput = document.getElementById('ai-chat-input');
    const aiSend = document.getElementById('ai-chat-send');
    let aiIsProcessing = false;

    // AI Provider Selector
    const providerSelect = document.getElementById('ai-provider-select');
    function updateProviderSelector() {
        const configured = AIChat.getConfiguredProviders();
        providerSelect.innerHTML = '';
        if (configured.length === 0) {
            providerSelect.innerHTML = '<option value="">No API Keys</option>';
            return;
        }
        configured.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.textContent = p.badge;
            opt.style.color = p.color;
            if (AIChat.getActiveProvider() === p.id) opt.selected = true;
            providerSelect.appendChild(opt);
        });
    }
    providerSelect.addEventListener('change', (e) => {
        AIChat.setProvider(e.target.value);
        AIChat.clearHistory();
        renderAIWelcome();
    });
    updateProviderSelector();

    function renderAIWelcome() {
        const provider = AIChat.getActiveProvider();
        if (!provider) {
            aiBody.innerHTML = `
                <div class="ai-api-key-prompt">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--accent-teal)" stroke-width="1.5" opacity="0.5"><path d="M12 2a4 4 0 0 1 4 4v1a3 3 0 0 1 3 3v1a2 2 0 0 1-2 2h-1l-1 7H9l-1-7H7a2 2 0 0 1-2-2v-1a3 3 0 0 1 3-3V6a4 4 0 0 1 4-4z"/><circle cx="9" cy="10" r="1"/><circle cx="15" cy="10" r="1"/></svg>
                    <h3 style="color:var(--text-primary);">API Key Required</h3>
                    <p>To use Alpha1 AI, add at least one API key (Gemini, ChatGPT, Claude, or DeepSeek) in <strong>Settings</strong>.</p>
                    <button class="btn btn-primary" onclick="document.getElementById('ai-chat-modal').classList.remove('active'); document.getElementById('btn-settings').click();">Open Settings</button>
                </div>`;
            return;
        }

        const providerInfo = AIChat.PROVIDERS[provider];
        
        if (AIChat.history.length === 0) {
            aiBody.innerHTML = `
                <div class="ai-chat-welcome">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2a4 4 0 0 1 4 4v1a3 3 0 0 1 3 3v1a2 2 0 0 1-2 2h-1l-1 7H9l-1-7H7a2 2 0 0 1-2-2v-1a3 3 0 0 1 3-3V6a4 4 0 0 1 4-4z"/><circle cx="9" cy="10" r="1"/><circle cx="15" cy="10" r="1"/></svg>
                    <h3>How can I help, Doctor?</h3>
                    <p>Powered by <strong style="color:${providerInfo.color};">${providerInfo.name}</strong>. I can assist with differential diagnoses, treatment protocols, drug interactions, and emergency procedures.</p>
                    <div class="ai-chat-suggestions">
                        <button class="ai-suggestion-chip" data-q="What are the common causes of tachycardia in ICU patients?">Causes of tachycardia</button>
                        <button class="ai-suggestion-chip" data-q="Explain the management protocol for acute hypoxemia with SpO2 below 90%">Hypoxemia management</button>
                        <button class="ai-suggestion-chip" data-q="What drug interactions should I watch for with heparin and aspirin?">Drug interactions</button>
                        <button class="ai-suggestion-chip" data-q="Differential diagnosis for sudden onset bradycardia in a 67-year-old male">Bradycardia DDx</button>
                    </div>
                </div>`;
            
            aiBody.querySelectorAll('.ai-suggestion-chip').forEach(chip => {
                chip.addEventListener('click', () => {
                    aiInput.value = chip.dataset.q;
                    handleAISend();
                });
            });
        }
    }

    function appendAIMessage(role, content) {
        // Remove welcome if present
        const welcome = aiBody.querySelector('.ai-chat-welcome, .ai-api-key-prompt');
        if (welcome) welcome.remove();

        const msg = document.createElement('div');
        msg.className = `ai-msg ${role}`;
        
        const avatar = document.createElement('div');
        avatar.className = 'ai-msg-avatar';
        avatar.textContent = role === 'user' ? 'Dr' : 'AI';
        
        const bubble = document.createElement('div');
        bubble.className = 'ai-msg-bubble';
        bubble.innerHTML = role === 'assistant' ? AIChat.formatResponse(content) : content.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        
        msg.appendChild(avatar);
        msg.appendChild(bubble);
        aiBody.appendChild(msg);
        aiBody.scrollTop = aiBody.scrollHeight;
    }

    function showAITyping() {
        const typing = document.createElement('div');
        typing.className = 'ai-typing';
        typing.id = 'ai-typing-indicator';
        typing.innerHTML = `
            <div class="ai-msg-avatar" style="background: linear-gradient(135deg, var(--accent-teal), #8b5cf6); color: #fff; width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:0.8rem; font-weight:700;">AI</div>
            <div class="ai-typing-dots"><span></span><span></span><span></span></div>`;
        aiBody.appendChild(typing);
        aiBody.scrollTop = aiBody.scrollHeight;
    }

    function removeAITyping() {
        const t = document.getElementById('ai-typing-indicator');
        if (t) t.remove();
    }

    async function handleAISend() {
        const text = aiInput.value.trim();
        if (!text || aiIsProcessing) return;

        aiIsProcessing = true;
        aiSend.disabled = true;
        aiInput.value = '';
        aiInput.style.height = 'auto';

        appendAIMessage('user', text);
        showAITyping();

        try {
            const response = await AIChat.sendMessage(text);
            removeAITyping();
            appendAIMessage('assistant', response);
        } catch (err) {
            removeAITyping();
            let errMsg = 'An unexpected error occurred. Please try again.';
            if (err.message === 'NO_API_KEY') {
                errMsg = 'No API key configured. Please add your API key in Settings.';
            } else if (err.message === 'INVALID_API_KEY') {
                errMsg = 'Invalid API key. Please check your API key in Settings.';
            } else {
                errMsg = `Error: ${err.message}`;
            }
            appendAIMessage('assistant', `⚠️ ${errMsg}`);
        }

        aiIsProcessing = false;
        aiSend.disabled = false;
        aiInput.focus();
    }

    document.getElementById('btn-ai-chat').addEventListener('click', () => {
        renderAIWelcome();
        aiModal.classList.add('active');
        lockBodyScroll();
        setTimeout(() => aiInput.focus(), 100);
    });
    document.getElementById('btn-close-ai').addEventListener('click', () => { aiModal.classList.remove('active'); unlockBodyScroll(); });
    aiModal.addEventListener('click', (e) => { if (e.target === aiModal) { aiModal.classList.remove('active'); unlockBodyScroll(); } });

    document.getElementById('btn-ai-clear').addEventListener('click', () => {
        AIChat.clearHistory();
        renderAIWelcome();
    });

    aiSend.addEventListener('click', handleAISend);
    aiInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleAISend();
        }
    });

    // Auto-resize textarea
    aiInput.addEventListener('input', () => {
        aiInput.style.height = 'auto';
        aiInput.style.height = Math.min(aiInput.scrollHeight, 120) + 'px';
    });

    // Shift Report Logic
    const reportModal = document.getElementById('shift-report-modal');
    document.getElementById('btn-shift-report').addEventListener('click', () => {
        const pts = PatientsDB.getAll();
        const currentDoc = document.getElementById('doctor-name').textContent;
        let reportHtml = `<h3>Shift Report</h3><p><strong>Doctor:</strong> ${currentDoc}</p><p>Compiled at: ${new Date().toLocaleString()}</p>`;
        let criticalCount = 0;
        let warningCount = 0;
        
        pts.forEach(p => {
            const alerts = p.alertsHistory || [];
            const crits = alerts.filter(a => a.status === 'critical').length;
            const warns = alerts.filter(a => a.status === 'warning').length;
            criticalCount += crits;
            warningCount += warns;
            
            reportHtml += `<div style="margin-top:1rem; padding-top:1rem; border-top:1px solid var(--border-subtle)">
                <strong>${p.name} (${p.ward})</strong> — Profile: ${p.conditionProfile}${crits + warns > 0 ? ` — ${crits} critical, ${warns} warning alerts` : ' — No alerts'}
            </div>`;
        });
        
        if (criticalCount === 0 && warningCount === 0) {
            reportHtml += `<p style="margin-top:1rem; color:var(--color-normal)">No alerts recorded for any active patients during this shift.</p>`;
        } else {
            reportHtml = reportHtml.replace('</h3>', `</h3><p style="margin-top:0.5rem; color: var(--color-warning);">Total: <strong>${criticalCount} critical</strong> and <strong>${warningCount} warnings</strong> across the ward.</p>`);
        }
        
        document.getElementById('shift-report-content').innerHTML = reportHtml;
        reportModal.classList.add('active');
        lockBodyScroll();
    });
    document.getElementById('btn-close-report').addEventListener('click', () => { reportModal.classList.remove('active'); unlockBodyScroll(); });
    
    document.getElementById('btn-print-report').addEventListener('click', () => {
        const content = document.getElementById('shift-report-content').innerText;
        const blob = new Blob([content], { type: 'text/plain' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `Shift_Report_${new Date().toISOString().split('T')[0]}.txt`;
        a.click();
    });

    // ===== QUICK ACTION: Shift Handoff =====
    const handoffModal = document.getElementById('shift-handoff-modal');
    let shiftStartTime = localStorage.getItem('alpha1_shift_start') || new Date().toISOString();
    if (!localStorage.getItem('alpha1_shift_start')) {
        localStorage.setItem('alpha1_shift_start', shiftStartTime);
    }

    document.getElementById('qa-shift-handoff').addEventListener('click', () => {
        document.getElementById('handoff-current-doc').textContent = document.getElementById('doctor-name').textContent;
        document.getElementById('handoff-shift-start').textContent = new Date(shiftStartTime).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
        document.getElementById('handoff-new-doctor').value = '';
        document.getElementById('handoff-notes').value = '';
        handoffModal.classList.add('active');
        lockBodyScroll();
    });
    document.getElementById('btn-close-handoff').addEventListener('click', () => { handoffModal.classList.remove('active'); unlockBodyScroll(); });
    handoffModal.addEventListener('click', (e) => { if (e.target === handoffModal) { handoffModal.classList.remove('active'); unlockBodyScroll(); } });

    document.getElementById('btn-start-new-shift').addEventListener('click', () => {
        const newDocName = document.getElementById('handoff-new-doctor').value.trim();
        if (!newDocName) { alert('Please enter the incoming doctor name.'); return; }
        
        // Update doctor name everywhere
        document.getElementById('doctor-name').textContent = newDocName;
        localStorage.setItem('alpha1_doctor_name', newDocName);
        
        // Reset shift timer
        shiftStartTime = new Date().toISOString();
        localStorage.setItem('alpha1_shift_start', shiftStartTime);
        
        handoffModal.classList.remove('active');
        unlockBodyScroll();
        
        // Add to activity feed
        const afList = document.getElementById('af-list');
        const afItem = document.createElement('div');
        afItem.className = 'af-item';
        afItem.innerHTML = `<span class="af-dot af-green"></span><span class="af-time">Just now</span><span class="af-text">Shift handoff: ${newDocName} on duty</span>`;
        afList.insertBefore(afItem, afList.firstChild);
    });

    // Restore doctor name from localStorage on load
    const savedDocName = localStorage.getItem('alpha1_doctor_name');
    if (savedDocName) {
        document.getElementById('doctor-name').textContent = savedDocName;
    }

    // ===== QUICK ACTION: Patient Communication =====
    const commModal = document.getElementById('patient-comm-modal');
    let commCallInterval = null;

    document.getElementById('qa-patient-comm').addEventListener('click', () => {
        populatePatientSelectors();
        document.getElementById('comm-panel').style.display = 'none';
        document.querySelectorAll('.comm-method-card').forEach(c => c.classList.remove('active'));
        commModal.classList.add('active');
    });
    document.getElementById('btn-close-comm').addEventListener('click', () => {
        if (commCallInterval) { clearInterval(commCallInterval); commCallInterval = null; }
        commModal.classList.remove('active');
    });
    commModal.addEventListener('click', (e) => { if (e.target === commModal) { if (commCallInterval) { clearInterval(commCallInterval); commCallInterval = null; } commModal.classList.remove('active'); } });

    // Chat
    document.getElementById('comm-chat').addEventListener('click', () => {
        document.querySelectorAll('.comm-method-card').forEach(c => c.classList.remove('active'));
        document.getElementById('comm-chat').classList.add('active');
        const panel = document.getElementById('comm-panel');
        const patientId = document.getElementById('comm-patient-select').value;
        const patientName = document.getElementById('comm-patient-select').selectedOptions[0]?.text || 'Patient';
        panel.style.display = 'block';
        panel.innerHTML = `
            <div class="comm-chat-messages" id="comm-chat-messages">
                <div class="comm-chat-msg patient"><em>No messages yet. Start a conversation with ${patientName}.</em></div>
            </div>
            <div style="display:flex; gap:0.5rem;">
                <input type="text" id="comm-chat-input" class="input-field" placeholder="Type a message..." style="flex:1;">
                <button class="btn btn-primary" id="comm-chat-send">Send</button>
            </div>`;
        
        // Load existing messages from Firestore
        loadChatMessages(patientId);
        
        document.getElementById('comm-chat-send').addEventListener('click', () => sendChatMessage(patientId));
        document.getElementById('comm-chat-input').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') sendChatMessage(patientId);
        });
    });

    // Call
    document.getElementById('comm-call').addEventListener('click', () => {
        document.querySelectorAll('.comm-method-card').forEach(c => c.classList.remove('active'));
        document.getElementById('comm-call').classList.add('active');
        const panel = document.getElementById('comm-panel');
        const patientName = document.getElementById('comm-patient-select').selectedOptions[0]?.text || 'Patient';
        panel.style.display = 'block';
        
        let callSeconds = 0;
        panel.innerHTML = `
            <div class="comm-call-active">
                <div style="font-size:1.25rem; color:var(--text-secondary);">Calling <strong>${patientName}</strong></div>
                <div class="call-timer" id="call-timer">00:00</div>
                <div style="color:var(--accent-teal); animation: pulse 2s infinite;">📞 Ringing...</div>
                <button class="btn btn-secondary" id="btn-end-call" style="background:rgba(239,68,68,0.2); border-color:#ef4444; color:#ef4444;">End Call</button>
            </div>`;
        
        if (commCallInterval) clearInterval(commCallInterval);
        commCallInterval = setInterval(() => {
            callSeconds++;
            const mins = Math.floor(callSeconds / 60).toString().padStart(2, '0');
            const secs = (callSeconds % 60).toString().padStart(2, '0');
            const timerEl = document.getElementById('call-timer');
            if (timerEl) timerEl.textContent = `${mins}:${secs}`;
            if (callSeconds === 3) {
                const ringEl = panel.querySelector('.comm-call-active > div:nth-child(3)');
                if (ringEl) { ringEl.textContent = '🟢 Connected'; ringEl.style.color = '#10b981'; }
            }
        }, 1000);
        
        document.getElementById('btn-end-call').addEventListener('click', () => {
            clearInterval(commCallInterval);
            commCallInterval = null;
            panel.innerHTML = `<div style="text-align:center; padding:1rem; color:var(--text-muted);">Call ended. Duration: ${document.getElementById('call-timer')?.textContent || '00:00'}</div>`;
        });
    });

    // Notify
    document.getElementById('comm-notify').addEventListener('click', () => {
        document.querySelectorAll('.comm-method-card').forEach(c => c.classList.remove('active'));
        document.getElementById('comm-notify').classList.add('active');
        const panel = document.getElementById('comm-panel');
        const patientId = document.getElementById('comm-patient-select').value;
        const patientName = document.getElementById('comm-patient-select').selectedOptions[0]?.text || 'Patient';
        panel.style.display = 'block';
        panel.innerHTML = `
            <div class="input-group">
                <label class="input-label">Notification Title</label>
                <input type="text" id="notify-title" class="input-field" placeholder="e.g., Appointment Reminder">
            </div>
            <div class="input-group">
                <label class="input-label">Message</label>
                <textarea id="notify-message" class="input-field" rows="3" placeholder="Enter notification message for ${patientName}..."></textarea>
            </div>
            <div class="input-group">
                <label class="input-label">Priority</label>
                <select id="notify-priority" class="input-field">
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                </select>
            </div>
            <button class="btn btn-primary" id="btn-send-notify" style="width:100%;">Send Notification</button>`;
        
        document.getElementById('btn-send-notify').addEventListener('click', async () => {
            const title = document.getElementById('notify-title').value.trim();
            const message = document.getElementById('notify-message').value.trim();
            const priority = document.getElementById('notify-priority').value;
            if (!title || !message) { alert('Please fill in title and message.'); return; }
            
            try {
                await db.collection('notifications').doc(patientId).set({
                    title,
                    message,
                    priority,
                    from: document.getElementById('doctor-name').textContent,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    read: false
                });
                panel.innerHTML = `<div style="text-align:center; padding:1.5rem;"><div style="font-size:2rem; margin-bottom:0.5rem;">✅</div><div style="color:var(--color-normal); font-weight:600;">Notification sent to ${patientName}</div><div style="color:var(--text-muted); font-size:0.85rem; margin-top:0.25rem;">Priority: ${priority}</div></div>`;
            } catch (err) {
                alert('Failed to send notification: ' + err.message);
            }
        });
    });

    async function loadChatMessages(patientId) {
        try {
            const snap = await db.collection('communications').doc(patientId).collection('messages').orderBy('timestamp', 'asc').limit(50).get();
            const container = document.getElementById('comm-chat-messages');
            if (snap.empty) return;
            container.innerHTML = '';
            snap.forEach(doc => {
                const m = doc.data();
                const div = document.createElement('div');
                div.className = `comm-chat-msg ${m.sender === 'doctor' ? 'doctor' : 'patient'}`;
                div.textContent = m.text;
                container.appendChild(div);
            });
            container.scrollTop = container.scrollHeight;
        } catch (err) {
            console.error('Failed to load chat:', err);
        }
    }

    async function sendChatMessage(patientId) {
        const input = document.getElementById('comm-chat-input');
        const text = input.value.trim();
        if (!text) return;
        input.value = '';
        
        const container = document.getElementById('comm-chat-messages');
        // Remove placeholder if present
        const placeholder = container.querySelector('em');
        if (placeholder) placeholder.parentElement.remove();
        
        const div = document.createElement('div');
        div.className = 'comm-chat-msg doctor';
        div.textContent = text;
        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
        
        try {
            await db.collection('communications').doc(patientId).collection('messages').add({
                text,
                sender: 'doctor',
                from: document.getElementById('doctor-name').textContent,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (err) {
            console.error('Failed to send chat:', err);
        }
    }

    function populatePatientSelectors() {
        const pts = PatientsDB.getAll();
        ['comm-patient-select', 'analytics-patient-select'].forEach(selId => {
            const sel = document.getElementById(selId);
            if (!sel) return;
            sel.innerHTML = '';
            pts.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.id;
                opt.textContent = `${p.name} (${p.id} — ${p.ward})`;
                sel.appendChild(opt);
            });
        });
    }

    // ===== QUICK ACTION: Analytics =====
    const analyticsModal = document.getElementById('analytics-modal');

    document.getElementById('qa-analytics').addEventListener('click', () => {
        populatePatientSelectors();
        renderAnalytics();
        analyticsModal.classList.add('active');
    });
    document.getElementById('btn-close-analytics').addEventListener('click', () => analyticsModal.classList.remove('active'));
    analyticsModal.addEventListener('click', (e) => { if (e.target === analyticsModal) analyticsModal.classList.remove('active'); });

    document.getElementById('analytics-patient-select').addEventListener('change', renderAnalytics);

    function renderAnalytics() {
        const patientId = document.getElementById('analytics-patient-select').value;
        const patient = PatientsDB.getById(patientId);
        const content = document.getElementById('analytics-content');
        if (!patient) { content.innerHTML = '<p style="color:var(--text-muted);">Select a patient to view analytics.</p>'; return; }

        const liveData = dashboardLiveData[patientId];
        if (!liveData || !liveData.ppg) {
            content.innerHTML = '<p style="color:var(--text-muted);">No live sensor data from ESP32 for this patient yet. Ensure the device is connected and sending data to Firebase.</p>';
            return;
        }

        const readings = liveData;
        const diag = DoctorHelper.processReadings(readings);

        const sensors = [
            { id: 'ppg', label: 'HR', value: readings.ppg.value, unit: 'bpm', max: 200, normal: [60, 100], warn: [40, 150] },
            { id: 'spo2', label: 'SpO2', value: readings.spo2.value, unit: '%', max: 100, normal: [95, 100], warn: [90, 100] },
            { id: 'gsr', label: 'GSR', value: readings.gsr.value, unit: 'µS', max: 30, normal: [1, 20], warn: [0.5, 25] },
            { id: 'emg', label: 'EMG', value: readings.emg.value, unit: 'µV', max: 2000, normal: [50, 500], warn: [10, 1500] },
            { id: 'imu', label: 'IMU', value: readings.imu.value, unit: 'g', max: 5, normal: [0, 1.5], warn: [0, 3] }
        ];

        let html = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
                <div><strong style="font-size:1.1rem;">${patient.name}</strong><span style="color:var(--text-muted); margin-left:0.5rem;">${patient.ward}</span></div>
                <div style="display:flex; align-items:center; gap:0.5rem;">
                    <span style="font-size:0.8rem; color:var(--text-muted);">Risk Score:</span>
                    <span style="font-size:1.5rem; font-weight:800; font-family:var(--font-mono); color:${diag.riskScore > 75 ? 'var(--color-critical)' : diag.riskScore > 40 ? 'var(--color-warning)' : 'var(--color-normal)'}">${Math.round(diag.riskScore)}</span>
                </div>
            </div>
            <div class="analytics-grid">`;

        sensors.forEach(s => {
            const pct = Math.min(100, (s.value / s.max) * 100);
            let status = 'normal';
            if (s.value < s.warn[0] || s.value > s.warn[1]) status = 'critical';
            else if (s.value < s.normal[0] || s.value > s.normal[1]) status = 'warning';

            html += `
                <div class="analytics-sensor-row">
                    <div class="analytics-sensor-label">${s.label}</div>
                    <div class="analytics-bar-container">
                        <div class="analytics-bar-fill ${status}" style="width:${pct}%;"></div>
                    </div>
                    <div class="analytics-sensor-value" style="color:${status === 'critical' ? 'var(--color-critical)' : status === 'warning' ? 'var(--color-warning)' : 'var(--color-normal)'}">${s.value}<span style="font-size:0.65rem; color:var(--text-muted); margin-left:2px;">${s.unit}</span></div>
                </div>`;
        });

        html += '</div>';

        if (diag.alerts.length > 0) {
            html += '<div style="margin-top:1rem; padding-top:0.75rem; border-top:1px solid var(--border-subtle);">';
            html += '<h4 style="color:var(--text-muted); font-size:0.8rem; text-transform:uppercase; margin-bottom:0.5rem;">Active Alerts</h4>';
            diag.alerts.forEach(a => {
                html += `<div style="padding:0.4rem 0.6rem; margin-bottom:0.25rem; border-radius:var(--radius-sm); border-left:3px solid ${a.status === 'critical' ? 'var(--color-critical)' : 'var(--color-warning)'}; background:${a.status === 'critical' ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)'}; font-size:0.85rem;">
                    <strong>${a.diagnosis}</strong><br><span style="color:var(--text-muted);">${a.recommendation}</span>
                </div>`;
            });
            html += '</div>';
        }

        content.innerHTML = html;
    }

    // Compare Logic
    document.getElementById('btn-clear-compare').addEventListener('click', () => {
        compareList = [];
        document.querySelectorAll('.compare-cb').forEach(cb => cb.checked = false);
        updateCompareBar();
    });
    const compareModal = document.getElementById('compare-modal');
    document.getElementById('btn-close-compare').addEventListener('click', () => {
        compareModal.classList.remove('active');
        // Clean up charts
        compareList.forEach(id => {
            if (dashboardCharts[id] && dashboardCharts[id].compHr) {
                delete dashboardCharts[id].compHr;
            }
        });
    });
    document.getElementById('btn-apply-batch').addEventListener('click', async () => {
        const action = document.getElementById('batch-action-select').value;
        if (action === 'compare') {
            const grid = document.getElementById('compare-grid');
        grid.innerHTML = '';
        compareList.forEach(id => {
            const p = PatientsDB.getById(id);
            if (p) {
                const wrapper = document.createElement('div');
                wrapper.className = 'card patient-card';
                wrapper.innerHTML = `
                    <div class="patient-card-header">
                        <div class="patient-name" style="color:var(--text-primary); font-size:1.1rem; font-weight:600;">${p.name} (${p.ward})</div>
                    </div>
                    <div style="display:flex; justify-content:space-between; margin-top:1rem; margin-bottom:1rem;">
                        <div style="text-align:center;"><h3 style="color:var(--accent-teal); margin-bottom:0.25rem;">HR</h3><span id="comp-hr-${p.id}" style="font-size:2rem; font-weight:bold;">--</span></div>
                        <div style="text-align:center;"><h3 style="color:var(--color-normal); margin-bottom:0.25rem;">SpO2</h3><span id="comp-spo2-${p.id}" style="font-size:2rem; font-weight:bold;">--</span></div>
                    </div>
                    <div style="padding-top:1rem; border-top:1px solid var(--border-subtle);">
                        <canvas id="comp-canvas-${p.id}" width="300" height="60" style="width:100%; height:60px;"></canvas>
                    </div>
                `;
                grid.appendChild(wrapper);
                
                setTimeout(() => {
                    const cvs = document.getElementById(`comp-canvas-${p.id}`);
                    if (cvs && dashboardCharts[p.id]) {
                        dashboardCharts[p.id].compHr = new WaveformChart(`comp-canvas-${p.id}`, { color: '#0891b2', minY: -1, maxY: 1.5, speed: 1.5, lineWidth: 1.5 });
                    }
                }, 0);
            }
        });
        compareModal.classList.add('active');
        } else if (action === 'discharge') {
            if (confirm(`Are you sure you want to discharge ${compareList.length} patient(s)?`)) {
                let currentPatients = PatientsDB.getAll();
                currentPatients = currentPatients.filter(p => !compareList.includes(p.id));
                await PatientsDB.save(currentPatients);
                compareList = [];
                updateCompareBar();
                // Firestore listener will auto-refresh
            }
        } else if (action === 'silence') {
            alert(`Silenced alerts for ${compareList.length} patient(s).`);
            compareList = [];
            document.querySelectorAll('.compare-cb').forEach(cb => cb.checked = false);
            updateCompareBar();
        }
    });
});

function updateCompareBar() {
    const bar = document.getElementById('compare-bar');
    if (compareList.length > 0) {
        bar.style.bottom = '0';
        document.getElementById('compare-count').textContent = compareList.length;
    } else {
        bar.style.bottom = '-100px';
    }
}

function renderPatients(patients) {
    const grid = document.getElementById('patients-grid');
    grid.innerHTML = '';
    
    // Clean up old charts
    Object.keys(dashboardCharts).forEach(id => {
        if (dashboardCharts[id] && dashboardCharts[id].compHr) {
            delete dashboardCharts[id].compHr;
        }
    });
    dashboardCharts = {};
    
    // Clean up Firebase listeners for patients no longer in list
    const patientIds = new Set(patients.map(p => p.id));
    Object.keys(dashboardListeners).forEach(id => {
        if (!patientIds.has(id)) {
            if (dashboardListeners[id]) dashboardListeners[id]();
            delete dashboardListeners[id];
            delete dashboardLiveData[id];
        }
    });

    patients.forEach(patient => {
        // Determine status styling from live data or condition profile
        let statusClass = 'status-normal';
        let hrColor = '#10b981';
        let spo2Color = '#10b981';
        let hrTextClass = 'normal';
        let spo2TextClass = 'normal';

        // Dynamically compute status from live data if available
        const liveData = dashboardLiveData[patient.id];
        if (liveData && liveData.ppg) {
            const diag = DoctorHelper.processReadings(liveData);
            if (diag.overallStatus === 'critical') {
                statusClass = 'status-critical';
                hrColor = '#ef4444';
                spo2Color = '#ef4444';
                hrTextClass = 'critical';
                spo2TextClass = 'critical';
            } else if (diag.overallStatus === 'warning') {
                statusClass = 'status-warning';
                hrColor = '#f59e0b';
            }
        } else {
            // Fallback to condition profile for initial styling
            if (patient.conditionProfile === 'tachycardia' || patient.conditionProfile === 'bradycardia' || patient.conditionProfile === 'hypoxemia' || patient.conditionProfile === 'high_stress' || patient.conditionProfile === 'tremor') { 
                statusClass = 'status-warning'; 
                hrColor = '#f59e0b';
            }
            if (patient.conditionProfile === 'critical_multi') { 
                statusClass = 'status-critical'; 
                hrColor = '#ef4444';
                spo2Color = '#ef4444';
                hrTextClass = 'critical';
                spo2TextClass = 'critical';
            }
        }

        let orbTheme = 'emerald';
        if (statusClass === 'status-critical') orbTheme = 'critical';
        else if (statusClass === 'status-warning') orbTheme = 'amber';

        const card = document.createElement('div');
        card.className = `card patient-card ${statusClass}`;
        card.onclick = () => navigateTo(`patient.html?id=${patient.id}`);

        // Show initial values from lastReading if available
        const initHr = (patient.lastReading && patient.lastReading.hr) ? patient.lastReading.hr : '--';
        const initSpo2 = (patient.lastReading && patient.lastReading.spo2) ? `${patient.lastReading.spo2}%` : '--%';
        
        card.innerHTML = `
            <div class="patient-card-header">
                <div style="display:flex; align-items:center; gap:0.85rem; flex:1; min-width:0;">
                    <div class="patient-orb-container ${statusClass}">
                        <canvas id="mini-orb-${patient.id}" width="58" height="58" class="patient-neural-orb"></canvas>
                    </div>
                    <div style="min-width:0; flex:1;">
                        <div class="patient-name">${patient.name}</div>
                        <div class="patient-meta">${patient.id} • ${patient.age}${patient.gender} • ${patient.ward}</div>
                    </div>
                </div>
                <div style="display:flex; align-items:center; gap:0.5rem; flex-shrink:0;">
                    <div class="status-indicator ${statusClass}"></div>
                    <input type="checkbox" class="compare-cb" data-id="${patient.id}" style="width:18px; height:18px; cursor:pointer;" onclick="event.stopPropagation()">
                </div>
            </div>
            <div style="margin-top: 1rem;">
                <div class="vital-pill-extended">
                    <span class="vital-label">HR</span>
                    <div class="mini-chart-container">
                        <canvas id="mini-hr-${patient.id}" class="mini-chart"></canvas>
                    </div>
                    <span class="vital-val ${hrTextClass}" id="dash-hr-${patient.id}">${initHr}</span>
                </div>
                <div class="vital-pill-extended">
                    <span class="vital-label">SpO2</span>
                    <div class="mini-chart-container">
                        <canvas id="mini-spo2-${patient.id}" class="mini-chart"></canvas>
                    </div>
                    <span class="vital-val ${spo2TextClass}" id="dash-spo2-${patient.id}">${initSpo2}</span>
                </div>
            </div>
        `;
        grid.appendChild(card);

        // Set up Firebase real-time listener for this patient's sensor data
        setupLiveSensorListener(patient.id);
        
        // Wait for next tick to let DOM mount canvases & mini neural orb
        setTimeout(() => {
            if (typeof OrbVisualizer !== 'undefined') {
                new OrbVisualizer(`mini-orb-${patient.id}`, { isMini: true, colorTheme: orbTheme, radius: 25 });
            }
            const hrCanvas = document.getElementById(`mini-hr-${patient.id}`);
            if (hrCanvas) {
                dashboardCharts[patient.id] = {
                    hr: new WaveformChart(`mini-hr-${patient.id}`, { color: hrColor, minY: -1, maxY: 1.5, speed: 1.5, lineWidth: 1.5 }),
                    spo2: new WaveformChart(`mini-spo2-${patient.id}`, { color: spo2Color, minY: 80, maxY: 100, speed: 0.5, lineWidth: 1.5 })
                };
            }
        }, 0);
    });

    // Render Ward Map Beds
    const mapContainer = document.getElementById('ward-map-container');
    if (mapContainer) {
        mapContainer.innerHTML = '';
        const wards = {};
        patients.forEach(p => {
            if (!wards[p.ward]) wards[p.ward] = [];
            wards[p.ward].push(p);
        });

        Object.keys(wards).sort().forEach(wardName => {
            const room = document.createElement('div');
            room.style.cssText = `background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: var(--spacing-sm); display: flex; flex-direction: column; gap: var(--spacing-sm);`;
            
            const title = document.createElement('h4');
            title.textContent = wardName;
            title.style.cssText = `margin-bottom: 0.5rem; font-size: 0.85rem; color: var(--text-muted); text-align: center; border-bottom: 1px solid var(--border-subtle); padding-bottom: 0.25rem;`;
            room.appendChild(title);
            
            const bedsGrid = document.createElement('div');
            bedsGrid.style.cssText = `display: flex; flex-wrap: wrap; gap: 0.5rem; justify-content: center;`;
            
            wards[wardName].forEach(p => {
                let color = 'var(--color-normal)';
                let glow = 'rgba(16, 185, 129, 0.4)';
                if (p.conditionProfile === 'critical_multi') {
                    color = 'var(--color-critical)';
                    glow = 'rgba(239, 68, 68, 0.6)';
                } else if (p.conditionProfile !== 'normal') {
                    color = 'var(--color-warning)';
                    glow = 'rgba(245, 158, 11, 0.5)';
                }
                
                const bed = document.createElement('div');
                bed.style.cssText = `width: 24px; height: 32px; border-radius: 4px; background-color: ${color}; box-shadow: 0 0 10px ${glow}; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #000; font-weight: bold;`;
                bed.title = `${p.name} - ${p.id}`;
                bed.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 4v16M22 4v16M2 8h20M2 16h20"/></svg>';
                bed.onclick = () => navigateTo(`patient.html?id=${p.id}`);
                bed.onmouseover = () => bed.style.transform = 'scale(1.1)';
                bed.onmouseout = () => bed.style.transform = 'scale(1)';
                bedsGrid.appendChild(bed);
            });
            
            room.appendChild(bedsGrid);
            mapContainer.appendChild(room);
        });
    }

    // Attach listener to new compare checkboxes
    document.querySelectorAll('.compare-cb').forEach(cb => {
        cb.checked = compareList.includes(cb.dataset.id);
        cb.addEventListener('change', (e) => {
            if (e.target.checked) compareList.push(e.target.dataset.id);
            else compareList = compareList.filter(id => id !== e.target.dataset.id);
            updateCompareBar();
        });
    });
}

// Set up real-time listener for a patient's sensor data from Firebase
function setupLiveSensorListener(patientId) {
    // Skip if already listening
    if (dashboardListeners[patientId]) return;

    // Listen to the latest reading in sensorData/{patientId}/readings
    const unsubscribe = db.collection('sensorData').doc(patientId)
        .collection('readings')
        .orderBy('timestamp', 'desc')
        .limit(1)
        .onSnapshot(snapshot => {
            snapshot.forEach(doc => {
                const data = doc.data();
                // Convert ESP32 flat format into the readings structure DoctorHelper expects
                dashboardLiveData[patientId] = {
                    ppg: { value: data.hr || 0, wave: data.ppg || 0 },
                    spo2: { value: data.spo2 || 0, wave: data.spo2 || 0 },
                    gsr: { value: data.gsr || 0, wave: data.gsr || 0 },
                    emg: { value: data.emg || 0, wave: data.emg || 0 },
                    imu: { value: data.imu || 0, wave: data.imu || 0 }
                };
            });
        }, err => {
            console.warn(`Sensor listener error for ${patientId}:`, err);
        });

    dashboardListeners[patientId] = unsubscribe;

    // Also listen to lastReading on the patient doc as a fallback/supplement
    db.collection('patients').doc(patientId).onSnapshot(doc => {
        if (!doc.exists) return;
        const data = doc.data();
        if (data.lastReading) {
            const lr = data.lastReading;
            // Only update if we don't already have live sensorData stream data,
            // or merge as a fallback
            if (!dashboardLiveData[patientId] || !dashboardLiveData[patientId].ppg || dashboardLiveData[patientId].ppg.value === 0) {
                dashboardLiveData[patientId] = {
                    ppg: { value: lr.hr || 0, wave: lr.ppg || 0 },
                    spo2: { value: lr.spo2 || 0, wave: lr.spo2 || 0 },
                    gsr: { value: lr.gsr || 0, wave: lr.gsr || 0 },
                    emg: { value: lr.emg || 0, wave: lr.emg || 0 },
                    imu: { value: lr.imu || 0, wave: lr.imu || 0 }
                };
            }
        }
    });
}

function updateStats() {
    const allPatients = PatientsDB.getAll();
    document.getElementById('stat-total').textContent = allPatients.length;
    
    const occEl = document.getElementById('stat-occupancy');
    if (occEl) occEl.textContent = Math.round((allPatients.length / 15) * 100) + '%';
    
    let totalRisk = 0;
    let criticalCount = 0;
    let count = 0;
    
    allPatients.forEach(p => {
        const liveData = dashboardLiveData[p.id];
        if (liveData && liveData.ppg && liveData.ppg.value > 0) {
            const diag = DoctorHelper.processReadings(liveData);
            if (diag.overallStatus === 'critical') {
                criticalCount++;
            }
            totalRisk += diag.riskScore;
            count++;
        } else {
            // No live data yet — use condition profile as estimate
            if (p.conditionProfile === 'critical_multi') criticalCount++;
            totalRisk += (p.conditionProfile === 'critical_multi' ? 85 : p.conditionProfile !== 'normal' ? 45 : 10);
            count++;
        }
    });

    document.getElementById('stat-critical').textContent = criticalCount;
    
    const riskEl = document.getElementById('stat-risk');
    if (riskEl) {
        riskEl.textContent = count > 0 ? Math.round(totalRisk / count) : 0;
    }
}

// ═══════════════════════════════════════════════════════════
// REHABILITATION CONTROL CENTER
// ═══════════════════════════════════════════════════════════

const RehabControl = {
    currentPatientId: null,
    rehabData: null,
    sessions: [],

    init() {
        document.getElementById('qa-rehab')?.addEventListener('click', () => this.openModal());
        document.getElementById('close-rehab')?.addEventListener('click', () => {
            document.getElementById('modal-rehab').classList.remove('active');
        });
        document.getElementById('rehab-patient-select')?.addEventListener('change', (e) => {
            this.currentPatientId = e.target.value;
            if (this.currentPatientId) this.loadRehabData();
        });
        document.getElementById('btn-create-rehab')?.addEventListener('click', () => this.createOrUpdatePlan());
        document.getElementById('btn-rehab-send-msg')?.addEventListener('click', () => this.sendMessage());
        document.querySelectorAll('.rehab-preset-msg').forEach(btn => {
            btn.addEventListener('click', () => {
                document.getElementById('rehab-quick-msg').value = btn.dataset.msg;
            });
        });
        const dateInput = document.getElementById('rehab-start-date');
        if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
    },

    async openModal() {
        document.getElementById('modal-rehab').classList.add('active');
        await this.populatePatientSelector();
    },

    async populatePatientSelector() {
        const select = document.getElementById('rehab-patient-select');
        select.innerHTML = '<option value="">-- Select Patient --</option>';
        try {
            const snap = await db.collection('patients').get();
            snap.forEach(doc => {
                const p = doc.data();
                const opt = document.createElement('option');
                opt.value = doc.id;
                opt.textContent = `${doc.id} — ${p.name || 'Unknown'}`;
                select.appendChild(opt);
            });
        } catch (err) { console.error('Failed to load patients:', err); }
    },

    async loadRehabData() {
        const statusEl = document.getElementById('rehab-status');
        const sessionsListEl = document.getElementById('rehab-sessions-list');
        statusEl.innerHTML = '<div style="text-align:center; color:var(--text-muted);">Loading...</div>';

        try {
            const rehabDoc = await db.collection('rehabilitation').doc(this.currentPatientId).get();
            if (!rehabDoc.exists) {
                statusEl.innerHTML = `<div class="card" style="padding:1rem; text-align:center; background:rgba(245,158,11,0.05); border:1px solid rgba(245,158,11,0.2);">
                    <div style="font-size:1.5rem; margin-bottom:0.5rem;">📋</div>
                    <div style="font-weight:600;">No Rehabilitation Plan</div>
                    <div style="font-size:0.8rem; color:var(--text-muted);">Configure and create one below</div></div>`;
                sessionsListEl.innerHTML = '';
                return;
            }
            this.rehabData = rehabDoc.data();
            const d = this.rehabData;
            document.getElementById('rehab-total-sessions').value = d.totalSessions || 12;
            if (d.startDate) document.getElementById('rehab-start-date').value = d.startDate;

            const pct = d.overallProgress || 0;
            statusEl.innerHTML = `<div class="card" style="padding:1rem; background:rgba(139,92,246,0.05); border:1px solid rgba(139,92,246,0.15);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem;">
                    <span style="font-weight:600;">Progress: ${pct}%</span>
                    <span class="badge ${pct >= 75 ? 'badge-normal' : pct >= 25 ? 'badge-warning' : 'badge-info'}">${d.completedSessions || 0} / ${d.totalSessions || 12} sessions</span>
                </div>
                <div style="height:8px; background:rgba(255,255,255,0.06); border-radius:4px; overflow:hidden;">
                    <div style="height:100%; width:${pct}%; background:linear-gradient(90deg,#8b5cf6,#6366f1); border-radius:4px; transition:width 0.5s;"></div>
                </div>
                <div style="display:flex; justify-content:space-between; margin-top:0.5rem; font-size:0.75rem; color:var(--text-muted);">
                    <span>Streak: ${d.streak || 0}</span><span>Improvement: +${d.improvement || 0}%</span><span>Current: Session ${d.currentSession || 1}</span>
                </div></div>`;

            const sessionsSnap = await db.collection('rehabilitation').doc(this.currentPatientId)
                .collection('sessions').orderBy('number').get();
            this.sessions = [];
            sessionsSnap.forEach(doc => this.sessions.push({ id: doc.id, ...doc.data() }));

            sessionsListEl.innerHTML = this.sessions.map(s => {
                const statusIcon = s.status === 'completed' ? '✅' : s.status === 'missed' ? '❌' : '⏳';
                const statusColor = s.status === 'completed' ? '#10b981' : s.status === 'missed' ? '#ef4444' : 'var(--text-muted)';
                return `<div style="display:flex; justify-content:space-between; align-items:center; padding:0.5rem; border-bottom:1px solid var(--border-subtle);">
                    <div><span style="font-weight:600; font-size:0.85rem;">Session ${s.number}</span>
                    <span style="color:var(--text-muted); font-size:0.75rem; margin-left:0.5rem;">${s.type}</span></div>
                    <div style="display:flex; align-items:center; gap:0.5rem;">
                    ${s.score ? `<span class="badge badge-normal">${s.score}/100</span>` : ''}
                    <span style="color:${statusColor}; font-size:0.85rem;">${statusIcon} ${s.status}</span></div></div>`;
            }).join('');
        } catch (err) {
            console.error('Error loading rehab data:', err);
            statusEl.innerHTML = '<div style="color:#ef4444;">Error loading rehabilitation data</div>';
        }
    },

    async createOrUpdatePlan() {
        if (!this.currentPatientId) { alert('Please select a patient first'); return; }
        const totalSessions = parseInt(document.getElementById('rehab-total-sessions').value) || 12;
        const duration = parseInt(document.getElementById('rehab-session-duration').value) || 30;
        const interval = parseInt(document.getElementById('rehab-interval').value) || 3;
        const startDateStr = document.getElementById('rehab-start-date').value;
        const startDate = startDateStr ? new Date(startDateStr) : new Date();
        const defaultTypes = ['Upper Limb Mobility','Lower Limb Strength','Core Stability','Balance Training','Coordination Exercises','Range of Motion',
            'Functional Movement','Resistance Training','Flexibility','Endurance Building','Fine Motor Skills','Full Body Integration',
            'Gait Training','Proprioception','Aquatic Therapy','Stretching Protocol','Weight Bearing','Cardio Rehab'];

        try {
            const btn = document.getElementById('btn-create-rehab');
            btn.textContent = 'Saving...'; btn.disabled = true;
            const rehabRef = db.collection('rehabilitation').doc(this.currentPatientId);
            const existingDoc = await rehabRef.get();
            const existing = existingDoc.exists ? existingDoc.data() : {};

            await rehabRef.set({
                totalSessions, completedSessions: existing.completedSessions || 0,
                currentSession: existing.currentSession || 1,
                startDate: startDate.toISOString().split('T')[0],
                overallProgress: existing.overallProgress || 0,
                improvement: existing.improvement || 0,
                streak: existing.streak || 0,
                lastSessionDate: existing.lastSessionDate || null
            }, { merge: true });

            const sessionsRef = rehabRef.collection('sessions');
            for (let i = 0; i < totalSessions; i++) {
                const sessionDate = new Date(startDate);
                sessionDate.setDate(startDate.getDate() + (i * interval));
                const existingSession = this.sessions[i];
                const sessionType = defaultTypes[i % defaultTypes.length];
                if (existingSession && existingSession.status === 'completed') {
                    await sessionsRef.doc(`session-${i + 1}`).update({ type: sessionType, date: sessionDate.toISOString().split('T')[0], duration });
                } else {
                    await sessionsRef.doc(`session-${i + 1}`).set({
                        number: i + 1, date: sessionDate.toISOString().split('T')[0], type: sessionType,
                        duration, status: 'scheduled', score: null, notes: '', completedAt: null
                    });
                }
            }
            btn.textContent = '✅ Saved!';
            setTimeout(() => { btn.textContent = 'Create / Update Rehab Plan'; btn.disabled = false; }, 2000);
            this.loadRehabData();
        } catch (err) {
            console.error('Failed to save rehab plan:', err);
            alert('Error: ' + err.message);
            document.getElementById('btn-create-rehab').textContent = 'Create / Update Rehab Plan';
            document.getElementById('btn-create-rehab').disabled = false;
        }
    },

    async sendMessage() {
        if (!this.currentPatientId) { alert('Please select a patient first'); return; }
        const input = document.getElementById('rehab-quick-msg');
        const text = input.value.trim();
        if (!text) return;
        try {
            const doctorName = document.getElementById('doctor-name')?.textContent || 'Doctor';
            await db.collection('communications').doc(this.currentPatientId)
                .collection('messages').add({
                    text, sender: 'doctor', from: doctorName,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
            input.value = '';
            const btn = document.getElementById('btn-rehab-send-msg');
            btn.textContent = '✅ Sent';
            setTimeout(() => { btn.textContent = 'Send'; }, 2000);
        } catch (err) {
            console.error('Failed to send message:', err);
            alert('Failed to send: ' + err.message);
        }
    }
};
RehabControl.init();
