// patients.js — Firestore-backed patient database
// Replaces localStorage with Cloud Firestore for real-time sync

const INITIAL_PATIENTS = [
    { id: 'PT-0041', name: 'Zaid Al-Qasim', age: 34, gender: 'M', ward: 'ICU-3', date: '2026-06-08', conditionProfile: 'tachycardia', notes: [], interventions: [], alertsHistory: [] },
    { id: 'PT-0082', name: 'Rania Mansour', age: 52, gender: 'F', ward: 'Cardiology', date: '2026-06-09', conditionProfile: 'normal', notes: [], interventions: [], alertsHistory: [] },
    { id: 'PT-0105', name: 'Bilal Abdel-Rahman', age: 67, gender: 'M', ward: 'Neurology', date: '2026-06-05', conditionProfile: 'tremor', notes: [], interventions: [], alertsHistory: [] },
    { id: 'PT-0112', name: 'Huda Qureshi', age: 29, gender: 'F', ward: 'ICU-1', date: '2026-06-10', conditionProfile: 'hypoxemia', notes: [], interventions: [], alertsHistory: [] },
    { id: 'PT-0204', name: 'Sami Haddad', age: 45, gender: 'M', ward: 'Cardiology', date: '2026-06-07', conditionProfile: 'normal', notes: [], interventions: [], alertsHistory: [] },
    { id: 'PT-0218', name: 'Nora Al-Saud', age: 71, gender: 'F', ward: 'Neurology', date: '2026-06-02', conditionProfile: 'high_stress', notes: [], interventions: [], alertsHistory: [] },
    { id: 'PT-0331', name: 'Khalid Othman', age: 38, gender: 'M', ward: 'ICU-2', date: '2026-06-09', conditionProfile: 'critical_multi', notes: [], interventions: [], alertsHistory: [] },
    { id: 'PT-0402', name: 'Ayesha Sultan', age: 60, gender: 'F', ward: 'Cardiology', date: '2026-06-10', conditionProfile: 'bradycardia', notes: [], interventions: [], alertsHistory: [] },
    { id: 'PT-0403', name: 'Omar Farooq', age: 55, gender: 'M', ward: 'General', date: '2026-06-11', conditionProfile: 'normal', notes: [], interventions: [], alertsHistory: [] }
];

const PatientsDB = {
    _cache: [],          // In-memory cache for sync access (animation loops)
    _initialized: false,
    _listeners: [],      // Callbacks for real-time updates

    // Initialize: seed Firestore if empty, start real-time listener
    async init() {
        if (this._initialized) return;
        this._initialized = true;

        try {
            const snapshot = await db.collection('patients').limit(1).get();
            if (snapshot.empty) {
                console.log('🌱 Seeding Firestore with initial patients...');
                const batch = db.batch();
                for (const patient of INITIAL_PATIENTS) {
                    batch.set(db.collection('patients').doc(patient.id), patient);
                }
                await batch.commit();
                console.log('✅ Seeded', INITIAL_PATIENTS.length, 'patients');
            }
        } catch (err) {
            console.error('❌ Firestore init failed, falling back to localStorage:', err);
            this._useFallback = true;
            this._fallbackInit();
            return;
        }

        // Start real-time listener
        db.collection('patients').onSnapshot(snapshot => {
            this._cache = [];
            snapshot.forEach(doc => {
                this._cache.push({ ...doc.data(), id: doc.id });
            });
            // Sort by date descending (newest first)
            this._cache.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
            // Notify listeners
            this._listeners.forEach(cb => cb(this._cache));
        }, err => {
            console.error('Firestore listener error:', err);
        });
    },

    // Fallback to localStorage if Firestore is unavailable
    _useFallback: false,
    _fallbackInit() {
        if (!localStorage.getItem('alpha1_patients_v3')) {
            localStorage.setItem('alpha1_patients_v3', JSON.stringify(INITIAL_PATIENTS));
        }
        this._cache = JSON.parse(localStorage.getItem('alpha1_patients_v3'));
    },
    _fallbackSave() {
        localStorage.setItem('alpha1_patients_v3', JSON.stringify(this._cache));
    },

    // Subscribe to real-time patient updates
    onUpdate(callback) {
        this._listeners.push(callback);
        // Immediately call with current cache if available
        if (this._cache.length > 0) {
            callback(this._cache);
        }
    },

    // Get all patients (sync from cache — safe for animation loops)
    getAll() {
        return [...this._cache];
    },

    // Get patient by ID (sync from cache)
    getById(id) {
        return this._cache.find(p => p.id === id) || null;
    },

    // Add a new patient
    async addPatient(patient) {
        if (!patient.id) {
            const maxNum = Math.max(0, ...this._cache.map(p => parseInt(p.id.split('-')[1]) || 0));
            patient.id = `PT-${String(maxNum + 1).padStart(4, '0')}`;
        }
        if (!patient.date) {
            patient.date = new Date().toISOString().split('T')[0];
        }
        patient.notes = patient.notes || [];
        patient.interventions = patient.interventions || [];
        patient.alertsHistory = patient.alertsHistory || [];

        if (this._useFallback) {
            this._cache.push(patient);
            this._fallbackSave();
        } else {
            try {
                await db.collection('patients').doc(patient.id).set(patient);
            } catch (err) {
                console.error('Failed to add patient:', err);
                // Fallback: add to cache directly
                this._cache.push(patient);
            }
        }
        return patient;
    },

    // Update a patient's fields
    async updatePatient(id, updates) {
        if (this._useFallback) {
            const index = this._cache.findIndex(p => p.id === id);
            if (index !== -1) {
                this._cache[index] = { ...this._cache[index], ...updates };
                this._fallbackSave();
            }
        } else {
            try {
                await db.collection('patients').doc(id).update(updates);
            } catch (err) {
                console.error('Failed to update patient:', err);
                // Fallback: update cache directly
                const index = this._cache.findIndex(p => p.id === id);
                if (index !== -1) {
                    this._cache[index] = { ...this._cache[index], ...updates };
                }
            }
        }
    },

    // Delete a patient
    async deletePatient(id) {
        if (this._useFallback) {
            this._cache = this._cache.filter(p => p.id !== id);
            this._fallbackSave();
        } else {
            try {
                await db.collection('patients').doc(id).delete();
            } catch (err) {
                console.error('Failed to delete patient:', err);
                this._cache = this._cache.filter(p => p.id !== id);
            }
        }
    },

    // Save entire patient list (for batch operations like discharge)
    async save(patients) {
        if (this._useFallback) {
            this._cache = patients;
            this._fallbackSave();
        } else {
            try {
                // Find which patients were removed
                const currentIds = new Set(patients.map(p => p.id));
                const removedIds = this._cache
                    .filter(p => !currentIds.has(p.id))
                    .map(p => p.id);

                const batch = db.batch();
                for (const id of removedIds) {
                    batch.delete(db.collection('patients').doc(id));
                }
                // Update remaining patients
                for (const patient of patients) {
                    batch.set(db.collection('patients').doc(patient.id), patient);
                }
                await batch.commit();
            } catch (err) {
                console.error('Failed to batch save:', err);
                this._cache = patients;
            }
        }
    },

    // Write sensor reading to Firestore (from hardware or simulator)
    async writeSensorReading(patientId, reading) {
        if (this._useFallback) return;
        try {
            await db.collection('sensorData').doc(patientId)
                .collection('readings').add({
                    ...reading,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
            // Also update lastReading on patient doc
            await db.collection('patients').doc(patientId).update({
                lastReading: { ...reading, timestamp: Date.now() }
            });
        } catch (err) {
            // Silent fail for sensor writes — they're high frequency
        }
    },

    // Listen to live sensor data for a specific patient
    onSensorData(patientId, callback) {
        if (this._useFallback) return () => {};
        return db.collection('sensorData').doc(patientId)
            .collection('readings')
            .orderBy('timestamp', 'desc')
            .limit(1)
            .onSnapshot(snapshot => {
                snapshot.forEach(doc => {
                    callback(doc.data());
                });
            });
    }
};

// Initialize on load
PatientsDB.init();
