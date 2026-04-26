import React, { useState, useEffect } from 'react';
import { View, Image, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import WelcomeScreen  from './src/screens/WelcomeScreen';
import HomeScreen     from './src/screens/HomeScreen';
import AgendaScreen   from './src/screens/AgendaScreen';
import ClientesScreen from './src/screens/ClientesScreen';
import CaixaScreen    from './src/screens/CaixaScreen';
import PerfilScreen   from './src/screens/PerfilScreen';

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: '#1A0A14', borderTopColor: '#2D1020' },
        tabBarActiveTintColor: '#A8235A',
        tabBarInactiveTintColor: '#6B4A58',
      }}
    >
      <Tab.Screen name="Início"   component={HomeScreen}     />
      <Tab.Screen name="Agenda"   component={AgendaScreen}   />
      <Tab.Screen name="Clientes" component={ClientesScreen} />
      <Tab.Screen name="Caixa"    component={CaixaScreen}    />
      <Tab.Screen name="Perfil"   component={PerfilScreen}   />
    </Tab.Navigator>
  );
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  if (showSplash) {
    return (
      <View style={styles.splash}>
        <Image
          source={require('./assets/images/logo.png')}
          style={styles.logo}
        />
        <TouchableOpacity onPress={() => setShowSplash(false)} style={styles.debugBtn}>
          <Text style={styles.debugText}>ENTRAR</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="Main"    component={MainTabs} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: '#1A0A14',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 200,
    height: 100,
    resizeMode: 'contain',
  },
  debugBtn: {
    marginTop: 48,
    padding: 16,
  },
  debugText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
