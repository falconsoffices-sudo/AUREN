import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';

export default function ClientePlaceholderScreen({ navigation }) {
  const handleSair = async () => {
    await supabase.auth.signOut();
    navigation.replace('Welcome');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <Text style={styles.emoji}>✨</Text>
        <Text style={styles.title}>App para clientes</Text>
        <Text style={styles.subtitle}>
          Estamos preparando uma experiência incrível para você acompanhar seus agendamentos.
          {'\n\n'}Em breve!
        </Text>

        <TouchableOpacity style={styles.btn} onPress={handleSair} activeOpacity={0.85}>
          <Text style={styles.btnText}>Sair</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: '#0E0F11' },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },

  emoji:    { fontSize: 56, marginBottom: 24 },
  title:    { fontSize: 26, fontWeight: '800', color: '#FFFFFF', textAlign: 'center', marginBottom: 16 },
  subtitle: { fontSize: 15, fontWeight: '400', color: '#C9A8B6', textAlign: 'center', lineHeight: 24, marginBottom: 48 },

  btn:     { height: 52, borderRadius: 14, borderWidth: 1.5, borderColor: '#A8235A', paddingHorizontal: 40, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontSize: 15, fontWeight: '700', color: '#A8235A' },
});
