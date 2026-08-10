// doctor-helper.js
// Analyzes sensor data and generates diagnostic alerts

const DoctorHelper = {
    // History to prevent alert spam (debounce)
    alertHistory: {},
    
    // Normal/Warning/Critical thresholds and rules
    analyze(sensorId, value) {
        let status = 'normal';
        let diagnosis = null;
        let recommendation = null;

        switch (sensorId) {
            case 'emg':
                if (value > 1500) {
                    status = 'critical';
                    diagnosis = 'Possible seizure / Tetanus';
                    recommendation = 'Administer anticonvulsant. Ensure patient safety.';
                } else if (value > 500) {
                    status = 'warning';
                    diagnosis = 'Muscle hypertonicity / Spasticity';
                    recommendation = 'Check for distress or discomfort.';
                } else if (value < 10) {
                    status = 'critical';
                    diagnosis = 'Severe Denervation / Paralysis';
                    recommendation = 'Check neurological function immediately.';
                } else if (value < 50) {
                    status = 'warning';
                    diagnosis = 'Muscle weakness / Myopathy';
                    recommendation = 'Monitor motor function.';
                }
                break;
                
            case 'gsr':
                if (value > 25) {
                    status = 'critical';
                    diagnosis = 'Severe Autonomic Dysregulation';
                    recommendation = 'Assess for anaphylaxis, panic attack, or autonomic storm.';
                } else if (value > 20) {
                    status = 'warning';
                    diagnosis = 'Acute Stress / Sympathetic Activation';
                    recommendation = 'Evaluate pain, anxiety, or environmental stressors.';
                } else if (value < 0.5) {
                    status = 'warning';
                    diagnosis = 'Anhidrosis / Possible Sensor Disconnect';
                    recommendation = 'Check GSR electrode contact and skin preparation.';
                }
                break;

            case 'ppg': // Heart Rate
                if (value > 150) {
                    status = 'critical';
                    diagnosis = 'Severe Tachycardia (Possible SVT/VT)';
                    recommendation = 'Immediate ECG required. Prepare crash cart.';
                } else if (value > 100) {
                    status = 'warning';
                    diagnosis = 'Tachycardia (Fever, Anxiety, or Hypovolemia)';
                    recommendation = 'Check temperature, fluids, and pain levels.';
                } else if (value < 40) {
                    status = 'critical';
                    diagnosis = 'Severe Bradycardia / Heart Block';
                    recommendation = 'Prepare pacing. Administer atropine if symptomatic.';
                } else if (value < 60) {
                    status = 'warning';
                    diagnosis = 'Bradycardia';
                    recommendation = 'Review medications (beta blockers?). Check baseline.';
                }
                break;

            case 'spo2':
                if (value < 90) {
                    status = 'critical';
                    diagnosis = 'Severe Hypoxemia';
                    recommendation = 'Administer high-flow O2 immediately. Consider intubation.';
                } else if (value < 95) {
                    status = 'warning';
                    diagnosis = 'Mild Hypoxemia';
                    recommendation = 'Titrate O2 to maintain >94%. Elevate head of bed.';
                }
                break;

            case 'imu':
                if (value > 3.0) {
                    status = 'critical';
                    diagnosis = 'Impact / Fall Detected';
                    recommendation = 'Immediate bedside assistance required.';
                } else if (value > 1.5) {
                    status = 'warning';
                    diagnosis = 'Abnormal Movement / Tremor';
                    recommendation = 'Assess for Parkinsonian tremor or seizure activity.';
                }
                break;
        }

        return { status, diagnosis, recommendation };
    },

    calculateRiskScore(readings) {
        let score = 0;
        const hr = readings.ppg.value;
        const spo2 = readings.spo2.value;
        const gsr = readings.gsr.value;
        const emg = readings.emg.value;
        const imu = readings.imu.value;

        if (hr > 150 || hr < 40) score += 40;
        else if (hr > 100 || hr < 60) score += 20;

        if (spo2 < 90) score += 30;
        else if (spo2 < 95) score += 15;

        if (gsr > 25) score += 15; else if (gsr > 20) score += 8;
        if (emg > 1500 || emg < 10) score += 10;
        if (imu > 3.0) score += 5;
        
        return Math.min(100, score);
    },

    processReadings(readings) {
        const results = [];
        let maxStatus = 'normal';

        for (const [sensorId, data] of Object.entries(readings)) {
            const analysis = this.analyze(sensorId, data.value);
            if (analysis.status !== 'normal') {
                results.push({ sensor: sensorId, value: data.value, ...analysis });
            }
        }

        // Vital Signs Correlation Engine
        const hr = readings.ppg.value;
        const spo2 = readings.spo2.value;
        const gsr = readings.gsr.value;
        const emg = readings.emg.value;
        const imu = readings.imu.value;

        if (hr > 100 && spo2 < 95) {
            results.push({
                sensor: 'correlator',
                value: `HR:${hr} SpO2:${spo2}`,
                status: spo2 < 90 ? 'critical' : 'warning',
                diagnosis: 'Possible Pulmonary Embolism / ARDS',
                recommendation: 'Correlated meta-alert: Evaluate for respiratory failure immediately.'
            });
        }
        if (hr > 100 && gsr > 20) {
            results.push({
                sensor: 'correlator',
                value: `HR:${hr} GSR:${gsr}`,
                status: gsr > 25 ? 'critical' : 'warning',
                diagnosis: 'Acute Stress Response with Tachycardia',
                recommendation: 'Correlated meta-alert: Evaluate for pain crisis, panic, or sepsis.'
            });
        }
        if (emg < 10 && gsr < 1) {
            results.push({
                sensor: 'correlator',
                value: `EMG:${emg} GSR:${gsr}`,
                status: 'warning',
                diagnosis: 'Oversedation / Deep Coma',
                recommendation: 'Correlated meta-alert: Check sedation protocols and autonomic reflexes.'
            });
        }

        for (const r of results) {
            if (r.status === 'critical') maxStatus = 'critical';
            else if (maxStatus === 'normal' && r.status === 'warning') maxStatus = 'warning';
        }

        const riskScore = this.calculateRiskScore(readings);

        return { overallStatus: maxStatus, alerts: results, riskScore };
    }
};

window.DoctorHelper = DoctorHelper;
