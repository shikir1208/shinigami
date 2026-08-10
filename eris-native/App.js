import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import HomeScreen from './src/screens/HomeScreen';
import ProgressScreen from './src/screens/ProgressScreen';
import VitalsScreen from './src/screens/VitalsScreen';
import ChatScreen from './src/screens/ChatScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import { theme } from './src/theme';

const Tab = createBottomTabNavigator();

export default function App() {
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
            fontSize: 18,
            fontWeight: '700',
          },
          headerTitleAlign: 'left',
          tabBarStyle: {
            backgroundColor: theme.colors.tabBar,
            borderTopColor: theme.colors.tabBorder,
            borderTopWidth: 1,
            height: 60,
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
        <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Eris Companion' }} />
        <Tab.Screen name="Progress" component={ProgressScreen} options={{ title: 'Rehab Progress' }} />
        <Tab.Screen name="Vitals" component={VitalsScreen} options={{ title: 'Live Telemetry' }} />
        <Tab.Screen name="Chat" component={ChatScreen} options={{ title: 'Doctor Chat' }} />
        <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Patient Profile' }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
