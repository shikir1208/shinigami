/**
 * Eris App — Android Mobile Companion State Manager & Gamification Engine
 * Now with Real-Time Firestore Sync & Dynamic Doctor Identity
 */
document.addEventListener('DOMContentLoaded', () => {
    
    // --- Application State ---
    const state = {
        activeTab: 'tab-home',
        xp: 4850,
        nextLevelXp: 6000,
        level: 14,
        rankTier: 'GOLD TIER III',
        streakDays: 12,
        recoveryPercent: 68,
        sosTimer: null,
        sosCountdown: 3,
        quests: [
            { id: 'q1', title: 'Wrist Extension 3x10', xp: 250, completed: true },
            { id: 'q2', title: 'SpO2 Deep Breathing (5m)', xp: 150, completed: false },
            { id: 'q3', title: 'GSR Stress Relaxation', xp: 300, completed: false },
            { id: 'q4', title: 'IMU Motion Tracking Check', xp: 200, completed: false }
        ],
        lastRenderedMessageCount: 0
    };

    // --- Motivational Quotes Pool ---
    const quotes = [
        { text: '"Small daily improvements over time lead to stunning rehabilitation results."', author: '— Dr. Sarah Chen' },
        { text: '"Recovery is not a sprint; it is a series of brave small steps taken every day."', author: '— Physical Therapy Guide' },
        { text: '"Your body is capable of incredible neural adaptation and healing. Stay consistent!"', author: '— Phi-3.5 Clinical Engine' },
        { text: '"Every flex, every deep breath, every telemetry goal brings you closer to full recovery."', author: '— Eris Rehabilitation Co-Pilot' },
        { text: '"Strength does not come from physical capacity alone. It comes from an indomitable recovery spirit."', author: '— Rehabilitation Principle' }
    ];

    // Initialize Neural Core Orb on Vitals Tab
    let erisOrb = null;

    // --- Clock Update ---
    const updateClock = () => {
        const now = new Date();
        const hrs = String(now.getHours()).padStart(2, '0');
        const mins = String(now.getMinutes()).padStart(2, '0');
        const clockEl = document.getElementById('eris-clock');
        if (clockEl) clockEl.textContent = `${hrs}:${mins}`;
    };
    setInterval(updateClock, 1000);
    updateClock();

    // --- Tab Navigation ---
    const dockBtns = document.querySelectorAll('.eris-dock-btn');
    const tabViews = document.querySelectorAll('.eris-tab-view');

    dockBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');
            dockBtns.forEach(b => b.classList.remove('active'));
            tabViews.forEach(v => v.classList.remove('active'));

            btn.classList.add('active');
            const targetView = document.getElementById(targetTab);
            if (targetView) targetView.classList.add('active');

            // Lazy initialize Neural Orb on vitals tab view
            if (targetTab === 'tab-vitals' && !erisOrb && typeof OrbVisualizer !== 'undefined') {
                erisOrb = new OrbVisualizer('eris-neural-orb', { radius: 45, isMini: true, colorTheme: 'cyan' });
            }
        });
    });

    // --- Daily Motivational Quote Generator ---
    const quoteText = document.getElementById('eris-quote-text');
    const quoteAuthor = document.getElementById('eris-quote-author');
    const btnNewQuote = document.getElementById('eris-btn-new-quote');

    const renderRandomQuote = () => {
        const q = quotes[Math.floor(Math.random() * quotes.length)];
        if (quoteText) quoteText.textContent = q.text;
        if (quoteAuthor) quoteAuthor.textContent = q.author;
    };

    if (btnNewQuote) {
        btnNewQuote.addEventListener('click', renderRandomQuote);
    }

    // --- Quests & Gamification Render ---
    const renderQuests = () => {
        const homeQuests = document.getElementById('eris-home-quests');
        const fullQuests = document.getElementById('eris-full-quests');

        const questHtml = state.quests.map(q => `
            <div class="eris-quest-item ${q.completed ? 'completed' : ''}">
                <input type="checkbox" class="eris-quest-cb" data-id="${q.id}" ${q.completed ? 'checked' : ''}>
                <span class="eris-quest-title" style="${q.completed ? 'text-decoration:line-through; opacity:0.6;' : ''}">${q.title}</span>
                <span class="eris-quest-xp">+${q.xp} XP</span>
            </div>
        `).join('');

        if (homeQuests) homeQuests.innerHTML = questHtml;
        if (fullQuests) fullQuests.innerHTML = questHtml;

        // Attach Checkbox Change Handlers
        document.querySelectorAll('.eris-quest-cb').forEach(cb => {
            cb.addEventListener('change', (e) => {
                const questId = e.target.getAttribute('data-id');
                const quest = state.quests.find(q => q.id === questId);
                if (quest) {
                    quest.completed = e.target.checked;
                    if (quest.completed) {
                        state.xp += quest.xp;
                        if (state.xp >= state.nextLevelXp) {
                            state.level++;
                            state.nextLevelXp += 2000;
                            state.rankTier = state.level >= 18 ? 'CYBER PLATINUM' : 'GOLD TIER III';
                            alert(`🎉 LEVEL UP! You reached Level ${state.level} (${state.rankTier})!`);
                        }
                    } else {
                        state.xp = Math.max(0, state.xp - quest.xp);
                    }
                    updateGamificationUI();
                    renderQuests();

                    // Sync quest state to Firestore
                    if (window.PatientsDB && currentPatientData) {
                        PatientsDB.updatePatient(currentPatientData.id, {
                            quests: state.quests,
                            xp: state.xp,
                            level: state.level,
                            nextLevelXp: state.nextLevelXp,
                            rankTier: state.rankTier
                        });
                    }
                }
            });
        });
    };

    const updateGamificationUI = () => {
        const rankTierEl = document.getElementById('eris-rank-tier');
        const rankLevelEl = document.getElementById('eris-rank-level');
        const xpTextEl = document.getElementById('eris-xp-text');
        const xpFillEl = document.getElementById('eris-xp-fill');

        if (rankTierEl) rankTierEl.textContent = state.rankTier;
        if (rankLevelEl) rankLevelEl.textContent = `Level ${state.level} • Cyber Warrior`;
        if (xpTextEl) xpTextEl.textContent = `${state.xp.toLocaleString()} / ${state.nextLevelXp.toLocaleString()} XP to Next Tier`;
        if (xpFillEl) {
            const pct = Math.min(100, Math.round((state.xp / state.nextLevelXp) * 100));
            xpFillEl.style.width = `${pct}%`;
        }
    };

    renderQuests();
    updateGamificationUI();

    // --- Quick Pills Actions ---
    const pillBreathing = document.getElementById('quick-breathing');
    const pillDoctor = document.getElementById('quick-doctor');
    const pillAi = document.getElementById('quick-ai');

    if (pillBreathing) {
        pillBreathing.addEventListener('click', () => {
            alert('🫁 SpO2 Deep Breathing Session Started: Inhale for 4s, Hold for 4s, Exhale for 6s.');
        });
    }
    if (pillDoctor) {
        pillDoctor.addEventListener('click', () => {
            const docTab = document.querySelector('.eris-dock-btn[data-tab="tab-doctor"]');
            if (docTab) docTab.click();
        });
    }
    if (pillAi) {
        pillAi.addEventListener('click', async () => {
            const docTab = document.querySelector('.eris-dock-btn[data-tab="tab-doctor"]');
            if (docTab) docTab.click();
            const response = await Alpha1Brain.query('Evaluate patient PT-0331 telemetry and recovery score');
            addChatMessage('Phi-3.5 Assistant', response, 'ai');
        });
    }

    // --- Doctor & AI Chat Interface (Now Firestore-Synced) ---
    const chatFeed = document.getElementById('eris-chat-feed');
    const chatInput = document.getElementById('eris-chat-input');
    const chatSend = document.getElementById('eris-chat-send');

    // Get the doctor's actual name from the login
    const getDoctorName = () => {
        // Check if Auth is loaded and doctor is logged in (on dashboard)
        if (typeof Auth !== 'undefined' && Auth.getUser) {
            const user = Auth.getUser();
            if (user && user.username) {
                return `Dr. ${user.username}`;
            }
        }
        // Check localStorage for eris-specific doctor name
        const storedDoctor = localStorage.getItem('eris_doctor_name');
        if (storedDoctor) return storedDoctor;
        // Default fallback
        return 'Your Doctor';
    };

    const getDoctorInitials = () => {
        const name = getDoctorName().replace('Dr. ', '');
        return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    };

    // Update doctor banner with dynamic name
    const updateDoctorBanner = () => {
        const docNameEl = document.getElementById('eris-doc-name');
        const docAvatarEl = document.getElementById('eris-doc-avatar');
        const docTitleEl = document.getElementById('eris-doc-title');
        const chatInputEl = document.getElementById('eris-chat-input');
        
        const doctorName = getDoctorName();
        if (docNameEl) docNameEl.textContent = doctorName;
        if (docAvatarEl) docAvatarEl.textContent = getDoctorInitials();
        if (docTitleEl) docTitleEl.textContent = 'ICU Attending & Rehabilitation Specialist';
        if (chatInputEl) chatInputEl.placeholder = `Message ${doctorName} or ask Phi-3.5...`;
    };
    updateDoctorBanner();

    const addChatMessage = (sender, text, type = 'patient') => {
        if (!chatFeed) return;
        const msgDiv = document.createElement('div');
        msgDiv.className = `eris-msg eris-msg-${type}`;
        
        const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        msgDiv.innerHTML = `
            <div class="eris-msg-bubble">${text.replace(/\n/g, '<br>')}</div>
            <span class="eris-msg-time">${now}</span>
        `;
        chatFeed.appendChild(msgDiv);
        chatFeed.scrollTop = chatFeed.scrollHeight;
    };

    // Render all messages from Firestore patient data
    const renderChatFromFirestore = (messages) => {
        if (!chatFeed || !messages) return;
        if (messages.length === state.lastRenderedMessageCount) return; // No new messages

        // Clear existing static/old messages and re-render all from Firestore
        chatFeed.innerHTML = '';
        
        messages.forEach(m => {
            const msgDiv = document.createElement('div');
            const msgType = m.type === 'patient' ? 'patient' : (m.type === 'ai' ? 'ai' : 'doc');
            msgDiv.className = `eris-msg eris-msg-${msgType}`;
            
            const time = m.timestamp 
                ? new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : '';
            
            msgDiv.innerHTML = `
                <div class="eris-msg-bubble">${(m.text || '').replace(/\n/g, '<br>')}</div>
                <span class="eris-msg-time">${time}</span>
            `;
            chatFeed.appendChild(msgDiv);
        });

        chatFeed.scrollTop = chatFeed.scrollHeight;
        state.lastRenderedMessageCount = messages.length;
    };

    const handleChatSubmit = async () => {
        if (!chatInput) return;
        const query = chatInput.value.trim();
        if (!query) return;
        chatInput.value = '';

        const patientName = currentPatientData?.name || 'Patient';

        // Write message to Firestore (will auto-sync back via real-time listener)
        if (window.PatientsDB && currentPatientData) {
            const newMsg = {
                id: `m_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
                sender: patientName,
                text: query,
                timestamp: Date.now(),
                type: 'patient'
            };

            // Add to Firestore messages array
            const currentMsgs = currentPatientData.messages || [];
            currentMsgs.push(newMsg);
            await PatientsDB.updatePatient(currentPatientData.id, { messages: currentMsgs });

            // Check if query is for AI or Doctor
            if (query.toLowerCase().includes('phi') || query.toLowerCase().includes('ai') || query.toLowerCase().includes('symptom') || query.toLowerCase().includes('risk')) {
                const aiResponse = await Alpha1Brain.query(query);
                const aiMsg = {
                    id: `m_${Date.now()}_ai`,
                    sender: 'Phi-3.5 Assistant',
                    text: `✦ ${aiResponse.replace(/\*\*(.*?)\*\*/g, '$1')}`,
                    timestamp: Date.now(),
                    type: 'ai'
                };
                currentMsgs.push(aiMsg);
                await PatientsDB.updatePatient(currentPatientData.id, { messages: currentMsgs });
            } else {
                // Auto-reply from doctor (simulated, using actual doctor name)
                const doctorName = getDoctorName();
                setTimeout(async () => {
                    const docMsg = {
                        id: `m_${Date.now()}_doc`,
                        sender: doctorName,
                        text: `Thanks for updating me, ${patientName.split(' ')[0]}. I reviewed your message ("${query}"). Your vitals look solid — keep up the daily rehab exercises!`,
                        timestamp: Date.now(),
                        type: 'doc'
                    };
                    currentMsgs.push(docMsg);
                    await PatientsDB.updatePatient(currentPatientData.id, { messages: currentMsgs });
                }, 1200);
            }
        } else {
            // Fallback if no Firestore
            addChatMessage(patientName, query, 'patient');
        }
    };

    if (chatSend) chatSend.addEventListener('click', handleChatSubmit);
    if (chatInput) {
        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') handleChatSubmit();
        });
    }

    // --- Emergency SOS System ---
    const btnSos = document.getElementById('eris-btn-sos');
    const sosOverlay = document.getElementById('eris-sos-overlay');
    const sosTimerEl = document.getElementById('eris-sos-timer');
    const btnCancelSos = document.getElementById('eris-btn-cancel-sos');

    if (btnSos) {
        btnSos.addEventListener('click', () => {
            state.sosCountdown = 3;
            if (sosTimerEl) sosTimerEl.textContent = state.sosCountdown;
            if (sosOverlay) sosOverlay.style.display = 'flex';

            state.sosTimer = setInterval(() => {
                state.sosCountdown--;
                if (sosTimerEl) sosTimerEl.textContent = state.sosCountdown;

                if (state.sosCountdown <= 0) {
                    clearInterval(state.sosTimer);
                    // Also write SOS to Firestore so dashboard sees it
                    if (window.PatientsDB && currentPatientData) {
                        PatientsDB.updatePatient(currentPatientData.id, {
                            sosTriggered: true,
                            sosTimestamp: Date.now()
                        });
                    }
                    alert('🚨 EMERGENCY SOS DISPATCHED: Ward Attending & Emergency Contacts Have Been Notified!');
                    if (sosOverlay) sosOverlay.style.display = 'none';
                }
            }, 1000);
        });
    }

    if (btnCancelSos) {
        btnCancelSos.addEventListener('click', () => {
            if (state.sosTimer) clearInterval(state.sosTimer);
            if (sosOverlay) sosOverlay.style.display = 'none';
        });
    }

    // --- Patient Code Login & Session Sync ---
    let activePatientCode = localStorage.getItem('eris_active_patient_code') || 'PT-0331';
    let currentPatientData = null;

    const btnCode = document.getElementById('eris-btn-code');
    const codeBadge = document.getElementById('eris-current-code-badge');
    const modalCode = document.getElementById('eris-code-modal');
    const modalClose = document.getElementById('eris-modal-close');
    const inputCode = document.getElementById('eris-input-patient-code');
    const btnSubmitCode = document.getElementById('eris-btn-submit-code');
    const codeChips = document.querySelectorAll('.eris-code-chip');

    const updatePatientHeaderUI = (patient) => {
        if (!patient) return;
        currentPatientData = patient;
        if (codeBadge) codeBadge.textContent = patient.code || patient.id || activePatientCode;
        
        const avatarEl = document.getElementById('eris-avatar');
        const greetingEl = document.querySelector('.eris-greeting');
        const subgreetingEl = document.querySelector('.eris-subgreeting');

        const initials = (patient.name || 'PT').split(' ').map(n => n[0]).join('').substring(0, 2);
        if (avatarEl) avatarEl.textContent = initials;
        if (greetingEl) greetingEl.textContent = `Hello, ${(patient.name || 'Patient').split(' ')[0]}`;
        if (subgreetingEl) subgreetingEl.textContent = `Rehab Phase II • ${patient.ward || 'Ward'}`;

        // Recovery Ring
        const recVal = document.getElementById('eris-recovery-val');
        if (recVal) recVal.textContent = `${patient.recoveryPercent || 68}%`;

        // Vitals from Firestore (vitals or lastReading from ESP32)
        const hrEl = document.getElementById('eris-val-hr');
        const spo2El = document.getElementById('eris-val-spo2');
        const emgEl = document.getElementById('eris-val-emg');
        const gsrEl = document.getElementById('eris-val-gsr');
        
        const vit = patient.lastReading || patient.vitals;
        if (vit) {
            if (hrEl) hrEl.innerHTML = `${vit.hr || vit.ppgValue || 0} <span class="vital-unit">BPM</span>`;
            if (spo2El) spo2El.innerHTML = `${vit.spo2 || 0} <span class="vital-unit">%</span>`;
            if (emgEl) emgEl.innerHTML = `${vit.emg || 0} <span class="vital-unit">µV</span>`;
            if (gsrEl) gsrEl.innerHTML = `${vit.gsr || 0} <span class="vital-unit">µS</span>`;
        }

        // Update quests from Firestore
        if (patient.quests && patient.quests.length > 0) {
            state.quests = patient.quests;
            state.xp = patient.xp || state.xp;
            state.level = patient.level || state.level;
            state.nextLevelXp = patient.nextLevelXp || state.nextLevelXp;
            state.rankTier = patient.rankTier || state.rankTier;
            state.streakDays = patient.streakDays || state.streakDays;
            state.recoveryPercent = patient.recoveryPercent || state.recoveryPercent;
            renderQuests();
            updateGamificationUI();
        }

        // Update profile tab dynamically
        const profileAvatarEl = document.querySelector('.eris-avatar-lg');
        const profileNameEl = document.querySelector('.eris-profile-header h2');
        const profileMetaEl = document.querySelector('.eris-meta-pill');
        if (profileAvatarEl) profileAvatarEl.textContent = initials;
        if (profileNameEl) profileNameEl.textContent = patient.name || 'Patient';
        if (profileMetaEl) profileMetaEl.textContent = `Patient ID: ${patient.id} • ${patient.ward || 'Ward'}`;

        // Update profile details
        const detailVals = document.querySelectorAll('.eris-detail-row .detail-val');
        if (detailVals.length >= 3) {
            detailVals[0].textContent = `${patient.age || '—'} ${patient.gender || ''}`;
            detailVals[1].textContent = (patient.conditionProfile || 'normal').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            detailVals[2].textContent = getDoctorName();
        }

        // Render chat messages from Firestore
        if (patient.messages && patient.messages.length > 0) {
            renderChatFromFirestore(patient.messages);
        }

        // Update SOS overlay doctor name
        const sosP = document.querySelector('.eris-sos-content p');
        if (sosP) sosP.textContent = `Alert notification sent to ${getDoctorName()} and ICU ${patient.ward || 'Ward'} Nurse Station!`;
    };

    const switchPatientCode = (newCode) => {
        if (!newCode) return;
        const clean = newCode.trim().toUpperCase();
        activePatientCode = clean;
        localStorage.setItem('eris_active_patient_code', clean);
        state.lastRenderedMessageCount = 0; // Reset chat render count

        if (window.PatientsDB) {
            const patient = window.PatientsDB.getAll().find(p => 
                (p.code && p.code.toUpperCase() === clean) || 
                (p.id && p.id.toUpperCase() === clean) ||
                (p.id && p.id.toUpperCase() === `PT-${clean.padStart(4, '0')}`)
            );
            if (patient) {
                updatePatientHeaderUI(patient);
            }
        }
        if (modalCode) modalCode.style.display = 'none';
    };

    if (btnCode && modalCode) {
        btnCode.addEventListener('click', () => {
            modalCode.style.display = 'flex';
        });
    }
    if (modalClose && modalCode) {
        modalClose.addEventListener('click', () => {
            modalCode.style.display = 'none';
        });
    }
    if (btnSubmitCode && inputCode) {
        btnSubmitCode.addEventListener('click', () => {
            if (inputCode.value) switchPatientCode(inputCode.value);
        });
    }
    codeChips.forEach(chip => {
        chip.addEventListener('click', () => {
            const code = chip.getAttribute('data-code');
            if (code) switchPatientCode(code);
        });
    });

    // Subscribe to Live Firebase PatientsDB — REAL-TIME BI-DIRECTIONAL SYNC
    if (window.PatientsDB) {
        window.PatientsDB.onUpdate((patients) => {
            const target = patients.find(p => 
                (p.code && p.code.toUpperCase() === activePatientCode.toUpperCase()) || 
                (p.id && p.id.toUpperCase() === activePatientCode.toUpperCase()) ||
                (p.id && p.id.toUpperCase() === `PT-${activePatientCode.replace('PT-', '').padStart(4, '0')}`)
            ) || patients[0];

            if (target) {
                updatePatientHeaderUI(target);
            }
        });
    }
});
