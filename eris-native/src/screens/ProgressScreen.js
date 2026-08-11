import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { patientService } from '../services/patientService';

export default function ProgressScreen({ patient }) {
  const currentPatient = patient || {
    xp: 4850,
    nextLevelXp: 6000,
    level: 14,
    rankTier: 'GOLD TIER III',
    recoveryPercent: 68,
    quests: [
      { id: 'q1', title: 'Wrist Extension 3x10', xp: 250, completed: true },
      { id: 'q2', title: 'SpO2 Deep Breathing (5m)', xp: 150, completed: false }
    ]
  };

  const handleQuestToggle = (questId, completed) => {
    patientService.toggleQuest(currentPatient.id, questId, !completed, currentPatient);
  };

  const xpProgress = Math.min(100, Math.round(((currentPatient.xp || 0) / (currentPatient.nextLevelXp || 6000)) * 100));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Tier & XP Summary */}
      <View style={styles.card}>
        <View style={styles.tierHeader}>
          <Ionicons name="trophy" size={24} color="#F59E0B" />
          <View style={{ flex: 1 }}>
            <Text style={styles.tierTitle}>{currentPatient.rankTier || 'GOLD TIER III'}</Text>
            <Text style={styles.levelSub}>Level {currentPatient.level || 14} • Clinical Warrior</Text>
          </View>
        </View>

        <View style={styles.xpMeta}>
          <Text style={styles.xpText}>{(currentPatient.xp || 0).toLocaleString()} / {(currentPatient.nextLevelXp || 6000).toLocaleString()} XP</Text>
          <Text style={styles.xpPct}>{xpProgress}%</Text>
        </View>

        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${xpProgress}%` }]} />
        </View>
      </View>

      {/* Recovery Milestone Progress */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Motor Function Recovery Milestone</Text>
        <Text style={styles.cardSub}>Synced live from doctor evaluations</Text>

        <View style={styles.milestoneRow}>
          <View style={styles.milestoneBox}>
            <Text style={styles.milestoneVal}>{currentPatient.recoveryPercent || 68}%</Text>
            <Text style={styles.milestoneLabel}>Current</Text>
          </View>
          
          <Ionicons name="arrow-forward" size={20} color={theme.colors.textDim} />

          <View style={[styles.milestoneBox, styles.milestoneBoxTarget]}>
            <Text style={[styles.milestoneVal, { color: theme.colors.accent }]}>85%</Text>
            <Text style={styles.milestoneLabel}>Target Milestone</Text>
          </View>
        </View>
      </View>

      {/* Rehabilitation Quests List */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Daily Rehabilitation Checklist</Text>
        <Text style={styles.cardSub}>Complete tasks to gain XP and advance tiers</Text>

        {(currentPatient.quests || []).map(q => (
          <TouchableOpacity 
            key={q.id} 
            style={[styles.questItem, q.completed && styles.questItemDone]}
            onPress={() => handleQuestToggle(q.id, q.completed)}
            activeOpacity={0.7}
          >
            <Ionicons 
              name={q.completed ? "checkmark-circle" : "ellipse-outline"} 
              size={22} 
              color={q.completed ? theme.colors.accent : theme.colors.textDim} 
            />
            <Text style={[styles.questText, q.completed && styles.questTextDone]}>
              {q.title}
            </Text>
            <Text style={styles.xpTextTag}>+{q.xp} XP</Text>
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
  card: {
    backgroundColor: theme.colors.cardBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    padding: 16,
  },
  tierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  tierTitle: {
    color: theme.colors.textMain,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1,
  },
  levelSub: {
    color: theme.colors.textDim,
    fontSize: 12,
    marginTop: 2,
  },
  xpMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  xpText: {
    color: theme.colors.textMain,
    fontSize: 12,
    fontWeight: '600',
  },
  xpPct: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: theme.colors.bg,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 4,
  },
  cardTitle: {
    color: theme.colors.textMain,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  cardSub: {
    color: theme.colors.textDim,
    fontSize: 12,
    marginBottom: 16,
  },
  milestoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  milestoneBox: {
    backgroundColor: theme.colors.bg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  milestoneBoxTarget: {
    borderColor: 'rgba(16, 185, 129, 0.3)',
    backgroundColor: 'rgba(16, 185, 129, 0.06)',
  },
  milestoneVal: {
    color: theme.colors.textMain,
    fontSize: 22,
    fontWeight: '800',
  },
  milestoneLabel: {
    color: theme.colors.textDim,
    fontSize: 11,
    marginTop: 2,
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
  questItemDone: {
    opacity: 0.6,
  },
  questText: {
    flex: 1,
    color: theme.colors.textMain,
    fontSize: 13,
    fontWeight: '500',
  },
  questTextDone: {
    textDecorationLine: 'line-through',
  },
  xpTextTag: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
});
