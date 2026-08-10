import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';

export default function VitalsScreen() {
  const vitals = [
    { id: 'hr', name: 'Heart Rate', value: '72', unit: 'BPM', status: 'Normal', icon: 'heart', color: '#EF4444', trend: 'Stable' },
    { id: 'spo2', name: 'Oxygen Saturation', value: '98', unit: '%', status: 'Optimal', icon: 'pulse', color: theme.colors.accent, trend: '+0.5%' },
    { id: 'emg', name: 'EMG Muscle Tone', value: '84', unit: 'µV', status: 'Active', icon: 'fitness', color: theme.colors.primary, trend: 'High' },
    { id: 'gsr', name: 'GSR Stress Level', value: '1.2', unit: 'kΩ', status: 'Low Stress', icon: 'leaf', color: '#F59E0B', trend: '-0.3' },
    { id: 'imu', name: 'IMU Motion Accel', value: '1.05', unit: 'g', status: 'Normal', icon: 'navigate', color: '#3B82F6', trend: 'Steady' },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Overall Health Status Banner */}
      <View style={styles.statusBanner}>
        <View style={styles.statusDot} />
        <View style={styles.statusTextContainer}>
          <Text style={styles.statusTitle}>All Vitals Nominal</Text>
          <Text style={styles.statusSubtitle}>Real-time telemetry stream active</Text>
        </View>
        <Ionicons name="wifi-outline" size={20} color={theme.colors.accent} />
      </View>

      <Text style={styles.sectionTitle}>Sensor Telemetry Grid</Text>

      {/* Sensor Grid */}
      {vitals.map(item => (
        <View key={item.id} style={styles.vitalCard}>
          <View style={styles.cardLeft}>
            <View style={[styles.iconBg, { backgroundColor: `${item.color}15` }]}>
              <Ionicons name={item.icon} size={22} color={item.color} />
            </View>
            <View>
              <Text style={styles.vitalName}>{item.name}</Text>
              <Text style={styles.vitalTrend}>Trend: {item.trend}</Text>
            </View>
          </View>

          <View style={styles.cardRight}>
            <View style={styles.valueRow}>
              <Text style={styles.vitalValue}>{item.value}</Text>
              <Text style={styles.vitalUnit}>{item.unit}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: `${item.color}20` }]}>
              <Text style={[styles.statusBadgeText, { color: item.color }]}>{item.status}</Text>
            </View>
          </View>
        </View>
      ))}

      {/* Clinical Notes Card */}
      <View style={styles.notesCard}>
        <View style={styles.notesHeader}>
          <Ionicons name="document-text-outline" size={18} color={theme.colors.textMuted} />
          <Text style={styles.notesTitle}>CLINICAL TELEMETRY NOTE</Text>
        </View>
        <Text style={styles.notesText}>
          SpO2 level and heart rate stability show excellent autonomic nervous system regulation during morning wrist exercises.
        </Text>
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
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.accentLight,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderWidth: 1,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.accent,
    marginRight: theme.spacing.sm,
  },
  statusTextContainer: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.accent,
  },
  statusSubtitle: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: theme.colors.textMain,
    marginBottom: theme.spacing.sm,
  },
  vitalCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.cardBg,
    borderRadius: theme.borderRadius.md,
    borderColor: theme.colors.cardBorder,
    borderWidth: 1,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  vitalName: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textMain,
  },
  vitalTrend: {
    fontSize: 12,
    color: theme.colors.textDim,
    marginTop: 2,
  },
  cardRight: {
    alignItems: 'flex-end',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  vitalValue: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.textMain,
  },
  vitalUnit: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 4,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  notesCard: {
    backgroundColor: theme.colors.cardBg,
    borderRadius: theme.borderRadius.md,
    borderColor: theme.colors.cardBorder,
    borderWidth: 1,
    padding: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  notesTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textMuted,
    letterSpacing: 1,
  },
  notesText: {
    fontSize: 13,
    color: theme.colors.textMuted,
    lineHeight: 19,
  },
});
