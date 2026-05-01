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
import { useTheme } from '../context/ThemeContext';

function formatPhone(raw) {
  const digits = raw.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export default function AuthClienteScreen({ navigation }) {
  const { idioma } = useTheme();
  const [step, setStep] = useState('form');

  const [nome,     setNome]     = useState('');
  const [email,    setEmail]    = useState('');
  const [telefone, setTelefone] = useState('');
  const [otpCode,  setOtpCode]  = useState('');
  const [loading,  setLoading]  = useState(false);

  const digits    = telefone.replace(/\D/g, '');
  const fullPhone = `+1${digits}`;

  const handleSendOtp = async () => {
    if (!nome.trim() || !email.trim() || digits.length < 10) {
      Alert.alert('Campos obrigatórios', 'Preencha nome, e-mail e telefone.');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({ email: email.trim() });
      if (error) throw error;
      setOtpCode('');
      setStep('otp');
    } catch (err) {
      Alert.alert('Erro ao enviar código', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndCreate = async () => {
    if (otpCode.length < 8) {
      Alert.alert('Código inválido', 'Digite os 8 dígitos recebidos por e-mail.');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: otpCode,
        type: 'email',
      });
      if (error) throw error;

      if (data.user) {
        await supabase
          .from('profiles')
          .update({
            nome:         nome.trim(),
            telefone:     fullPhone,
            idioma,
            tipo_usuario: 'cliente',
            nome_completo_pendente: nome.trim().split(/\s+/).filter(Boolean).length < 3,
          })
          .eq('id', data.user.id);
      }

      navigation.replace('MainCliente');
    } catch (err) {
      Alert.alert('Erro ao verificar', err.message);
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
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, alignSelf: 'flex-start' }}>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#A8235A' }}>←</Text>
          </TouchableOpacity>
          <Image
            source={require('../../assets/images/logo.png')}
            style={styles.logo}
          />

          {step === 'form' && (
            <>
              <Text style={styles.title}>Criar conta</Text>
              <Text style={styles.subtitle}>Acompanhe seus agendamentos com o AUREN</Text>

              <Text style={styles.label}>Nome completo</Text>
              <TextInput
                style={styles.input}
                placeholder="Ana Lima"
                placeholderTextColor="#6B4A58"
                value={nome}
                onChangeText={setNome}
                autoCapitalize="words"
                returnKeyType="next"
              />

              <Text style={styles.label}>E-mail</Text>
              <TextInput
                style={styles.input}
                placeholder="ana@email.com"
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
                  onChangeText={raw => setTelefone(formatPhone(raw))}
                  keyboardType="phone-pad"
                  returnKeyType="done"
                />
              </View>

              <TouchableOpacity
                style={[styles.primaryBtn, loading && { opacity: 0.7 }]}
                onPress={handleSendOtp}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.primaryBtnText}>Criar conta</Text>}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.loginLink}
                onPress={() => navigation.navigate('Login')}
              >
                <Text style={styles.loginLinkText}>Já tenho conta</Text>
              </TouchableOpacity>
            </>
          )}

          {step === 'otp' && (
            <>
              <Text style={styles.title}>Confirme seu e-mail</Text>
              <Text style={styles.subtitle}>
                Enviamos um código para{'\n'}{email}
              </Text>

              <Text style={styles.label}>Código de verificação</Text>
              <TextInput
                style={[styles.input, styles.otpInput]}
                placeholder="00000000"
                placeholderTextColor="#6B4A58"
                value={otpCode}
                onChangeText={t => setOtpCode(t.replace(/\D/g, '').slice(0, 8))}
                keyboardType="numeric"
                maxLength={8}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleVerifyAndCreate}
              />

              <TouchableOpacity
                style={[styles.primaryBtn, loading && { opacity: 0.7 }]}
                onPress={handleVerifyAndCreate}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.primaryBtnText}>Confirmar e criar conta</Text>}
              </TouchableOpacity>

              <TouchableOpacity style={styles.linkBtn} onPress={handleSendOtp} disabled={loading}>
                <Text style={styles.linkBtnText}>Reenviar código</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.backBtn}
                onPress={() => { setOtpCode(''); setStep('form'); }}
              >
                <Text style={styles.backBtnText}>← Editar dados</Text>
              </TouchableOpacity>
            </>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const INPUT_BG = '#1A1B1E';

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#0E0F11' },
  scroll: { paddingHorizontal: 24, paddingTop: 32, paddingBottom: 48 },

  logo: {
    width: 120, height: 60, resizeMode: 'contain',
    alignSelf: 'center', marginBottom: 28,
  },

  title:    { fontSize: 24, fontWeight: '700', color: '#FFFFFF', marginBottom: 6 },
  subtitle: { fontSize: 14, fontWeight: '400', color: '#6B4A58', marginBottom: 28, lineHeight: 20 },

  label: { fontSize: 12, fontWeight: '600', color: '#C9A8B6', marginBottom: 8, letterSpacing: 0.4 },

  input: {
    backgroundColor: INPUT_BG, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, fontWeight: '400', color: '#FFFFFF',
    marginBottom: 18,
  },
  otpInput: {
    fontSize: 28, fontWeight: '700', letterSpacing: 12, textAlign: 'center',
  },

  phoneRow:        { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  phonePrefix:     { backgroundColor: INPUT_BG, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, marginRight: 8 },
  phonePrefixText: { fontSize: 15, fontWeight: '600', color: '#C9A8B6' },
  phoneInput:      { flex: 1, marginBottom: 0 },

  primaryBtn:     { height: 52, borderRadius: 14, backgroundColor: '#A8235A', alignItems: 'center', justifyContent: 'center', marginTop: 8, marginBottom: 16 },
  primaryBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },

  linkBtn:      { alignItems: 'center', paddingVertical: 10 },
  linkBtnText:  { fontSize: 14, fontWeight: '600', color: '#A8235A' },

  backBtn:      { alignItems: 'center', paddingVertical: 10, marginTop: 4 },
  backBtnText:  { fontSize: 13, fontWeight: '400', color: '#6B4A58' },

  loginLink:     { alignItems: 'center', paddingVertical: 10 },
  loginLinkText: { fontSize: 14, fontWeight: '600', color: '#A8235A' },
});
