import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';

export default function ChatScreen() {
  const [messages, setMessages] = useState([
    { id: 1, sender: 'doctor', text: 'Good morning Alexander! How is your wrist feeling after yesterday’s flexion session?', time: '09:15 AM' },
    { id: 2, sender: 'patient', text: 'Morning Dr. Chen! Range of motion feels much smoother. Mild stiffness in the morning but no acute pain.', time: '09:18 AM' },
    { id: 3, sender: 'doctor', text: 'Excellent progress. Your EMG muscle activation data reached 84µV, which shows great neuromuscular recovery.', time: '09:20 AM' },
  ]);

  const [input, setInput] = useState('');

  const sendMessage = () => {
    if (!input.trim()) return;
    const newMsg = { id: Date.now(), sender: 'patient', text: input, time: 'Just now' };
    setMessages([...messages, newMsg]);
    setInput('');
  };

  const askPhiAI = () => {
    const aiMsg = { 
      id: Date.now(), 
      sender: 'ai', 
      text: '🤖 Phi-3.5 Clinical Analysis: Current vital trends & muscle activation show 78.5% recovery. Recommended action: 10 mins mild range-of-motion stretching.', 
      time: 'Just now' 
    };
    setMessages([...messages, aiMsg]);
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Doctor Header Bar */}
      <View style={styles.doctorHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarInitials}>SC</Text>
        </View>
        <View style={styles.doctorInfo}>
          <Text style={styles.doctorName}>Dr. Sarah Chen</Text>
          <Text style={styles.doctorRole}>Chief of Physical Rehabilitation</Text>
        </View>
        <TouchableOpacity style={styles.aiButton} onPress={askPhiAI}>
          <Ionicons name="hardware-chip-outline" size={18} color={theme.colors.primary} />
          <Text style={styles.aiButtonText}>Phi-3.5</Text>
        </TouchableOpacity>
      </View>

      {/* Chat Messages */}
      <ScrollView style={styles.messagesList} contentContainerStyle={styles.messagesContent}>
        {messages.map(msg => {
          const isPatient = msg.sender === 'patient';
          const isAI = msg.sender === 'ai';

          return (
            <View 
              key={msg.id} 
              style={[
                styles.messageBubble,
                isPatient ? styles.patientBubble : isAI ? styles.aiBubble : styles.doctorBubble
              ]}
            >
              <Text style={[styles.messageText, isPatient ? styles.patientText : styles.doctorText]}>
                {msg.text}
              </Text>
              <Text style={styles.messageTime}>{msg.time}</Text>
            </View>
          );
        })}
      </ScrollView>

      {/* Input Bar */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          placeholder="Write a message to Dr. Chen..."
          placeholderTextColor={theme.colors.textDim}
          value={input}
          onChangeText={setInput}
        />
        <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
          <Ionicons name="send" size={18} color="#FFF" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  doctorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.cardBg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.cardBorder,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.accentLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  avatarInitials: {
    color: theme.colors.accent,
    fontWeight: '700',
    fontSize: 14,
  },
  doctorInfo: {
    flex: 1,
  },
  doctorName: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textMain,
  },
  doctorRole: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  aiButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    padding: theme.spacing.md,
  },
  messageBubble: {
    maxWidth: '82%',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  doctorBubble: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.cardBg,
    borderColor: theme.colors.cardBorder,
    borderWidth: 1,
  },
  patientBubble: {
    alignSelf: 'flex-end',
    backgroundColor: theme.colors.primary,
  },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#16192B',
    borderColor: theme.colors.primary,
    borderWidth: 1,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  doctorText: {
    color: theme.colors.textMain,
  },
  patientText: {
    color: '#FFF',
  },
  messageTime: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.cardBg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.cardBorder,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#090A0F',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: theme.colors.textMain,
    fontSize: 14,
    marginRight: theme.spacing.sm,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
