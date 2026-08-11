import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  ActivityIndicator, 
  KeyboardAvoidingView, 
  Platform,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { patientService } from '../services/patientService';

export default function LoginScreen({ onLoginSuccess }) {
  const [patientCode, setPatientCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (codeToUse) => {
    const code = codeToUse || patientCode;
    if (!code.trim()) {
      setErrorMsg('Please enter your unique Patient Access Code.');
      return;
    }

    setErrorMsg('');
    setLoading(true);

    try {
      const patient = await patientService.loginWithPatientCode(code);
      setLoading(false);
      if (onLoginSuccess) {
        onLoginSuccess(patient);
      }
    } catch (err) {
      setLoading(false);
      setErrorMsg(err.message || 'Failed to authenticate patient code.');
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        
        {/* Logo & Header Header */}
        <View style={styles.headerContainer}>
          <View style={styles.logoBadge}>
            <Ionicons name="pulse" size={36} color={theme.colors.primary} />
          </View>
          <Text style={styles.appTitle}>ERIS ✦ NATIVE</Text>
          <Text style={styles.appSubtitle}>Clinical Rehabilitation & Health Co-Pilot</Text>
        </View>

        {/* Login Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Patient Access Login</Text>
          <Text style={styles.cardSub}>Enter your patient code to sync your live telemetry, recovery quests, and doctor channel.</Text>

          {errorMsg ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color="#EF4444" />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : null}

          <View style={styles.inputContainer}>
            <Ionicons name="key-outline" size={20} color={theme.colors.textDim} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="e.g. PT-0331 or RAWAN-2026"
              placeholderTextColor={theme.colors.textDim}
              value={patientCode}
              onChangeText={(text) => {
                setPatientCode(text);
                if (errorMsg) setErrorMsg('');
              }}
              autoCapitalize="characters"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={() => handleLogin()}
            />
          </View>

          <TouchableOpacity 
            style={[styles.loginBtn, loading && styles.loginBtnDisabled]} 
            onPress={() => handleLogin()}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.loginBtnText}>Connect Patient Session</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
              </>
            )}
          </TouchableOpacity>

          {/* Quick Demo Access Codes */}
          <View style={styles.demoSection}>
            <Text style={styles.demoTitle}>QUICK DEMO PATIENT CODES</Text>
            <View style={styles.demoPillsRow}>
              <TouchableOpacity style={styles.demoPill} onPress={() => { setPatientCode('PT-0331'); handleLogin('PT-0331'); }}>
                <Text style={styles.demoPillCode}>PT-0331</Text>
                <Text style={styles.demoPillName}>Khalid O.</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.demoPill} onPress={() => { setPatientCode('PT-0041'); handleLogin('PT-0041'); }}>
                <Text style={styles.demoPillCode}>PT-0041</Text>
                <Text style={styles.demoPillName}>Zaid A.</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.demoPill} onPress={() => { setPatientCode('RAWAN-2026'); handleLogin('RAWAN-2026'); }}>
                <Text style={styles.demoPillCode}>RAWAN-2026</Text>
                <Text style={styles.demoPillName}>Rawan M.</Text>
              </TouchableOpacity>
            </View>
          </View>

        </View>

        {/* Security Footer Note */}
        <View style={styles.footer}>
          <Ionicons name="shield-checkmark-outline" size={14} color={theme.colors.accent} />
          <Text style={styles.footerText}>Real-Time Firestore Synchronized • HIPAA Compliant</Text>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: theme.colors.primaryLight,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  appTitle: {
    color: theme.colors.textMain,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 2,
  },
  appSubtitle: {
    color: theme.colors.textDim,
    fontSize: 13,
    marginTop: 6,
    textAlign: 'center',
  },
  card: {
    backgroundColor: theme.colors.cardBg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    padding: 24,
  },
  cardTitle: {
    color: theme.colors.textMain,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  cardSub: {
    color: theme.colors.textDim,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 20,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.bg,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 52,
    marginBottom: 16,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: theme.colors.textMain,
    fontSize: 15,
    fontWeight: '600',
  },
  loginBtn: {
    flexDirection: 'row',
    backgroundColor: theme.colors.primary,
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginBtnDisabled: {
    opacity: 0.6,
  },
  loginBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  demoSection: {
    marginTop: 24,
    borderTopWidth: 1,
    borderTopColor: theme.colors.cardBorder,
    paddingTop: 16,
  },
  demoTitle: {
    color: theme.colors.textDim,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 12,
  },
  demoPillsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  demoPill: {
    flex: 1,
    backgroundColor: theme.colors.bg,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  demoPillCode: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  demoPillName: {
    color: theme.colors.textDim,
    fontSize: 11,
    marginTop: 2,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    gap: 6,
  },
  footerText: {
    color: theme.colors.textDim,
    fontSize: 11,
  },
});
