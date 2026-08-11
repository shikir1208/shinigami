import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  onSnapshot, 
  arrayUnion, 
  collection, 
  getDocs 
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Firebase Configuration for Alpha1
const firebaseConfig = {
  apiKey: "AIzaSyAQx9I9rL2XTLf2GZV_xuwufkXilWwDAE4",
  authDomain: "alpha1-10be6.firebaseapp.com",
  projectId: "alpha1-10be6",
  storageBucket: "alpha1-10be6.firebasestorage.app",
  messagingSenderId: "1046483351913",
  appId: "1:1046483351913:web:1562f345f49e8dfc9265f8"
};

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);

// Key for stored patient session
const STORAGE_PATIENT_CODE_KEY = '@eris_patient_code';

// Default mock patient catalog to seed Firestore if empty
export const DEFAULT_PATIENTS = [
  {
    id: 'PT-0331',
    code: 'PT-0331',
    name: 'Khalid Othman',
    age: 38,
    gender: 'M',
    ward: 'ICU-2',
    conditionProfile: 'critical_multi',
    recoveryPercent: 68,
    xp: 4850,
    nextLevelXp: 6000,
    level: 14,
    rankTier: 'GOLD TIER III',
    streakDays: 12,
    vitals: { hr: 78, spo2: 98, gsr: 1.4, imuStatus: 'Stable', temp: 36.8, sys: 120, dia: 80 },
    quests: [
      { id: 'q1', title: 'Wrist Extension 3x10', xp: 250, completed: true },
      { id: 'q2', title: 'SpO2 Deep Breathing (5m)', xp: 150, completed: false },
      { id: 'q3', title: 'GSR Stress Relaxation', xp: 300, completed: false },
      { id: 'q4', title: 'IMU Motion Tracking Check', xp: 200, completed: false }
    ],
    messages: [
      { id: 'm1', sender: 'Dr. Sarah Chen', text: 'Good morning Khalid! Your SpO2 levels look great today.', timestamp: Date.now() - 3600000, type: 'doc' },
      { id: 'm2', sender: 'Khalid', text: 'Thank you doctor! Finished my wrist extensions.', timestamp: Date.now() - 1800000, type: 'patient' }
    ],
    sosTriggered: false
  },
  {
    id: 'PT-0041',
    code: 'PT-0041',
    name: 'Zaid Al-Qasim',
    age: 34,
    gender: 'M',
    ward: 'ICU-3',
    conditionProfile: 'tachycardia',
    recoveryPercent: 64,
    xp: 4200,
    nextLevelXp: 5000,
    level: 12,
    rankTier: 'GOLD TIER II',
    streakDays: 8,
    vitals: { hr: 98, spo2: 96, gsr: 2.1, imuStatus: 'Elevated Tremor', temp: 37.2, sys: 135, dia: 88 },
    quests: [
      { id: 'q1', title: 'Cardio Rhythm Breathing (10m)', xp: 300, completed: true },
      { id: 'q2', title: 'Upper Extremity Flexion', xp: 200, completed: false }
    ],
    messages: [
      { id: 'm1', sender: 'Dr. Sarah Chen', text: 'Zaid, keep monitoring heart rate after exercises.', timestamp: Date.now() - 7200000, type: 'doc' }
    ],
    sosTriggered: false
  },
  {
    id: 'PT-0082',
    code: 'PT-0082',
    name: 'Rania Mansour',
    age: 52,
    gender: 'F',
    ward: 'Cardiology',
    conditionProfile: 'normal',
    recoveryPercent: 82,
    xp: 6100,
    nextLevelXp: 7000,
    level: 16,
    rankTier: 'CYBER PLATINUM',
    streakDays: 19,
    vitals: { hr: 72, spo2: 99, gsr: 1.1, imuStatus: 'Normal', temp: 36.6, sys: 118, dia: 76 },
    quests: [
      { id: 'q1', title: 'Morning Aerobic Walk', xp: 400, completed: true },
      { id: 'q2', title: 'Vitals Self-Check', xp: 100, completed: true }
    ],
    messages: [],
    sosTriggered: false
  },
  {
    id: 'PT-2026',
    code: 'RAWAN-2026',
    name: 'Rawan Mansour',
    age: 28,
    gender: 'F',
    ward: 'V.I.P. Rehab Suite 1',
    conditionProfile: 'normal',
    recoveryPercent: 95,
    xp: 9900,
    nextLevelXp: 10000,
    level: 25,
    rankTier: 'LEGENDARY TIER I',
    streakDays: 30,
    vitals: { hr: 68, spo2: 100, gsr: 0.9, imuStatus: 'Optimal', temp: 36.5, sys: 115, dia: 75 },
    quests: [
      { id: 'q1', title: 'Neural Core Mastery', xp: 500, completed: true },
      { id: 'q2', title: 'Full Motor Recovery Flex', xp: 500, completed: true }
    ],
    messages: [
      { id: 'm1', sender: 'Dr. Sarah Chen', text: 'Remarkable progress Rawan! You are nearing 100% recovery.', timestamp: Date.now() - 3600000, type: 'doc' }
    ],
    sosTriggered: false
  }
];

// Fallback memory storage if AsyncStorage fails
let memoryPatientCode = null;

export const patientService = {
  // Store logged in patient code
  async savePatientCode(code) {
    const cleanCode = code.trim().toUpperCase();
    memoryPatientCode = cleanCode;
    try {
      await AsyncStorage.setItem(STORAGE_PATIENT_CODE_KEY, cleanCode);
    } catch (e) {
      console.warn('AsyncStorage error:', e);
    }
  },

  // Get stored patient code
  async getStoredPatientCode() {
    try {
      const code = await AsyncStorage.getItem(STORAGE_PATIENT_CODE_KEY);
      if (code) return code;
    } catch (e) {
      console.warn('AsyncStorage error:', e);
    }
    return memoryPatientCode;
  },

  // Clear stored patient code (Logout)
  async clearStoredPatientCode() {
    memoryPatientCode = null;
    try {
      await AsyncStorage.removeItem(STORAGE_PATIENT_CODE_KEY);
    } catch (e) {
      console.warn('AsyncStorage error:', e);
    }
  },

  // Find patient by code (case-insensitive) from Firestore or default catalog
  async loginWithPatientCode(rawCode) {
    if (!rawCode) throw new Error('Please enter a patient code.');
    const searchCode = rawCode.trim().toUpperCase();

    // Normalize code e.g. "0331" -> "PT-0331"
    const normalizedId = searchCode.startsWith('PT-') ? searchCode : `PT-${searchCode.padStart(4, '0')}`;

    try {
      // 1. Direct doc lookup by ID / normalized ID
      let docRef = doc(db, 'patients', searchCode);
      let docSnap = await getDoc(docRef);

      if (!docSnap.exists() && normalizedId !== searchCode) {
        docRef = doc(db, 'patients', normalizedId);
        docSnap = await getDoc(docRef);
      }

      if (docSnap.exists()) {
        const patientData = { id: docSnap.id, ...docSnap.data() };
        await this.savePatientCode(patientData.code || patientData.id);
        return patientData;
      }

      // 2. Query collection for matching code
      const colRef = collection(db, 'patients');
      const querySnap = await getDocs(colRef);
      let foundPatient = null;

      querySnap.forEach(d => {
        const data = d.data();
        if (
          (data.code && data.code.toUpperCase() === searchCode) ||
          (data.id && data.id.toUpperCase() === searchCode) ||
          (data.id && data.id.toUpperCase() === normalizedId) ||
          (data.code && data.code.toUpperCase() === normalizedId)
        ) {
          foundPatient = { id: d.id, ...data };
        }
      });

      if (foundPatient) {
        await this.savePatientCode(foundPatient.code || foundPatient.id);
        return foundPatient;
      }
    } catch (err) {
      console.warn('Firestore lookup failed, checking local defaults:', err);
    }

    // 3. Fallback check in default catalog
    const match = DEFAULT_PATIENTS.find(p => 
      p.code.toUpperCase() === searchCode ||
      p.id.toUpperCase() === searchCode ||
      p.id.toUpperCase() === normalizedId ||
      p.code.toUpperCase() === normalizedId ||
      p.name.toUpperCase().includes(searchCode)
    );

    if (match) {
      // Seed Firestore with this default patient so future updates sync seamlessly
      try {
        await setDoc(doc(db, 'patients', match.id), match, { merge: true });
      } catch (err) {
        console.warn('Failed to seed default patient to Firestore:', err);
      }
      await this.savePatientCode(match.code || match.id);
      return match;
    }

    throw new Error(`Patient Code "${rawCode}" not found. Try PT-0331, PT-0041, or RAWAN-2026.`);
  },

  // Subscribe to real-time updates for a logged-in patient (including ESP32 telemetry)
  subscribeToPatient(patientId, callback) {
    if (!patientId) return () => {};

    let currentData = null;

    const notify = () => {
      if (currentData) callback(currentData);
    };

    // 1. Primary patient doc snapshot
    const docRef = doc(db, 'patients', patientId);
    const unsubDoc = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        currentData = { id: docSnap.id, ...data };
        if (data.lastReading) {
          currentData.vitals = {
            hr: data.lastReading.hr || currentData.vitals?.hr || 0,
            spo2: data.lastReading.spo2 || currentData.vitals?.spo2 || 0,
            gsr: data.lastReading.gsr || currentData.vitals?.gsr || 0,
            emg: data.lastReading.emg || currentData.vitals?.emg || 0,
            imuStatus: data.lastReading.imu ? `${data.lastReading.imu}g` : (currentData.vitals?.imuStatus || 'Stable')
          };
        }
        notify();
      }
    }, (error) => {
      console.warn('Firestore patient subscription notice:', error);
    });

    // 2. Real-time telemetry subcollection snapshot (ESP32 stream)
    let unsubSensor = () => {};
    try {
      const sensorCol = collection(db, 'sensorData', patientId, 'readings');
      unsubSensor = onSnapshot(sensorCol, (snapshot) => {
        snapshot.forEach(d => {
          const reading = d.data();
          if (currentData) {
            currentData.vitals = {
              hr: reading.hr || currentData.vitals?.hr || 0,
              spo2: reading.spo2 || currentData.vitals?.spo2 || 0,
              gsr: reading.gsr || currentData.vitals?.gsr || 0,
              emg: reading.emg || currentData.vitals?.emg || 0,
              imuStatus: reading.imu ? `${reading.imu}g` : 'Active Stream'
            };
            notify();
          }
        });
      }, err => console.warn('Sensor subcollection notice:', err));
    } catch (e) {
      console.warn('Sensor stream setup error:', e);
    }

    return () => {
      unsubDoc();
      unsubSensor();
    };
  },

  // Toggle quest completion and update XP/Level
  async toggleQuest(patientId, questId, isCompleted, currentPatient) {
    if (!patientId || !currentPatient) return;

    const quests = (currentPatient.quests || []).map(q => {
      if (q.id === questId) return { ...q, completed: isCompleted };
      return q;
    });

    const quest = currentPatient.quests?.find(q => q.id === questId);
    let newXp = currentPatient.xp || 0;
    let newLevel = currentPatient.level || 1;
    let nextLevelXp = currentPatient.nextLevelXp || 2000;
    let rankTier = currentPatient.rankTier || 'GOLD TIER I';

    if (quest) {
      if (isCompleted) {
        newXp += quest.xp;
        if (newXp >= nextLevelXp) {
          newLevel++;
          nextLevelXp += 2000;
          rankTier = newLevel >= 18 ? 'CYBER PLATINUM' : 'GOLD TIER III';
        }
      } else {
        newXp = Math.max(0, newXp - quest.xp);
      }
    }

    const updates = { quests, xp: newXp, level: newLevel, nextLevelXp, rankTier };

    try {
      await updateDoc(doc(db, 'patients', patientId), updates);
    } catch (e) {
      console.warn('Firestore update error:', e);
    }
  },

  // Send chat message (Bi-directional real-time sync with Web Dashboard)
  async sendChatMessage(patientId, sender, text, type = 'patient') {
    if (!patientId || !text.trim()) return;

    const newMsg = {
      id: `m_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      sender,
      text: text.trim(),
      timestamp: Date.now(),
      type
    };

    try {
      await updateDoc(doc(db, 'patients', patientId), {
        messages: arrayUnion(newMsg)
      });
    } catch (e) {
      console.warn('Failed to send chat message:', e);
    }
  },

  // Trigger Emergency SOS Panic Alarm
  async triggerSOS(patientId) {
    if (!patientId) return;
    try {
      await updateDoc(doc(db, 'patients', patientId), {
        sosTriggered: true,
        sosTimestamp: Date.now()
      });
    } catch (e) {
      console.warn('Failed to trigger SOS in Firestore:', e);
    }
  }
};
