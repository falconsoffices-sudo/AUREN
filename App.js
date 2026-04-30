import React, { useState, useEffect, useRef } from 'react';
import { Image, StyleSheet, Animated } from 'react-native';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import WelcomeScreen    from './src/screens/WelcomeScreen';
import AuthScreen       from './src/screens/AuthScreen';
import LoginScreen      from './src/screens/LoginScreen';
import HomeScreen       from './src/screens/HomeScreen';
import AgendaScreen     from './src/screens/AgendaScreen';
import ClientesScreen   from './src/screens/ClientesScreen';
import CaixaScreen      from './src/screens/CaixaScreen';
import PerfilStack      from './src/navigation/PerfilStack';
import OnboardingScreen from './src/screens/OnboardingScreen';
import SaibaMaisScreen  from './src/screens/SaibaMaisScreen';
import { supabase } from './src/lib/supabase';
import { registerForPushNotifications } from './src/lib/notifications';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

const customDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#0E0F11',
    card: '#1A1B1E',
    border: 'transparent',
  },
};

function MainTabs() {
  const { theme, isDark } = useTheme();
  const c = theme.colors;
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: isDark ? '#1A1B1E' : '#FFFFFF',
          borderTopColor: isDark ? 'transparent' : '#E6D8CF',
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: '#B09AA8',
      }}
    >
      <Tab.Screen name="Início"   component={HomeScreen}     />
      <Tab.Screen name="Agenda"   component={AgendaScreen}   />
      <Tab.Screen name="Clientes" component={ClientesScreen} />
      <Tab.Screen name="Caixa"    component={CaixaScreen}    />
      <Tab.Screen name="Perfil"   component={PerfilStack}    />
    </Tab.Navigator>
  );
}

async function setupPushToken() {
  try {
    const token = await registerForPushNotifications();
    if (!token) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('profiles').update({ push_token: token }).eq('id', user.id);
  } catch (_) {}
}

function AppContent() {
  const { isDark } = useTheme();
  return (
    <SafeAreaProvider>
      <NavigationContainer theme={isDark ? customDarkTheme : undefined}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Welcome"    component={WelcomeScreen}    />
          <Stack.Screen name="Auth"       component={AuthScreen}       />
          <Stack.Screen name="Login"      component={LoginScreen}      />
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          <Stack.Screen name="SaibaMais"  component={SaibaMaisScreen}  />
          <Stack.Screen name="Main"       component={MainTabs}         />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const fadeTimer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => setShowSplash(false));
    }, 3000);
    setupPushToken();
    return () => clearTimeout(fadeTimer);
  }, []);

  if (showSplash) {
    return (
      <Animated.View style={[styles.splash, { opacity: fadeAnim }]}>
        <Image
          source={require('./assets/images/emblema.png')}
          style={styles.emblema}
        />
      </Animated.View>
    );
  }

  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: '#1A0A14',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emblema: {
    width: 360,
    height: 360,
    resizeMode: 'contain',
  },
});
