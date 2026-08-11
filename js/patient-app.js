// patient-app.js
let charts = {};
let currentPatient = null;
let lastDiagnosisTime = 0;
let audioContext = null;

// Trend history (replaces simulator.history)
let trendHistory = { ppg: [], spo2: [], gsr: [], emg: [], imu: [] };

// ESP32 Live Connection State
let isESP32Connected = false;
let lastESP32DataTime = 0;
let liveReadings = null;
let sensorUnsubscribe = null;
const CONNECTION_TIMEOUT_MS = 10000; // 10 seconds without data = disconnected

document.addEventListener('DOMContentLoaded', () => {
    Auth.requireAuth();

    const urlParams = new URLSearchParams(window.location.search);
    const patientId = urlParams.get('id');

    if (!patientId) {
        window.location.href = 'dashboard.html';
        return;
    }

    // Wait for Firestore cache to populate, then load patient
    function tryLoadPatient(retries) {
        currentPatient = PatientsDB.getById(patientId);
        if (!currentPatient && retries > 0) {
            setTimeout(() => tryLoadPatient(retries - 1), 200);
            return;
        }
        if (!currentPatient) {
            alert("Patient not found.");
            window.location.href = 'dashboard.html';
            return;
        }
        initPatientView();
    }
    tryLoadPatient(15); // Try up to 3 seconds
});

function initPatientView() {
    // Populate header
    const patientName = currentPatient.name || 'Unknown';
    document.getElementById('pt-name').textContent = patientName;
    document.getElementById('pt-id').textContent = currentPatient.id;
    document.getElementById('pt-age-gender').textContent = `${currentPatient.age}yo ${currentPatient.gender}`;
    document.getElementById('pt-ward').textContent = currentPatient.ward;

    // Generate SVG Avatar
    const initials = patientName.split(' ').map(n => n[0]).join('');
    const bgColors = ['#0ea5e9', '#8b5cf6', '#10b981', '#f59e0b', '#f43f5e'];
    const color = bgColors[currentPatient.id.charCodeAt(currentPatient.id.length-1) % bgColors.length];
    document.getElementById('pt-avatar').style.backgroundColor = 'transparent';
    document.getElementById('pt-avatar').innerHTML = `
        <svg viewBox="0 0 100 100" width="100%" height="100%" style="border-radius:50%;">
            <rect width="100" height="100" fill="${color}" />
            <text x="50" y="50" fill="white" font-size="40" font-family="sans-serif" text-anchor="middle" dominant-baseline="central">${initials}</text>
        </svg>
    `;

    document.getElementById('param-hr').textContent = currentPatient.conditionProfile === 'tachycardia' ? '120-140' : (currentPatient.conditionProfile === 'bradycardia' ? '40-50' : '60-100');

    // Initialize Charts
    charts = {
        emg: new WaveformChart('canvas-emg', { color: '#10b981', minY: -2000, maxY: 2000, speed: 1.5 }),
        gsr: new WaveformChart('canvas-gsr', { color: '#10b981', minY: 0, maxY: 30, speed: 1 }),
        ppg: new WaveformChart('canvas-ppg', { color: '#10b981', minY: -1, maxY: 1.5, speed: 2, lineWidth: 3 }),
        spo2: new WaveformChart('canvas-spo2', { color: '#10b981', minY: 80, maxY: 100, speed: 0.5 }),
        imu: new WaveformChart('canvas-imu', { color: '#10b981', minY: -100, maxY: 100, speed: 1 })
    };

    // ===== ESP32 Live Data Listener =====
    startLiveDataListener(currentPatient.id);

    // Phi-3.5 Patient AI Analysis Handler
    const phiBtn = document.getElementById('btn-phi-patient-query');
    const phiSummary = document.getElementById('phi-patient-summary');
    if (phiBtn) {
        phiBtn.addEventListener('click', async () => {
            if (phiBtn.disabled) return;
            phiBtn.disabled = true;
            if (phiSummary) phiSummary.textContent = "⚡ Phi-3.5 Executing Multi-Sensor Neural Analysis...";

            const res = await Alpha1Brain.query(`Analyze complete vital telemetry for patient ${currentPatient.name} (${currentPatient.id})`, currentPatient);
            if (phiSummary) phiSummary.textContent = res.replace(/\*\*/g, '').replace(/⚡|📋|🫀|✦/g, '').trim();
            phiBtn.disabled = false;
        });
    }

    // Simulation Controls State
    let isPlaying = true;
    let speedMultiplier = 1.0;

    const btnPlayPause = document.getElementById('btn-play-pause');
    const iconPlay = document.getElementById('icon-play');
    const iconPause = document.getElementById('icon-pause');
    const speedSlider = document.getElementById('speed-slider');
    const speedLabel = document.getElementById('speed-label');

    btnPlayPause.addEventListener('click', () => {
        isPlaying = !isPlaying;
        if (isPlaying) {
            iconPause.style.display = 'block';
            iconPlay.style.display = 'none';
        } else {
            iconPause.style.display = 'none';
            iconPlay.style.display = 'block';
            lastTime = performance.now(); // reset time so dt doesn't jump
        }
    });

    speedSlider.addEventListener('input', (e) => {
        speedMultiplier = parseFloat(e.target.value);
        speedLabel.textContent = speedMultiplier.toFixed(1) + 'x';
    });

    // Main Loop
    let lastTime = performance.now();
    let lastTextUpdateTime = 0;
    let lastTrendUpdateTime = 0;
    let lastConnectionCheckTime = 0;

    function loop(time) {
        const dt = (time - lastTime) / 1000;
        lastTime = time;

        // Check connection status every 2 seconds
        if (time - lastConnectionCheckTime > 2000) {
            updateConnectionStatus();
            lastConnectionCheckTime = time;
        }

        // Only step if not paused
        if (isPlaying && dt > 0 && dt < 0.1) {
            let readings;

            if (isESP32Connected && liveReadings) {
                // Use live ESP32 data
                readings = liveReadings;

                // Push data to waveform charts
                charts.ppg.pushData(readings.ppg.wave);
                charts.spo2.pushData(readings.spo2.wave);
                charts.gsr.pushData(readings.gsr.wave);
                charts.emg.pushData(readings.emg.wave);
                charts.imu.pushData(readings.imu.wave);

                charts.ppg.render();
                charts.spo2.render();
                charts.gsr.render();
                charts.emg.render();
                charts.imu.render();

                // Throttle text updates to 1Hz
                if (time - lastTextUpdateTime > 1000) {
                    document.getElementById('val-emg').textContent = readings.emg.value;
                    document.getElementById('val-gsr').textContent = readings.gsr.value;
                    document.getElementById('val-ppg').textContent = readings.ppg.value;
                    document.getElementById('val-spo2').textContent = readings.spo2.value;
                    document.getElementById('val-imu').textContent = readings.imu.value;
                    runDiagnostics(readings);
                    lastTextUpdateTime = time;
                }

                // Throttle trend chart update to 0.2Hz (5s)
                if (time - lastTrendUpdateTime > 5000) {
                    trendHistory.ppg.push(readings.ppg.value);
                    trendHistory.spo2.push(readings.spo2.value);
                    trendHistory.gsr.push(readings.gsr.value);
                    trendHistory.emg.push(readings.emg.value);
                    trendHistory.imu.push(readings.imu.value);
                    if (trendHistory.ppg.length > 100) {
                        ['ppg', 'spo2', 'gsr', 'emg', 'imu'].forEach(k => trendHistory[k].shift());
                    }
                    drawTrendChart();
                    lastTrendUpdateTime = time;
                }
            }
            // No else fallback — without ESP32 data, charts stay flat / show waiting state
        }

        requestAnimationFrame(loop);
    }

    requestAnimationFrame(loop);
    
    // Setup export button
    document.getElementById('btn-export').addEventListener('click', exportData);
}

// ===== ESP32 Live Data Listener =====
function startLiveDataListener(patientId) {
    const handleIncomingTelemetry = (data) => {
        if (!data) return;
        lastESP32DataTime = data.timestamp || Date.now();

        const hr = data.hr || data.heartRate || data.ppgValue || 0;
        const spo2 = data.spo2 || data.oximetry || 0;
        const gsr = data.gsr || data.stress || 0;
        const emg = data.emg || data.muscle || 0;
        const imu = data.imu || data.motion || 0;

        liveReadings = {
            ppg: { value: hr, wave: data.ppgWave || Math.sin(Date.now() / 200) * (hr ? 1 : 0) },
            spo2: { value: spo2, wave: spo2 },
            gsr: { value: gsr, wave: gsr },
            emg: { value: Math.round(emg), wave: emg * (Math.random() - 0.5) * 2 },
            imu: { value: imu, wave: imu * (Math.random() - 0.5) * 10 }
        };
    };

    // 1. Listen to patient document for lastReading / vitals
    db.collection('patients').doc(patientId).onSnapshot(doc => {
        if (!doc.exists) return;
        const data = doc.data();
        if (data.lastReading) {
            handleIncomingTelemetry(data.lastReading);
        } else if (data.vitals) {
            handleIncomingTelemetry({
                hr: data.vitals.hr,
                spo2: data.vitals.spo2,
                gsr: data.vitals.gsr,
                emg: data.vitals.emg,
                imu: data.vitals.imu || 0,
                timestamp: data.vitals.timestamp || Date.now()
            });
        }
    }, err => {
        console.warn('Patient doc live listener notice:', err);
    });

    // 2. Listen to sensorData subcollection for real-time readings stream
    sensorUnsubscribe = db.collection('sensorData').doc(patientId)
        .collection('readings')
        .orderBy('timestamp', 'desc')
        .limit(1)
        .onSnapshot(snapshot => {
            snapshot.forEach(doc => {
                handleIncomingTelemetry(doc.data());
            });
        }, err => {
            console.warn('sensorData subcollection listener notice:', err);
        });

    // 3. Listen to top-level telemetry collection
    db.collection('telemetry').doc(patientId).onSnapshot(doc => {
        if (doc.exists) {
            handleIncomingTelemetry(doc.data());
        }
    }, err => {
        console.warn('Telemetry collection listener notice:', err);
    });
}

// ===== Connection Status UI =====
function updateConnectionStatus() {
    const now = Date.now();
    const wasConnected = isESP32Connected;
    isESP32Connected = (now - lastESP32DataTime) < CONNECTION_TIMEOUT_MS && lastESP32DataTime > 0;

    const bar = document.getElementById('exo-connection-bar');
    const dot = document.getElementById('connection-dot');
    const statusText = document.getElementById('connection-status-text');
    const badge = document.getElementById('data-source-badge');
    const timeEl = document.getElementById('last-data-time');

    if (isESP32Connected) {
        bar.className = 'exo-connection-bar connected';
        dot.className = 'connection-dot connected';
        statusText.className = 'connection-status connected';
        statusText.textContent = 'CONNECTED';
        badge.className = 'data-source-badge live';
        badge.textContent = 'LIVE';
        
        const ago = Math.round((now - lastESP32DataTime) / 1000);
        timeEl.textContent = ago <= 1 ? 'Just now' : `${ago}s ago`;
    } else {
        bar.className = 'exo-connection-bar disconnected';
        dot.className = 'connection-dot disconnected';
        statusText.className = 'connection-status disconnected';
        statusText.textContent = 'DISCONNECTED';
        badge.className = 'data-source-badge simulated';
        badge.textContent = 'WAITING';
        
        if (lastESP32DataTime > 0) {
            const ago = Math.round((now - lastESP32DataTime) / 1000);
            timeEl.textContent = `Last: ${ago}s ago`;
        } else {
            timeEl.textContent = 'No data received';
        }


    }

    // Log state change
    if (wasConnected !== isESP32Connected) {
        console.log(`🔌 ESP32 Connection: ${isESP32Connected ? 'CONNECTED' : 'DISCONNECTED'}`);
    }
}

// Sound Generator for critical alerts
function playBeep() {
    if (!audioContext) {
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch(e) {
            return;
        }
    }
    
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }

    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, audioContext.currentTime); // High pitch beep
    osc.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0, audioContext.currentTime);
    gain.gain.linearRampToValueAtTime(0.5, audioContext.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    osc.connect(gain);
    gain.connect(audioContext.destination);
    
    osc.start();
    osc.stop(audioContext.currentTime + 0.3);
}

// Global state for throttling audio
let isCriticalNow = false;
let lastTimelineAlerts = [];

function runDiagnostics(readings) {
    const diag = DoctorHelper.processReadings(readings);
    
    // Handle the Status Badge in header
    const statusBadge = document.getElementById('overall-status-badge');
    const mainStatusText = document.getElementById('main-status-text');
    
    statusBadge.className = `badge badge-${diag.overallStatus}`;
    statusBadge.textContent = diag.overallStatus.toUpperCase();
    
    mainStatusText.className = `status-text ${diag.overallStatus}`;
    mainStatusText.textContent = diag.overallStatus.toUpperCase();

    // Reset panel colors
    ['ppg', 'spo2', 'gsr', 'emg', 'imu'].forEach(sensor => {
        const panel = document.getElementById(`panel-${sensor}`);
        if(panel) panel.style.borderColor = 'var(--border-subtle)';
    });

    let hasCritical = false;
    
    diag.alerts.forEach(alert => {
        if (alert.sensor === 'correlator') {
            addTimelineEvent(alert);
            if (alert.status === 'critical') hasCritical = true;
            return;
        }

        const panel = document.getElementById(`panel-${alert.sensor}`);
        if(panel) panel.style.borderColor = alert.status === 'critical' ? 'var(--color-critical)' : 'var(--color-warning)';
        
        // Ensure we don't spam the timeline with the exact same alert
        const isSpam = lastTimelineAlerts.some(a => a.sensor === alert.sensor && a.status === alert.status && (Date.now() - a.time < 10000));
        
        if (!isSpam) {
            addTimelineEvent(alert);
            lastTimelineAlerts.push({ sensor: alert.sensor, status: alert.status, time: Date.now() });
            
            // Keep list small
            if(lastTimelineAlerts.length > 20) lastTimelineAlerts.shift();
        }
        
        if(alert.status === 'critical') hasCritical = true;
    });

    if (hasCritical) {
        document.getElementById('critical-banner').style.display = 'flex';
        if (!isCriticalNow) {
            isCriticalNow = true;
            playBeep();
        }
    } else {
        document.getElementById('critical-banner').style.display = 'none';
        isCriticalNow = false;
    }

    // Update Risk Score Gauge
    const riskScore = diag.riskScore || 0;
    const riskGaugePath = document.getElementById('risk-gauge-path');
    const riskGaugeText = document.getElementById('risk-gauge-text');
    if (riskGaugePath && riskGaugeText) {
        riskGaugeText.textContent = Math.round(riskScore);
        riskGaugePath.setAttribute('stroke-dasharray', `${riskScore}, 100`);
        
        let riskColor = 'var(--color-normal)';
        if (riskScore > 75) riskColor = 'var(--color-critical)';
        else if (riskScore > 40) riskColor = 'var(--color-warning)';
        riskGaugePath.setAttribute('stroke', riskColor);
    }
}

// Simple timeline deduping
function addTimelineEvent(alert) {
    const timeline = document.getElementById('alerts-timeline');
    const el = document.createElement('div');
    el.className = `timeline-item ${alert.status}`;
    
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second:'2-digit' });
    
    el.innerHTML = `
        <div class="timeline-time">${timeStr} | ${alert.sensor.toUpperCase()}</div>
        <div class="timeline-title">${alert.diagnosis}</div>
        <div class="timeline-desc">${alert.recommendation}</div>
        <div class="timeline-action">Value: ${alert.value}</div>
    `;
    
    timeline.insertBefore(el, timeline.firstChild);
}
function exportData() {
    // Generate PDF using html2pdf if available
    if (window.html2pdf) {
        const element = document.querySelector('.patient-layout'); // Capture the left column stats and charts
        const opt = {
          margin:       0.5,
          filename:     `Alpha1_Report_${currentPatient.id}_${new Date().toISOString().split('T')[0]}.pdf`,
          image:        { type: 'jpeg', quality: 0.98 },
          html2canvas:  { scale: 2, useCORS: true },
          jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
        };

        html2pdf().set(opt).from(element).save();
    } else {
        alert("PDF generator not loaded.");
    }
}

// Draw Trend Chart
let trendSensor = 'ppg';
const trendSelector = document.getElementById('trend-selector');
if (trendSelector) {
    trendSelector.addEventListener('change', (e) => {
        trendSensor = e.target.value;
        drawTrendChart();
    });
}

function drawTrendChart() {
    const canvas = document.getElementById('trend-canvas');
    if (!canvas || !trendHistory || !trendHistory[trendSensor]) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.clearRect(0, 0, width, height);
    const data = trendHistory[trendSensor];
    if (data.length === 0) return;
    
    // Find min and max
    let min = Math.min(...data);
    let max = Math.max(...data);
    if (max === min) { max += 10; min -= 10; }
    const range = max - min;
    
    ctx.beginPath();
    ctx.strokeStyle = '#0891b2';
    ctx.lineWidth = 3;
    
    data.forEach((val, i) => {
        const x = (i / (data.length - 1)) * width;
        const y = height - ((val - min) / range) * (height - 20) - 10;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.stroke();
    
    // Add gradient fill
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, 'rgba(8, 145, 178, 0.2)');
    gradient.addColorStop(1, 'rgba(8, 145, 178, 0)');
    ctx.fillStyle = gradient;
    ctx.fill();
}

// Doctor Notes
const btnSaveNote = document.getElementById('btn-save-note');
if (btnSaveNote) {
    btnSaveNote.addEventListener('click', async () => {
        const text = document.getElementById('note-input').value.trim();
        if (!text) return;
        const type = document.getElementById('note-type').value;
        
        currentPatient.notes = currentPatient.notes || [];
        currentPatient.notes.push({ text, type, timestamp: new Date().toISOString() });
        PatientsDB.updatePatient(currentPatient.id, { notes: currentPatient.notes });
        
        // Add to timeline
        addTimelineEvent({
            sensor: 'Notes',
            status: type === 'Medication' ? 'normal' : 'warning',
            diagnosis: `[${type}] Logged`,
            recommendation: text,
            value: ''
        });
        
        document.getElementById('note-input').value = '';
    });
}

// ===== REAL-TIME PATIENT-DOCTOR CHAT SYNC =====
const chatFeed = document.getElementById('pt-doc-chat-feed');
const chatInput = document.getElementById('pt-doc-chat-input');
const chatSend = document.getElementById('pt-doc-chat-send');

let lastRenderedCount = -1;

function renderPatientChatMessages(messages) {
    if (!chatFeed) return;
    const msgs = messages || [];
    if (msgs.length === lastRenderedCount) return;
    lastRenderedCount = msgs.length;

    if (msgs.length === 0) {
        chatFeed.innerHTML = '<div style="font-size: 0.8rem; color: var(--text-muted); text-align: center; padding: 1rem;">No messages yet. Start a conversation with the patient!</div>';
        return;
    }

    chatFeed.innerHTML = '';
    msgs.forEach(m => {
        const isDoc = m.type === 'doc';
        const isAi = m.type === 'ai';
        const align = isDoc ? 'flex-end' : 'flex-start';
        const bg = isDoc ? 'rgba(14,165,233,0.2)' : (isAi ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.06)');
        const border = isDoc ? '1px solid rgba(14,165,233,0.4)' : (isAi ? '1px solid rgba(139,92,246,0.4)' : '1px solid var(--border-subtle)');
        const time = m.timestamp ? new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
        const sender = isDoc ? (Auth.getUser() ? `Dr. ${Auth.getUser().username}` : 'Doctor') : (m.sender || 'Patient');

        const msgDiv = document.createElement('div');
        msgDiv.style.cssText = `align-self: ${align}; max-width: 85%; background: ${bg}; border: ${border}; padding: 0.5rem 0.75rem; border-radius: var(--radius-md); margin-bottom: 0.25rem; font-size: 0.85rem;`;
        msgDiv.innerHTML = `
            <div style="font-size: 0.7rem; font-weight: bold; color: ${isDoc ? 'var(--accent-cyan)' : (isAi ? '#a78bfa' : 'var(--text-secondary)')}; margin-bottom: 2px; display:flex; justify-content:space-between; gap:0.5rem;">
                <span>${sender}</span>
                <span style="opacity:0.6; font-weight:normal;">${time}</span>
            </div>
            <div style="color: var(--text-primary); line-height: 1.3;">${(m.text || '').replace(/\n/g, '<br>')}</div>
        `;
        chatFeed.appendChild(msgDiv);
    });

    chatFeed.scrollTop = chatFeed.scrollHeight;
}

async function sendDoctorChatMessage() {
    if (!chatInput || !currentPatient) return;
    const text = chatInput.value.trim();
    if (!text) return;
    chatInput.value = '';

    const doctorName = Auth.getUser() ? `Dr. ${Auth.getUser().username}` : 'Doctor';
    const newMsg = {
        id: `m_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        sender: doctorName,
        text: text,
        timestamp: Date.now(),
        type: 'doc'
    };

    const currentMsgs = currentPatient.messages || [];
    currentMsgs.push(newMsg);
    currentPatient.messages = currentMsgs;

    // Immediately render UI
    renderPatientChatMessages(currentMsgs);

    // Sync to Firestore
    await PatientsDB.updatePatient(currentPatient.id, { messages: currentMsgs });
}

if (chatSend) chatSend.addEventListener('click', sendDoctorChatMessage);
if (chatInput) {
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') sendDoctorChatMessage();
    });
}

// Live listener for real-time message updates on patient.html
if (typeof PatientsDB !== 'undefined') {
    PatientsDB.onUpdate((patients) => {
        if (!currentPatient) return;
        const updated = patients.find(p => p.id === currentPatient.id);
        if (updated) {
            currentPatient = updated;
            renderPatientChatMessages(updated.messages);
        }
    });
}

