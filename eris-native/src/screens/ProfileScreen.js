import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';

export default function ProfileScreen() {
  const [sosActive, setSosActive] = useState(false);

  const triggerSOS = () => {
    setSosActive(true);
    setTimeout(() => {
      Alert.alert(
        "🚨 Emergency SOS Dispatched",
        "Clinical alert sent to Ward Attending & ICU Response Team. Stay calm, assistance is on the way.",
        [{ text: "OK", onPress: () => setSosActive(false) }]
      );
    }, 1000);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Patient Profile Card */}
      <View style={styles.profileCard}>
        <View style={styles.avatarLarge}>
          <Text style={styles.avatarTextLarge}>AV</Text>
        </View>
        <Text style={styles.name}>Alexander Vance</Text>
        <Text style={styles.patientId}>Patient ID: #849-AF-2026</Text>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Age / Gender</Text>
            <Text style={styles.metaValue}>34 • Male</Text>
          </View>
          <View style={styles.metaDivider} />
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Primary Rehab</Text>
            <Text style={styles.metaValue}>Right Wrist ROM</Text>
          </View>
        </View>
      </View>

      {/* Prominent Emergency SOS Button */}
      <TouchableOpacity 
        style={[styles.sosButton, sosActive && styles.sosButtonActive]} 
        onPress={triggerSOS}
        activeOpacity={0.8}
      >
        <Ionicons name="warning" size={24} color="#FFF" />
        <Text style={styles.sosText}>
          {sosActive ? 'DISPATCHING EMERGENCY ALERT...' : 'TRIGGER EMERGENCY SOS'}
        </Text>
      </TouchableOpacity>

      {/* Emergency Contacts */}
      <Text style={styles.sectionTitle}>Emergency Contacts</Text>

      <View style={styles.card}>
        <View style={styles.contactItem}>
          <View style={styles.contactIconBg}>
            <Ionicons name="medkit-outline" size={20} color={theme.colors.danger} />
          </View>
          <View style={styles.contactInfo}>
            <Text style={styles.contactName}>Ward 4 Attending Station</Text>
            <Text style={styles.contactPhone}>Ext. #4091 • Direct ICU Line</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.contactItem}>
          <View style={styles.contactIconBg}>
            <Ionicons name="call-outline" size={20} color={theme.colors.accent} />
          </View>
          <View style={styles.contactInfo}>
            <Text style={styles.contactName}>Primary Kin (Elena Vance)</Text>
            <Text style={styles.contactPhone}>+1 (555) 019-2834</Text>
          </View>
        </View>
      </View>

      {/* Device Connection Status */}
      <Text style={styles.sectionTitle}>Connected Hardware</Text>
      <View style={styles.card}>
        <View style={styles.deviceRow}>
          <Ionicons name="hardware-chip-outline" size={20} color={theme.colors.accent} />
          <Text style={styles.deviceName}>Eris CyberGlove Sensor Array</Text>
          <Text style={styles.deviceBattery}>94% Battery</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  content: {
    padding: theme.spacing.md,
    paddingTop: theme.spacing.lg,
  },
  profileCard: {
    backgroundColor: theme.colors.cardBg,
    borderRadius: theme.borderRadius.md,
    borderColor: theme.colors.cardBorder,
    borderWidth: 1,
    padding: theme.spacing.lg,
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  avatarLarge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.primaryLight,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  avatarTextLarge: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textMain,
  },
  patientId: {
    fontSize: 13,
    color: theme.colors.textDim,
    marginTop: 2,
    marginBottom: theme.spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#090A0F',
    borderRadius: theme.borderRadius.sm,
    paddingVertical: 10,
    paddingHorizontal: 16,
    width: '100%',
  },
  metaItem: {
    flex: 1,
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 11,
    color: theme.colors.textDim,
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textMain,
    marginTop: 2,
  },
  metaDivider: {
    width: 1,
    height: 24,
    backgroundColor: theme.colors.cardBorder,
  },
  sosButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.danger,
    borderRadius: theme.borderRadius.md,
    paddingVertical: 14,
    marginBottom: theme.spacing.lg,
  },
  sosButtonActive: {
    backgroundColor: '#B91C1C',
  },
  sosText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 0.5,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: theme.colors.textMain,
    marginBottom: theme.spacing.sm,
  },
  card: {
    backgroundColor: theme.colors.cardBg,
    borderRadius: theme.borderRadius.md,
    borderColor: theme.colors.cardBorder,
    borderWidth: 1,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textMain,
  },
  contactPhone: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.cardBorder,
    marginVertical: theme.spacing.sm,
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deviceName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textMain,
  },
  deviceBattery: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.accent,
  },
});
