import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import HomeScreen    from '../screens/HomeScreen';
import AgendaScreen  from '../screens/AgendaScreen';
import ClientesScreen from '../screens/ClientesScreen';
import CaixaScreen   from '../screens/CaixaScreen';
import PerfilScreen  from '../screens/PerfilScreen';

const Tab = createBottomTabNavigator();

const ACTIVE   = '#A8235A';
const INACTIVE = '#6B4A58';

export default function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,

        /* Label with weight that changes on focus */
        tabBarLabel: ({ focused, color }) => (
          <Text
            style={{
              fontSize: 11,
              fontWeight: focused ? '700' : '500',
              color,
              marginTop: 2,
            }}
            numberOfLines={1}
          >
            {route.name}
          </Text>
        ),

        tabBarActiveTintColor:   ACTIVE,
        tabBarInactiveTintColor: INACTIVE,

        tabBarStyle: {
          backgroundColor: 'rgba(255,255,255,0.93)',
          borderTopColor: '#E6D8CF',
          borderTopWidth: 1,
          height: 78,
          paddingTop: 10,
          paddingBottom: 18,
        },
      })}
    >
      <Tab.Screen name="Início"   component={HomeScreen}     />
      <Tab.Screen name="Agenda"   component={AgendaScreen}   />
      <Tab.Screen name="Clientes" component={ClientesScreen} />
      <Tab.Screen name="Caixa"    component={CaixaScreen}    />
      <Tab.Screen name="Perfil"   component={PerfilScreen}   />
    </Tab.Navigator>
  );
}
