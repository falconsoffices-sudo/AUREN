import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';

function makePassword(phone) {
  const digits = phone.replace(/\D/g, '');
  return `Auren_${digits}_2024!`;
}

export default function LoginScreen({ navigation }) {
  const [email,    setEmail]    = useState('');
  const [telefone, setTelefone] = useState('');
  const [loading,  setLoading]  = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !telefone.trim()) {
      Alert.alert('Campos obrigatórios', 'Informe e-mail e telefone.');
      return;
    }

    setLoading(true);
    try {
      const password = makePassword(telefone);
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      navigation.replace('Main');
    } catch (err) {
      Alert.alert('Erro ao entrar', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

          <Image
            source={require('../../assets/images/logo.png')}
            style={styles.logo}
          />

          <Text style={styles.title}>Bem-vinda de volta</Text>
          <Text style={styles.subtitle}>Entre com seus dados de acesso</Text>

          <Text style={styles.label}>E-mail</Text>
          <TextInput
            style={styles.input}
            placeholder="maria@email.com"
            placeholderTextColor="#6B4A58"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
          />

          <Text style={styles.label}>Telefone</Text>
          <View style={styles.phoneRow}>
            <View style={styles.phonePrefix}>
              <Text style={styles.phonePrefixText}>+1</Text>
            </View>
            <TextInput
              style={[styles.input, styles.phoneInput]}
              placeholder="(305) 555-0100"
              placeholderTextColor="#6B4A58"
              value={telefone}
              onChangeText={setTelefone}
              keyboardType="phone-pad"
              returnKeyType="done"
            />
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, loading && { opacity: 0.7 }]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.primaryBtnText}>Entrar</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.registerLink}
            onPress={() => navigation.navigate('Auth')}
          >
            <Text style={styles.registerLinkText}>Não tenho conta — Cadastrar</Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const INPUT_BG = '#2D1020';

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#1A0A14',
  },
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 48,
  },

  logo: {
    width: 120,
    height: 60,
    resizeMode: 'contain',
    alignSelf: 'center',
    marginBottom: 32,
  },

  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: '#6B4A58',
    marginBottom: 32,
  },

  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#C9A8B6',
    marginBottom: 8,
    letterSpacing: 0.4,
  },

  input: {
    backgroundColor: INPUT_BG,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontWeight: '400',
    color: '#FFFFFF',
    marginBottom: 18,
  },

  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  phonePrefix: {
    backgroundColor: INPUT_BG,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginRight: 8,
  },
  phonePrefixText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#C9A8B6',
  },
  phoneInput: {
    flex: 1,
    marginBottom: 0,
  },

  primaryBtn: {
    height: 52,
    borderRadius: 14,
    backgroundColor: '#A8235A',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  registerLink: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  registerLinkText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#A8235A',
  },
});
