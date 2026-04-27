import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';

// Gera senha determinística a partir do telefone
function makePassword(phone) {
  const digits = phone.replace(/\D/g, '');
  return `Auren_${digits}_2024!`;
}

function ToggleGroup({ options, value, onChange }) {
  return (
    <View style={styles.toggleRow}>
      {options.map(opt => {
        const active = value === opt.value;
        return (
          <TouchableOpacity
            key={opt.value}
            style={[styles.toggleBtn, active && styles.toggleActive]}
            onPress={() => onChange(opt.value)}
            activeOpacity={0.75}
          >
            <Text style={[styles.toggleText, active && styles.toggleTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function AuthScreen({ navigation }) {
  const [nome,     setNome]     = useState('');
  const [email,    setEmail]    = useState('');
  const [telefone, setTelefone] = useState('');
  const [idioma,   setIdioma]   = useState('pt');
  const [genero,   setGenero]   = useState('');
  const [loading,  setLoading]  = useState(false);

  const handleSignUp = async () => {
    if (!nome.trim() || !email.trim() || !telefone.trim() || !genero) {
      Alert.alert('Campos obrigatórios', 'Preencha todos os campos para continuar.');
      return;
    }

    setLoading(true);
    try {
      const fullPhone = `+1${telefone.replace(/\D/g, '')}`;
      const password  = makePassword(telefone);

      const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
      if (error) throw error;

      if (data.user) {
        await supabase.from('profiles').upsert({
          id:       data.user.id,
          nome:     nome.trim(),
          telefone: fullPhone,
          idioma,
          genero,
        });
      }

      navigation.replace('Main');
    } catch (err) {
      Alert.alert('Erro ao criar conta', err.message);
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

          {/* Logo */}
          <Image
            source={require('../../assets/images/logo.png')}
            style={styles.logo}
          />

          {/* Título */}
          <Text style={styles.title}>Criar conta</Text>
          <Text style={styles.subtitle}>Comece sua jornada com o AUREN</Text>

          {/* Nome */}
          <Text style={styles.label}>Nome completo</Text>
          <TextInput
            style={styles.input}
            placeholder="Maria Carvalho"
            placeholderTextColor="#6B4A58"
            value={nome}
            onChangeText={setNome}
            autoCapitalize="words"
            returnKeyType="next"
          />

          {/* E-mail */}
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

          {/* Telefone */}
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

          {/* Idioma */}
          <Text style={styles.label}>Idioma</Text>
          <ToggleGroup
            value={idioma}
            onChange={setIdioma}
            options={[
              { label: 'PT-BR',    value: 'pt' },
              { label: 'ES-LATAM', value: 'es' },
            ]}
          />

          {/* Gênero */}
          <Text style={styles.label}>Gênero</Text>
          <ToggleGroup
            value={genero}
            onChange={setGenero}
            options={[
              { label: 'Feminino',  value: 'feminino'  },
              { label: 'Masculino', value: 'masculino' },
            ]}
          />

          {/* Botão principal */}
          <TouchableOpacity
            style={[styles.primaryBtn, loading && { opacity: 0.7 }]}
            onPress={handleSignUp}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.primaryBtnText}>Criar conta</Text>
            }
          </TouchableOpacity>

          {/* Link login */}
          <TouchableOpacity
            style={styles.loginLink}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.loginLinkText}>Já tenho conta</Text>
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
    paddingTop: 32,
    paddingBottom: 48,
  },

  logo: {
    width: 120,
    height: 60,
    resizeMode: 'contain',
    alignSelf: 'center',
    marginBottom: 28,
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
    marginBottom: 28,
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

  toggleRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: INPUT_BG,
  },
  toggleActive: {
    backgroundColor: '#A8235A',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B4A58',
  },
  toggleTextActive: {
    color: '#FFFFFF',
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

  loginLink: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  loginLinkText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#A8235A',
  },
});
