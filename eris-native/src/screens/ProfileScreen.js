import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { patientService } from '../services/patientService';

export default function ProfileScreen({ patient, onLogout }) {
  const [sosTriggered, setSosTriggered] = useState(patient?.sosTriggered || false);

  const handleSos = () => {
    Alert.alert(
      '🚨 Emergency SOS Dispatch',
      'Are you sure you want to alert the Ward Attending and ICU Emergency Team?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'DISPATCH SOS', 
          style: 'destructive',
          onPress: async () => {
            setSosTriggered(true);
            await patientService.triggerSOS(patient?.id);
            Alert.alert('🚨 SOS SENT', 'Emergency dispatch notification sent to Doctor Dashboard & Ward Station.');
          }
        }
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Patient Profile Card */}
      <View style={styles.card}>
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(patient?.name || 'PT').split(' ').map(n => n[0]).join('').substring(0, 2)}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.patientName}>{patient?.name || 'Khalid Othman'}</Text>
            <Text style={styles.patientId}>Patient Access Code: {patient?.code || patient?.id || 'PT-0331'}</Text>
          </View>
        </View>

        <View style={styles.detailsGrid}>
          <View style={styles.detailBox}>
            <Text style={styles.detailLabel}>Age / Gender</Text>
            <Text style={styles.detailVal}>{patient?.age || 38} Yrs • {patient?.gender || 'M'}</Text>
          </View>

          <View style={styles.detailBox}>
            <Text style={styles.detailLabel}>Ward / Unit</Text>
            <Text style={styles.detailVal}>{patient?.ward || 'ICU-2'}</Text>
          </View>

          <View style={styles.detailBox}>
            <Text style={styles.detailLabel}>Condition Profile</Text>
            <Text style={styles.detailVal}>{(patient?.conditionProfile || 'normal').toUpperCase()}</Text>
          </View>

          <View style={styles.detailBox}>
            <Text style={styles.detailLabel}>Cloud Status</Text>
            <Text style={[styles.detailVal, { color: theme.colors.accent }]}>Live Synced</Text>
          </View>
        </View>
      </View>

      {/* Emergency SOS Alarm Trigger Card */}
      <View style={[styles.card, sosTriggered && styles.sosActiveCard]}>
        <Text style={styles.cardTitle}>Emergency Distress Alarm</Text>
        <Text style={styles.cardSub}>
          Pressing the Emergency SOS instantly alerts Ward Attending Doctors & ICU Line on the Web Dashboard.
        </Text>

        <TouchableOpacity 
          style={[styles.sosBtn, sosTriggered && styles.sosBtnTriggered]} 
          onPress={handleSos}
          activeOpacity={0.8}
        >
          <Ionicons name="warning" size={20} color="#FFFFFF" />
          <Text style={styles.sosBtnText}>
            {sosTriggered ? '🚨 EMERGENCY SOS ACTIVE' : 'DISPATCH EMERGENCY SOS'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Contacts List */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Emergency & Care Team Contacts</Text>

        <View style={styles.contactItem}>
          <Ionicons name="call" size={18} color={theme.colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.contactName}>Dr. Sarah Chen (Attending)</Text>
            <Text style={styles.contactSub}>Ext: 4402 • Ward 4</Text>
          </View>
        </View>

        <View style={styles.contactItem}>
          <Ionicons name="medkit" size={18} color={theme.colors.accent} />
          <View style={{ flex: 1 }}>
            <Text style={styles.contactName}>ICU Central Nursing Desk</Text>
            <Text style={styles.contactSub}>Ext: 9110 • Emergency Line</Text>
          </View>
        </View>
      </View>

      {/* Logout / Switch Patient Code Button */}
      <TouchableOpacity style={styles.logoutBtn} onPress={onLogout} activeOpacity={0.8}>
        <Ionicons name="log-out-outline" size={18} color="#EF4444" />
        <Text style={styles.logoutText}>Switch Patient Code / Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  card: {
    backgroundColor: theme.colors.cardBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    padding: 16,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.cardBorder,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: theme.colors.primaryLight,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: theme.colors.primary,
    fontSize: 18,
    fontWeight: '800',
  },
  patientName: {
    color: theme.colors.textMain,
    fontSize: 18,
    fontWeight: '800',
  },
  patientId: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  detailBox: {
    width: '47%',
    backgroundColor: theme.colors.bg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    padding: 10,
  },
  detailLabel: {
    color: theme.colors.textDim,
    fontSize: 11,
  },
  detailVal: {
    color: theme.colors.textMain,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  sosActiveCard: {
    borderColor: 'rgba(239, 68, 68, 0.5)',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  cardTitle: {
    color: theme.colors.textMain,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardSub: {
    color: theme.colors.textDim,
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 14,
  },
  sosBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  sosBtnTriggered: {
    backgroundColor: '#DC2626',
  },
  sosBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.bg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    padding: 12,
    marginTop: 8,
    gap: 12,
  },
  contactName: {
    color: theme.colors.textMain,
    fontSize: 13,
    fontWeight: '600',
  },
  contactSub: {
    color: theme.colors.textDim,
    fontSize: 11,
    marginTop: 1,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 8,
    gap: 8,
  },
  logoutText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '700',
  },
});
