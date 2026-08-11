import React from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';

export default function VitalsScreen({ patient }) {
  const vitals = patient?.vitals || {
    hr: 78,
    spo2: 98,
    gsr: 1.4,
    imuStatus: 'Stable',
    temp: 36.8,
    sys: 120,
    dia: 80
  };

  const vitalCards = [
    { title: 'Heart Rate (ECG)', value: `${vitals.hr || 78}`, unit: 'BPM', icon: 'heart', color: '#EF4444', status: (vitals.hr > 100 ? 'Elevated' : 'Normal') },
    { title: 'Blood Oxygen (SpO2)', value: `${vitals.spo2 || 98}`, unit: '%', icon: 'water', color: '#06B6D4', status: (vitals.spo2 < 95 ? 'Low' : 'Optimal') },
    { title: 'Blood Pressure', value: `${vitals.sys || 120}/${vitals.dia || 80}`, unit: 'mmHg', icon: 'pulse', color: '#8B5CF6', status: 'Normal' },
    { title: 'GSR Stress Level', value: `${vitals.gsr || 1.4}`, unit: 'μS', icon: 'flash', color: '#F59E0B', status: 'Low Stress' },
    { title: 'IMU Motion State', value: `${vitals.imuStatus || 'Stable'}`, unit: '', icon: 'body', color: '#10B981', status: 'Tracking' },
    { title: 'Body Temp', value: `${vitals.temp || 36.8}`, unit: '°C', icon: 'thermometer', color: '#EC4899', status: 'Normal' },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerBox}>
        <View style={styles.liveIndicator}>
          <View style={styles.pulseDot} />
          <Text style={styles.liveText}>REAL-TIME FIRESTORE STREAM ACTIVE</Text>
        </View>
        <Text style={styles.headerSub}>Live Telemetry for {patient?.name || 'Patient'}</Text>
      </View>

      <View style={styles.grid}>
        {vitalCards.map((v, idx) => (
          <View key={idx} style={styles.vitalCard}>
            <View style={styles.vitalHeader}>
              <Ionicons name={v.icon} size={18} color={v.color} />
              <Text style={styles.vitalTitle} numberOfLines={1}>{v.title}</Text>
            </View>

            <Text style={styles.vitalVal}>
              {v.value} {v.unit ? <Text style={styles.vitalUnit}>{v.unit}</Text> : null}
            </Text>

            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>{v.status}</Text>
            </View>
          </View>
        ))}
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
    padding: 16,
    gap: 16,
  },
  headerBox: {
    backgroundColor: theme.colors.cardBg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    padding: 14,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.accent,
  },
  liveText: {
    color: theme.colors.accent,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  headerSub: {
    color: theme.colors.textMain,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  vitalCard: {
    width: '48%',
    backgroundColor: theme.colors.cardBg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    padding: 14,
  },
  vitalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  vitalTitle: {
    color: theme.colors.textDim,
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  vitalVal: {
    color: theme.colors.textMain,
    fontSize: 20,
    fontWeight: '800',
  },
  vitalUnit: {
    fontSize: 12,
    color: theme.colors.textDim,
    fontWeight: '400',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.bg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 8,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  statusText: {
    color: theme.colors.textDim,
    fontSize: 10,
    fontWeight: '600',
  },
});
