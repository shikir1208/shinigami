import React, { useState, useRef } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TextInput, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { patientService } from '../services/patientService';

export default function ChatScreen({ patient }) {
  const [inputText, setInputText] = useState('');
  const scrollViewRef = useRef(null);

  const messages = patient?.messages || [
    { id: 'm1', sender: 'Dr. Sarah Chen', text: 'Hello! I am monitoring your telemetry.', timestamp: Date.now() - 3600000, type: 'doc' }
  ];

  const handleSend = () => {
    if (!inputText.trim() || !patient?.id) return;
    const textToSend = inputText.trim();
    setInputText('');

    patientService.sendChatMessage(patient.id, patient.name || 'Patient', textToSend, 'patient');

    // Optional AI auto-response if question mentions AI/symptoms
    if (textToSend.toLowerCase().includes('phi') || textToSend.toLowerCase().includes('ai') || textToSend.toLowerCase().includes('symptom')) {
      setTimeout(() => {
        patientService.sendChatMessage(
          patient.id,
          'Phi-3.5 Assistant',
          `✦ Analysis for ${patient.name}: SpO2 is ${patient.vitals?.spo2 || 98}%, HR is ${patient.vitals?.hr || 78} BPM. Vitals stable.`,
          'ai'
        );
      }, 1200);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Doctor Header Banner */}
      <View style={styles.docHeader}>
        <View style={styles.docAvatar}>
          <Text style={styles.docAvatarText}>SC</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.docName}>Dr. Sarah Chen</Text>
          <Text style={styles.docTitle}>Attending Physician • Ward 4</Text>
        </View>
        <View style={styles.onlineBadge}>
          <View style={styles.onlineDot} />
          <Text style={styles.onlineText}>Connected</Text>
        </View>
      </View>

      {/* Message Feed */}
      <ScrollView 
        ref={scrollViewRef}
        style={styles.feed} 
        contentContainerStyle={styles.feedContent}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map((m, idx) => {
          const isMe = m.type === 'patient';
          const isAi = m.type === 'ai';

          return (
            <View 
              key={m.id || idx} 
              style={[
                styles.msgWrapper, 
                isMe ? styles.msgWrapperRight : styles.msgWrapperLeft
              ]}
            >
              <Text style={styles.senderLabel}>{m.sender}</Text>
              <View style={[
                styles.msgBubble, 
                isMe ? styles.msgBubbleRight : (isAi ? styles.msgBubbleAi : styles.msgBubbleLeft)
              ]}>
                <Text style={[styles.msgText, isMe ? styles.msgTextRight : styles.msgTextLeft]}>
                  {m.text}
                </Text>
              </View>
              <Text style={styles.msgTime}>
                {new Date(m.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          );
        })}
      </ScrollView>

      {/* Input Bar */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          placeholder="Message Dr. Sarah Chen..."
          placeholderTextColor={theme.colors.textDim}
          value={inputText}
          onChangeText={setInputText}
          returnKeyType="send"
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity style={styles.sendBtn} onPress={handleSend} activeOpacity={0.8}>
          <Ionicons name="send" size={18} color="#FFFFFF" />
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
  docHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.cardBg,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.cardBorder,
    gap: 12,
  },
  docAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderWidth: 1,
    borderColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  docAvatarText: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  docName: {
    color: theme.colors.textMain,
    fontSize: 14,
    fontWeight: '700',
  },
  docTitle: {
    color: theme.colors.textDim,
    fontSize: 11,
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.accent,
  },
  onlineText: {
    color: theme.colors.accent,
    fontSize: 10,
    fontWeight: '600',
  },
  feed: {
    flex: 1,
  },
  feedContent: {
    padding: 16,
    gap: 12,
  },
  msgWrapper: {
    maxWidth: '82%',
    marginVertical: 4,
  },
  msgWrapperLeft: {
    alignSelf: 'flex-start',
  },
  msgWrapperRight: {
    alignSelf: 'flex-end',
  },
  senderLabel: {
    color: theme.colors.textDim,
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 2,
    marginHorizontal: 4,
  },
  msgBubble: {
    borderRadius: 16,
    padding: 12,
  },
  msgBubbleLeft: {
    backgroundColor: theme.colors.cardBg,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    borderTopLeftRadius: 4,
  },
  msgBubbleRight: {
    backgroundColor: theme.colors.primary,
    borderTopRightRadius: 4,
  },
  msgBubbleAi: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderTopLeftRadius: 4,
  },
  msgText: {
    fontSize: 13,
    lineHeight: 18,
  },
  msgTextLeft: {
    color: theme.colors.textMain,
  },
  msgTextRight: {
    color: '#FFFFFF',
  },
  msgTime: {
    color: theme.colors.textDim,
    fontSize: 9,
    marginTop: 4,
    alignSelf: 'flex-end',
    marginHorizontal: 4,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: theme.colors.cardBg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.cardBorder,
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: theme.colors.bg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: theme.colors.textMain,
    fontSize: 14,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
