import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';

export default function ProgressScreen() {
  const [quests, setQuests] = useState([
    { id: 1, title: 'Wrist Flexion & Extension', xp: '+150 XP', reps: '15 reps × 3 sets', done: true },
    { id: 2, title: 'Deep Breathing SpO2 Calibration', xp: '+100 XP', reps: '5 mins breathing', done: true },
    { id: 3, title: 'GSR Stress Relaxation', xp: '+120 XP', reps: '10 mins zen session', done: false },
    { id: 4, title: 'IMU Gait & Arm Motion Test', xp: '+200 XP', reps: '500 active steps', done: false },
  ]);

  const toggleQuest = (id) => {
    setQuests(quests.map(q => q.id === id ? { ...q, done: !q.done } : q));
  };

  const completedCount = quests.filter(q => q.done).length;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Overall Progress Banner */}
      <View style={styles.progressCard}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressTitle}>REHABILITATION PROGRESS</Text>
          <Text style={styles.progressPercent}>78.5%</Text>
        </View>

        {/* Custom Clean Bar */}
        <View style={styles.trackBackground}>
          <View style={[styles.trackFill, { width: '78.5%' }]} />
        </View>

        <Text style={styles.progressMeta}>
          Phase 2 Recovery • Estimated completion: 14 days
        </Text>
      </View>

      {/* Rank & Level Card */}
      <View style={styles.rankCard}>
        <View style={styles.rankBadgeBg}>
          <Ionicons name="ribbon" size={28} color="#F59E0B" />
        </View>
        <View style={styles.rankInfo}>
          <Text style={styles.rankTier}>Gold Tier III</Text>
          <Text style={styles.rankLevel}>Level 14 Rehabilitation Warrior</Text>
          
          <View style={styles.xpBarContainer}>
            <View style={styles.xpBarBackground}>
              <View style={[styles.xpBarFill, { width: '80%' }]} />
            </View>
            <Text style={styles.xpText}>4,850 / 6,000 XP</Text>
          </View>
        </View>
      </View>

      {/* Quests Checklist Header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Daily Rehab Quests</Text>
        <Text style={styles.sectionSubtitle}>{completedCount} of {quests.length} Completed</Text>
      </View>

      {/* Quests List */}
      {quests.map(quest => (
        <TouchableOpacity 
          key={quest.id}
          style={[styles.questCard, quest.done && styles.questCardDone]}
          onPress={() => toggleQuest(quest.id)}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, quest.done && styles.checkboxDone]}>
            {quest.done && <Ionicons name="checkmark" size={16} color="#FFF" />}
          </View>

          <View style={styles.questContent}>
            <Text style={[styles.questTitle, quest.done && styles.questTitleDone]}>
              {quest.title}
            </Text>
            <Text style={styles.questSubtitle}>{quest.reps}</Text>
          </View>

          <Text style={[styles.xpBadge, quest.done && styles.xpBadgeDone]}>
            {quest.xp}
          </Text>
        </TouchableOpacity>
      ))}

      {/* Trophy / Badges Showcase */}
      <Text style={[styles.sectionTitle, { marginTop: theme.spacing.lg }]}>Earned Badges</Text>
      <View style={styles.badgesGrid}>
        <View style={styles.badgeItem}>
          <View style={styles.badgeIconBg}>
            <Ionicons name="hand-left" size={22} color={theme.colors.primary} />
          </View>
          <Text style={styles.badgeName}>Iron Wrist</Text>
        </View>

        <View style={styles.badgeItem}>
          <View style={styles.badgeIconBg}>
            <Ionicons name="fitness" size={22} color={theme.colors.accent} />
          </View>
          <Text style={styles.badgeName}>Oxygen Pioneer</Text>
        </View>

        <View style={styles.badgeItem}>
          <View style={styles.badgeIconBg}>
            <Ionicons name="leaf" size={22} color="#F59E0B" />
          </View>
          <Text style={styles.badgeName}>Zen Master</Text>
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
  progressCard: {
    backgroundColor: theme.colors.cardBg,
    borderRadius: theme.borderRadius.md,
    borderColor: theme.colors.cardBorder,
    borderWidth: 1,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  progressTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textMuted,
    letterSpacing: 1,
  },
  progressPercent: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.accent,
  },
  trackBackground: {
    height: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: theme.spacing.sm,
  },
  trackFill: {
    height: '100%',
    backgroundColor: theme.colors.accent,
    borderRadius: 5,
  },
  progressMeta: {
    fontSize: 12,
    color: theme.colors.textDim,
  },
  rankCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.cardBg,
    borderRadius: theme.borderRadius.md,
    borderColor: theme.colors.cardBorder,
    borderWidth: 1,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  rankBadgeBg: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  rankInfo: {
    flex: 1,
  },
  rankTier: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textMain,
  },
  rankLevel: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
    marginBottom: 6,
  },
  xpBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  xpBarBackground: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 3,
  },
  xpText: {
    fontSize: 11,
    color: theme.colors.textDim,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: theme.colors.textMain,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: theme.colors.textDim,
  },
  questCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.cardBg,
    borderRadius: theme.borderRadius.md,
    borderColor: theme.colors.cardBorder,
    borderWidth: 1,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  questCardDone: {
    opacity: 0.65,
    backgroundColor: '#0E1018',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: theme.colors.textDim,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  checkboxDone: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  questContent: {
    flex: 1,
  },
  questTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textMain,
  },
  questTitleDone: {
    textDecorationLine: 'line-through',
    color: theme.colors.textMuted,
  },
  questSubtitle: {
    fontSize: 12,
    color: theme.colors.textDim,
    marginTop: 2,
  },
  xpBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  xpBadgeDone: {
    color: theme.colors.accent,
    backgroundColor: theme.colors.accentLight,
  },
  badgesGrid: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  badgeItem: {
    flex: 1,
    backgroundColor: theme.colors.cardBg,
    borderRadius: theme.borderRadius.md,
    borderColor: theme.colors.cardBorder,
    borderWidth: 1,
    padding: theme.spacing.sm,
    alignItems: 'center',
  },
  badgeIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  badgeName: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
});
