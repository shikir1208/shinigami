import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import HomeScreen from './src/screens/HomeScreen';
import ProgressScreen from './src/screens/ProgressScreen';
import VitalsScreen from './src/screens/VitalsScreen';
import ChatScreen from './src/screens/ChatScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import LoginScreen from './src/screens/LoginScreen';
import { theme } from './src/theme';
import { patientService } from './src/services/patientService';

const Tab = createBottomTabNavigator();

export default function App() {
  const [currentPatient, setCurrentPatient] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);

  // Check stored patient code on app launch
  useEffect(() => {
    async function checkStoredSession() {
      try {
        const storedCode = await patientService.getStoredPatientCode();
        if (storedCode) {
          const patientData = await patientService.loginWithPatientCode(storedCode);
          setCurrentPatient(patientData);
        }
      } catch (err) {
        console.warn('Failed to restore patient session:', err);
      } finally {
        setLoadingSession(false);
      }
    }
    checkStoredSession();
  }, []);

  // Real-time Firestore Listener when patient is logged in
  useEffect(() => {
    if (!currentPatient || !currentPatient.id) return;

    const unsubscribe = patientService.subscribeToPatient(currentPatient.id, (updatedPatient) => {
      setCurrentPatient(prev => ({
        ...prev,
        ...updatedPatient
      }));
    });

    return () => unsubscribe();
  }, [currentPatient?.id]);

  const handleLogout = async () => {
    await patientService.clearStoredPatientCode();
    setCurrentPatient(null);
  };

  if (loadingSession) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={{ color: theme.colors.textDim, marginTop: 12, fontSize: 13, fontWeight: '600' }}>
          Connecting to Eris Clinical Cloud...
        </Text>
      </View>
    );
  }

  if (!currentPatient) {
    return (
      <>
        <StatusBar style="light" backgroundColor={theme.colors.bg} />
        <LoginScreen onLoginSuccess={(patient) => setCurrentPatient(patient)} />
      </>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style="light" backgroundColor={theme.colors.bg} />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerStyle: {
            backgroundColor: theme.colors.bg,
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.cardBorder,
          },
          headerTitleStyle: {
            color: theme.colors.textMain,
            fontSize: 17,
            fontWeight: '700',
          },
          headerTitleAlign: 'left',
          headerRight: () => (
            <View style={headerStyles.patientBadgeContainer}>
              <View style={headerStyles.patientBadge}>
                <View style={headerStyles.liveDot} />
                <Text style={headerStyles.patientCodeText}>{currentPatient.code || currentPatient.id}</Text>
              </View>
            </View>
          ),
          tabBarStyle: {
            backgroundColor: theme.colors.tabBar,
            borderTopColor: theme.colors.tabBorder,
            borderTopWidth: 1,
            height: 62,
            paddingBottom: 8,
            paddingTop: 6,
          },
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: theme.colors.textDim,
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
          },
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;
            if (route.name === 'Home') {
              iconName = focused ? 'home' : 'home-outline';
            } else if (route.name === 'Progress') {
              iconName = focused ? 'analytics' : 'analytics-outline';
            } else if (route.name === 'Vitals') {
              iconName = focused ? 'pulse' : 'pulse-outline';
            } else if (route.name === 'Chat') {
              iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
            } else if (route.name === 'Profile') {
              iconName = focused ? 'person' : 'person-outline';
            }
            return <Ionicons name={iconName} size={22} color={color} />;
          },
        })}
      >
        <Tab.Screen name="Home" options={{ title: 'Eris Companion' }}>
          {(props) => <HomeScreen {...props} patient={currentPatient} />}
        </Tab.Screen>
        
        <Tab.Screen name="Progress" options={{ title: 'Rehab Progress' }}>
          {(props) => <ProgressScreen {...props} patient={currentPatient} />}
        </Tab.Screen>
        
        <Tab.Screen name="Vitals" options={{ title: 'Live Telemetry' }}>
          {(props) => <VitalsScreen {...props} patient={currentPatient} />}
        </Tab.Screen>
        
        <Tab.Screen name="Chat" options={{ title: 'Doctor Chat' }}>
          {(props) => <ChatScreen {...props} patient={currentPatient} />}
        </Tab.Screen>
        
        <Tab.Screen name="Profile" options={{ title: 'Patient Profile' }}>
          {(props) => <ProfileScreen {...props} patient={currentPatient} onLogout={handleLogout} />}
        </Tab.Screen>
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const headerStyles = StyleSheet.create({
  patientBadgeContainer: {
    marginRight: 16,
  },
  patientBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.cardBg,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.accent,
  },
  patientCodeText: {
    color: theme.colors.primary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
