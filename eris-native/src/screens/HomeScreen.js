import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { patientService } from '../services/patientService';

export default function HomeScreen({ navigation, patient }) {
  const currentPatient = patient || {
    name: 'Khalid Othman',
    ward: 'ICU-2',
    recoveryPercent: 68,
    streakDays: 12,
    vitals: { hr: 78, spo2: 98 },
    quests: [
      { id: 'q1', title: 'Wrist Extension 3x10', xp: 250, completed: true },
      { id: 'q2', title: 'SpO2 Deep Breathing (5m)', xp: 150, completed: false }
    ]
  };

  const handleQuestToggle = (questId, completed) => {
    patientService.toggleQuest(currentPatient.id, questId, !completed, currentPatient);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header Banner */}
      <View style={styles.headerCard}>
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(currentPatient.name || 'PT').split(' ').map(n => n[0]).join('').substring(0, 2)}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>Hello, {currentPatient.name}</Text>
            <Text style={styles.subgreeting}>Rehab Phase II • {currentPatient.ward}</Text>
          </View>
        </View>
      </View>

      {/* Daily Quote */}
      <View style={styles.quoteCard}>
        <View style={styles.quoteHeader}>
          <View style={styles.pillTag}>
            <Ionicons name="sparkles" size={12} color={theme.colors.primary} />
            <Text style={styles.pillTagText}>DAILY INSPIRATION</Text>
          </View>
        </View>
        <Text style={styles.quoteText}>
          "Small daily improvements over time lead to stunning rehabilitation results."
        </Text>
        <Text style={styles.quoteAuthor}>— Dr. Sarah Chen</Text>
      </View>

      {/* Recovery Ring & Stats */}
      <View style={styles.card}>
        <Text style={styles.cardHeaderTitle}>Rehabilitation Target</Text>
        
        <View style={styles.progressRow}>
          <View style={styles.ringBadge}>
            <Text style={styles.ringNumber}>{currentPatient.recoveryPercent || 68}%</Text>
            <Text style={styles.ringLabel}>RECOVERY</Text>
          </View>
          <View style={styles.progressMeta}>
            <Text style={styles.metaTitle}>Target: 85% Motor Function</Text>
            <Text style={styles.metaSub}>Server Synced • Phase II Active</Text>

            <View style={styles.streakBadge}>
              <Ionicons name="flame" size={14} color="#F59E0B" />
              <Text style={styles.streakText}>{currentPatient.streakDays || 12} Day Streak Active!</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Quick Telemetry Bar */}
      <View style={styles.telemetryGrid}>
        <TouchableOpacity style={styles.telemetryCard} onPress={() => navigation.navigate('Vitals')}>
          <View style={styles.telemetryHeader}>
            <Ionicons name="heart" size={16} color="#EF4444" />
            <Text style={styles.telemetryLabel}>Heart Rate</Text>
          </View>
          <Text style={styles.telemetryValue}>
            {currentPatient.vitals?.hr || 78} <Text style={styles.telemetryUnit}>BPM</Text>
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.telemetryCard} onPress={() => navigation.navigate('Vitals')}>
          <View style={styles.telemetryHeader}>
            <Ionicons name="water" size={16} color="#06B6D4" />
            <Text style={styles.telemetryLabel}>SpO2</Text>
          </View>
          <Text style={styles.telemetryValue}>
            {currentPatient.vitals?.spo2 || 98} <Text style={styles.telemetryUnit}>%</Text>
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.telemetryCard} onPress={() => navigation.navigate('Vitals')}>
          <View style={styles.telemetryHeader}>
            <Ionicons name="fitness" size={16} color="#8B5CF6" />
            <Text style={styles.telemetryLabel}>EMG Tone</Text>
          </View>
          <Text style={styles.telemetryValue}>
            {currentPatient.vitals?.emg || 3.4} <Text style={styles.telemetryUnit}>μV</Text>
          </Text>
        </TouchableOpacity>
      </View>

      {/* Daily Quests Checklist */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardHeaderTitle}>Today's Rehabilitation Quests</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Progress')}>
            <Text style={styles.linkText}>View All</Text>
          </TouchableOpacity>
        </View>

        {(currentPatient.quests || []).map(q => (
          <TouchableOpacity 
            key={q.id} 
            style={[styles.questItem, q.completed && styles.questItemCompleted]}
            onPress={() => handleQuestToggle(q.id, q.completed)}
            activeOpacity={0.7}
          >
            <Ionicons 
              name={q.completed ? "checkbox" : "square-outline"} 
              size={20} 
              color={q.completed ? theme.colors.accent : theme.colors.textDim} 
            />
            <Text style={[styles.questTitle, q.completed && styles.questTitleDone]}>
              {q.title}
            </Text>
            <View style={styles.xpPill}>
              <Text style={styles.xpPillText}>+{q.xp} XP</Text>
            </View>
          </TouchableOpacity>
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
  headerCard: {
    backgroundColor: theme.colors.cardBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    padding: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primaryLight,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: theme.colors.primary,
    fontWeight: '700',
    fontSize: 16,
  },
  greeting: {
    color: theme.colors.textMain,
    fontSize: 18,
    fontWeight: '700',
  },
  subgreeting: {
    color: theme.colors.textDim,
    fontSize: 12,
    marginTop: 2,
  },
  quoteCard: {
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.25)',
    padding: 16,
  },
  quoteHeader: {
    marginBottom: 8,
  },
  pillTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pillTagText: {
    color: theme.colors.primary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  quoteText: {
    color: theme.colors.textMain,
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  quoteAuthor: {
    color: theme.colors.textDim,
    fontSize: 11,
    marginTop: 6,
    fontWeight: '600',
  },
  card: {
    backgroundColor: theme.colors.cardBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardHeaderTitle: {
    color: theme.colors.textMain,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  linkText: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  ringBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringNumber: {
    color: theme.colors.textMain,
    fontSize: 20,
    fontWeight: '800',
  },
  ringLabel: {
    color: theme.colors.primary,
    fontSize: 9,
    fontWeight: '700',
  },
  progressMeta: {
    flex: 1,
  },
  metaTitle: {
    color: theme.colors.textMain,
    fontSize: 14,
    fontWeight: '600',
  },
  metaSub: {
    color: theme.colors.textDim,
    fontSize: 12,
    marginTop: 2,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  streakText: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '700',
  },
  telemetryGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  telemetryCard: {
    flex: 1,
    backgroundColor: theme.colors.cardBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    padding: 14,
  },
  telemetryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  telemetryLabel: {
    color: theme.colors.textDim,
    fontSize: 12,
  },
  telemetryValue: {
    color: theme.colors.textMain,
    fontSize: 22,
    fontWeight: '800',
  },
  telemetryUnit: {
    fontSize: 12,
    color: theme.colors.textDim,
    fontWeight: '400',
  },
  questItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.bg,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    marginBottom: 8,
    gap: 10,
  },
  questItemCompleted: {
    opacity: 0.6,
  },
  questTitle: {
    flex: 1,
    color: theme.colors.textMain,
    fontSize: 13,
    fontWeight: '500',
  },
  questTitleDone: {
    textDecorationLine: 'line-through',
  },
  xpPill: {
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  xpPillText: {
    color: theme.colors.primary,
    fontSize: 11,
    fontWeight: '700',
  },
});
