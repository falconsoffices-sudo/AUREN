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

async function routeAfterLogin(navigation, uid) {
  try {
    const { data } = await supabase.from('profiles').select('tipo_usuario').eq('id', uid).single();
    navigation.replace(data?.tipo_usuario === 'cliente' ? 'MainCliente' : 'Main');
  } catch {
    navigation.replace('Main');
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatPhone(raw) {
  const digits = raw.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function makePassword(email, phone) {
  const digits = phone.replace(/\D/g, '');
  return `Auren_${digits}_2024!`;
}

const DEV_EMAIL = 'nettoserafim92@gmail.com';
const DEV_PHONE = '5618750648';

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function LoginScreen({ navigation }) {
  // 'email' → email OTP entry  |  'otp' → verify code  |  'password' → legacy fallback
  const [step,     setStep]     = useState('email');
  const [email,    setEmail]    = useState('');
  const [otpCode,  setOtpCode]  = useState('');
  const [telefone, setTelefone] = useState(''); // only used in password fallback
  const [loading,  setLoading]  = useState(false);

  // ── Step 1: send email OTP ────────────────────────────────────
  const handleSendOtp = async () => {
    if (!email.trim()) {
      Alert.alert('Campo obrigatório', 'Informe seu e-mail.');
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

  // ── Step 2: verify email OTP ──────────────────────────────────
  const handleVerifyOtp = async () => {
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
      await routeAfterLogin(navigation, data.user?.id);
    } catch (err) {
      Alert.alert('Código incorreto', err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Fallback: email + senha (contas antigas) ──────────────────
  const handlePasswordLogin = async () => {
    if (!email.trim() || !telefone.trim()) {
      Alert.alert('Campos obrigatórios', 'Informe e-mail e telefone.');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: makePassword(email.trim(), telefone),
      });
      if (error) throw error;
      await routeAfterLogin(navigation, data.user?.id);
    } catch (err) {
      Alert.alert('Erro ao entrar', err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Dev mode: login direto sem OTP ───────────────────────────
  const handleDevLogin = async () => {
    const devEmail = email.trim() || DEV_EMAIL;
    setLoading(true);
    try {
      // Limpa sessão anterior para garantir estado limpo
      await supabase.auth.signOut();
      const { data, error } = await supabase.auth.signInWithPassword({
        email:    devEmail,
        password: makePassword(devEmail, DEV_PHONE),
      });
      if (error) throw error;
      // Busca tipo_usuario direto do banco — sem cache
      const uid = data.user?.id;
      if (!uid) throw new Error('Usuário não encontrado após login.');
      await routeAfterLogin(navigation, uid);
    } catch (err) {
      Alert.alert('Dev login falhou', err.message);
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

          {/* ══ STEP: email ══ */}
          {step === 'email' && (
            <>
              <Text style={styles.title}>Bem-vinda de volta</Text>
              <Text style={styles.subtitle}>
                Informe seu e-mail para receber o código de acesso
              </Text>

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
                returnKeyType="send"
                onSubmitEditing={handleSendOtp}
              />

              <TouchableOpacity
                style={[styles.primaryBtn, loading && { opacity: 0.7 }]}
                onPress={handleSendOtp}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.primaryBtnText}>Receber código</Text>}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.devBtn}
                onPress={handleDevLogin}
                disabled={loading}
              >
                <Text style={styles.devBtnText}>Entrar sem código (modo dev)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.linkBtn}
                onPress={() => setStep('password')}
              >
                <Text style={styles.linkBtnText}>Entrar com senha</Text>
              </TouchableOpacity>
            </>
          )}

          {/* ══ STEP: otp ══ */}
          {step === 'otp' && (
            <>
              <Text style={styles.title}>Código enviado</Text>
              <Text style={styles.subtitle}>
                Verifique sua caixa de entrada em{'\n'}{email}
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
                onSubmitEditing={handleVerifyOtp}
              />

              <TouchableOpacity
                style={[styles.primaryBtn, loading && { opacity: 0.7 }]}
                onPress={handleVerifyOtp}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.primaryBtnText}>Confirmar código</Text>}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.linkBtn}
                onPress={handleSendOtp}
                disabled={loading}
              >
                <Text style={styles.linkBtnText}>Reenviar código</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.backBtn}
                onPress={() => { setOtpCode(''); setStep('email'); }}
              >
                <Text style={styles.backBtnText}>← Alterar e-mail</Text>
              </TouchableOpacity>
            </>
          )}

          {/* ══ STEP: password (fallback para contas antigas) ══ */}
          {step === 'password' && (
            <>
              <Text style={styles.title}>Entrar com senha</Text>
              <Text style={styles.subtitle}>
                Para contas criadas antes da versão atual
              </Text>

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
                  onChangeText={raw => setTelefone(formatPhone(raw))}
                  keyboardType="phone-pad"
                  returnKeyType="done"
                  onSubmitEditing={handlePasswordLogin}
                />
              </View>

              <TouchableOpacity
                style={[styles.primaryBtn, loading && { opacity: 0.7 }]}
                onPress={handlePasswordLogin}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.primaryBtnText}>Entrar</Text>}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.backBtn}
                onPress={() => setStep('email')}
              >
                <Text style={styles.backBtnText}>← Entrar com código</Text>
              </TouchableOpacity>
            </>
          )}

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

// ─── Styles ───────────────────────────────────────────────────────────────────

const INPUT_BG = '#1A1B1E';

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#0E0F11' },
  scroll: { paddingHorizontal: 24, paddingTop: 40, paddingBottom: 48 },

  logo: {
    width: 120, height: 60, resizeMode: 'contain',
    alignSelf: 'center', marginBottom: 32,
  },

  title:    { fontSize: 24, fontWeight: '700', color: '#FFFFFF', marginBottom: 6 },
  subtitle: { fontSize: 14, fontWeight: '400', color: '#6B4A58', marginBottom: 32, lineHeight: 20 },

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

  devBtn:      { alignItems: 'center', paddingVertical: 10 },
  devBtnText:  { fontSize: 12, fontWeight: '500', color: '#3D3D3D' },

  linkBtn:      { alignItems: 'center', paddingVertical: 10 },
  linkBtnText:  { fontSize: 14, fontWeight: '600', color: '#A8235A' },

  backBtn:      { alignItems: 'center', paddingVertical: 10, marginTop: 4 },
  backBtnText:  { fontSize: 13, fontWeight: '400', color: '#6B4A58' },

  registerLink:     { alignItems: 'center', paddingVertical: 10, marginTop: 16 },
  registerLinkText: { fontSize: 14, fontWeight: '600', color: '#A8235A' },
});
