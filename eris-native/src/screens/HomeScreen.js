import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';

export default function HomeScreen({ navigation }) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.patientName}>Alexander Vance</Text>
        </View>
        <TouchableOpacity style={styles.avatarButton}>
          <Text style={styles.avatarText}>AV</Text>
        </TouchableOpacity>
      </View>

      {/* Daily Motivation Quote */}
      <View style={styles.quoteCard}>
        <View style={styles.quoteHeader}>
          <Ionicons name="sparkles-outline" size={18} color={theme.colors.primary} />
          <Text style={styles.quoteTitle}>DAILY MOTIVATION</Text>
        </View>
        <Text style={styles.quoteText}>
          "Small daily improvements over time lead to stunning long-term rehabilitation results."
        </Text>
        <Text style={styles.quoteAuthor}>— Dr. Sarah Chen, Chief of Rehab</Text>
      </View>

      {/* Stats Quick Grid */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <View style={styles.statIconContainer}>
            <Ionicons name="flame" size={20} color="#F59E0B" />
          </View>
          <Text style={styles.statValue}>12 Days</Text>
          <Text style={styles.statLabel}>Active Streak</Text>
        </View>

        <View style={styles.statCard}>
          <View style={styles.statIconContainer}>
            <Ionicons name="trophy" size={20} color={theme.colors.primary} />
          </View>
          <Text style={styles.statValue}>Gold III</Text>
          <Text style={styles.statLabel}>Rehab Rank</Text>
        </View>

        <View style={styles.statCard}>
          <View style={styles.statIconContainer}>
            <Ionicons name="pulse" size={20} color={theme.colors.accent} />
          </View>
          <Text style={styles.statValue}>98.4%</Text>
          <Text style={styles.statLabel}>Vital Score</Text>
        </View>
      </View>

      {/* Up Next Rehab Session */}
      <Text style={styles.sectionTitle}>Up Next Today</Text>
      <TouchableOpacity 
        style={styles.actionCard}
        onPress={() => navigation.navigate('Progress')}
      >
        <View style={styles.actionIconBg}>
          <Ionicons name="fitness-outline" size={24} color={theme.colors.primary} />
        </View>
        <View style={styles.actionContent}>
          <Text style={styles.actionTitle}>Wrist Extension & Flexion</Text>
          <Text style={styles.actionSubtitle}>15 reps • 3 sets • EMG Monitored</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={theme.colors.textDim} />
      </TouchableOpacity>

      {/* Doctor Message Preview */}
      <TouchableOpacity 
        style={styles.actionCard}
        onPress={() => navigation.navigate('Chat')}
      >
        <View style={[styles.actionIconBg, { backgroundColor: theme.colors.accentLight }]}>
          <Ionicons name="chatbubble-ellipses-outline" size={24} color={theme.colors.accent} />
        </View>
        <View style={styles.actionContent}>
          <Text style={styles.actionTitle}>Message from Dr. Sarah Chen</Text>
          <Text style={styles.actionSubtitle}>"Great job on morning wrist mobility tests!"</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={theme.colors.textDim} />
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
    padding: theme.spacing.md,
    paddingTop: theme.spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  greeting: {
    fontSize: 14,
    color: theme.colors.textMuted,
    fontWeight: '500',
  },
  patientName: {
    fontSize: 24,
    color: theme.colors.textMain,
    fontWeight: '700',
    marginTop: 2,
  },
  avatarButton: {
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
    fontSize: 15,
  },
  quoteCard: {
    backgroundColor: theme.colors.cardBg,
    borderRadius: theme.borderRadius.md,
    borderColor: theme.colors.cardBorder,
    borderWidth: 1,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  quoteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
    gap: 6,
  },
  quoteTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.primary,
    letterSpacing: 1,
  },
  quoteText: {
    fontSize: 15,
    color: theme.colors.textMain,
    lineHeight: 22,
    fontStyle: 'italic',
    marginBottom: theme.spacing.xs,
  },
  quoteAuthor: {
    fontSize: 12,
    color: theme.colors.textDim,
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.cardBg,
    borderRadius: theme.borderRadius.md,
    borderColor: theme.colors.cardBorder,
    borderWidth: 1,
    padding: theme.spacing.sm,
    alignItems: 'center',
  },
  statIconContainer: {
    marginBottom: 6,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textMain,
  },
  statLabel: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: theme.colors.textMain,
    marginBottom: theme.spacing.sm,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.cardBg,
    borderRadius: theme.borderRadius.md,
    borderColor: theme.colors.cardBorder,
    borderWidth: 1,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  actionIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: theme.colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textMain,
  },
  actionSubtitle: {
    fontSize: 13,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
});
