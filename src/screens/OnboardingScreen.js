import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';

const TOTAL_STEPS = 3;

function ProgressDots({ current }) {
  return (
    <View style={styles.dots}>
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <View key={i} style={[styles.dot, i <= current && styles.dotActive]} />
      ))}
    </View>
  );
}

export default function OnboardingScreen({ navigation }) {
  const [step,    setStep]    = useState(0);
  const [loading, setLoading] = useState(false);

  // Step 0 — Serviço
  const [servicoNome,    setServicoNome]    = useState('');
  const [servicoValor,   setServicoValor]   = useState('');
  const [servicoDuracao, setServicoDuracao] = useState('');

  // Step 1 — Endereço
  const [rua,     setRua]     = useState('');
  const [cidade,  setCidade]  = useState('');
  const [estado,  setEstado]  = useState('');
  const [cep,     setCep]     = useState('');

  // Step 2 — Cliente
  const [clienteNome,  setClienteNome]  = useState('');
  const [clienteFone,  setClienteFone]  = useState('');

  async function getUid() {
    const { data } = await supabase.auth.getUser();
    return data?.user?.id ?? null;
  }

  async function finalizarOnboarding(uid) {
    await supabase
      .from('profiles')
      .update({ onboarding_completo: true })
      .eq('id', uid);
    navigation.replace('Main');
  }

  async function handleStep0() {
    if (!servicoNome.trim()) {
      Alert.alert('Campo obrigatório', 'Digite o nome do serviço.');
      return;
    }
    setLoading(true);
    try {
      const uid = await getUid();
      if (uid) {
        await supabase.from('servicos').insert({
          profissional_id: uid,
          nome:    servicoNome.trim(),
          valor:   parseFloat(servicoValor.replace(',', '.')) || 0,
          duracao_minutos: parseInt(servicoDuracao, 10) || 60,
        });
      }
      setStep(1);
    } catch (err) {
      Alert.alert('Erro', err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleStep1() {
    if (!cidade.trim() || !estado.trim()) {
      Alert.alert('Campos obrigatórios', 'Informe cidade e estado.');
      return;
    }
    setLoading(true);
    try {
      const uid = await getUid();
      if (uid) {
        await supabase.from('profiles').update({
          endereco_comercial: JSON.stringify({
            rua:    rua.trim(),
            numero: '',
            cidade: cidade.trim(),
            estado: estado.trim().toUpperCase().slice(0, 2),
            zip:    cep.trim(),
          }),
        }).eq('id', uid);
      }
      setStep(2);
    } catch (err) {
      Alert.alert('Erro', err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleStep2() {
    if (!clienteNome.trim()) {
      Alert.alert('Campo obrigatório', 'Digite o nome da cliente.');
      return;
    }
    setLoading(true);
    try {
      const uid = await getUid();
      if (uid) {
        await supabase.from('clientes').insert({
          profissional_id: uid,
          nome:     clienteNome.trim(),
          telefone: clienteFone.trim() || null,
        });
        await finalizarOnboarding(uid);
      } else {
        navigation.replace('Main');
      }
    } catch (err) {
      Alert.alert('Erro', err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handlePular() {
    const uid = await getUid();
    if (uid) await finalizarOnboarding(uid);
    else navigation.replace('Main');
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <ProgressDots current={step} />

          {/* ── Step 0: Primeiro serviço ── */}
          {step === 0 && (
            <>
              <Text style={styles.stepTag}>PASSO 1 DE 3</Text>
              <Text style={styles.title}>Seu primeiro serviço</Text>
              <Text style={styles.subtitle}>
                Adicione o serviço que você mais realiza para começar.
              </Text>

              <Text style={styles.label}>Nome do serviço *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Manicure simples"
                placeholderTextColor="#6B4A58"
                value={servicoNome}
                onChangeText={setServicoNome}
                autoCapitalize="sentences"
                returnKeyType="next"
              />

              <Text style={styles.label}>Valor (USD)</Text>
              <View style={styles.prefixRow}>
                <View style={styles.prefix}><Text style={styles.prefixText}>$</Text></View>
                <TextInput
                  style={[styles.input, styles.prefixInput]}
                  placeholder="0.00"
                  placeholderTextColor="#6B4A58"
                  value={servicoValor}
                  onChangeText={setServicoValor}
                  keyboardType="decimal-pad"
                  returnKeyType="next"
                />
              </View>

              <Text style={styles.label}>Duração (minutos)</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: 60"
                placeholderTextColor="#6B4A58"
                value={servicoDuracao}
                onChangeText={setServicoDuracao}
                keyboardType="number-pad"
                returnKeyType="done"
              />

              <TouchableOpacity
                style={[styles.btn, loading && styles.btnDisabled]}
                onPress={handleStep0}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.btnText}>Próximo</Text>}
              </TouchableOpacity>
            </>
          )}

          {/* ── Step 1: Endereço ── */}
          {step === 1 && (
            <>
              <Text style={styles.stepTag}>PASSO 2 DE 3</Text>
              <Text style={styles.title}>Endereço do salão</Text>
              <Text style={styles.subtitle}>
                Onde você atende? Isso ajuda a organizar sua agenda por localização.
              </Text>

              <Text style={styles.label}>Rua / Logradouro</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: 123 Collins Ave"
                placeholderTextColor="#6B4A58"
                value={rua}
                onChangeText={setRua}
                autoCapitalize="words"
                returnKeyType="next"
              />

              <Text style={styles.label}>Cidade *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Miami"
                placeholderTextColor="#6B4A58"
                value={cidade}
                onChangeText={setCidade}
                autoCapitalize="words"
                returnKeyType="next"
              />

              <Text style={styles.label}>Estado *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: FL"
                placeholderTextColor="#6B4A58"
                value={estado}
                onChangeText={setEstado}
                autoCapitalize="characters"
                maxLength={2}
                returnKeyType="next"
              />

              <Text style={styles.label}>ZIP Code</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: 33139"
                placeholderTextColor="#6B4A58"
                value={cep}
                onChangeText={setCep}
                keyboardType="number-pad"
                maxLength={5}
                returnKeyType="done"
              />

              <TouchableOpacity
                style={[styles.btn, loading && styles.btnDisabled]}
                onPress={handleStep1}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.btnText}>Próximo</Text>}
              </TouchableOpacity>
            </>
          )}

          {/* ── Step 2: Convidar cliente ── */}
          {step === 2 && (
            <>
              <Text style={styles.stepTag}>PASSO 3 DE 3</Text>
              <Text style={styles.title}>Convide sua primeira cliente</Text>
              <Text style={styles.subtitle}>
                Cadastre uma cliente para já poder criar agendamentos.
              </Text>

              <Text style={styles.label}>Nome da cliente *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Ana Lima"
                placeholderTextColor="#6B4A58"
                value={clienteNome}
                onChangeText={setClienteNome}
                autoCapitalize="words"
                returnKeyType="next"
              />

              <Text style={styles.label}>Telefone</Text>
              <View style={styles.prefixRow}>
                <View style={styles.prefix}><Text style={styles.prefixText}>+1</Text></View>
                <TextInput
                  style={[styles.input, styles.prefixInput]}
                  placeholder="(305) 555-0100"
                  placeholderTextColor="#6B4A58"
                  value={clienteFone}
                  onChangeText={setClienteFone}
                  keyboardType="phone-pad"
                  returnKeyType="done"
                />
              </View>

              <TouchableOpacity
                style={[styles.btn, loading && styles.btnDisabled]}
                onPress={handleStep2}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.btnText}>Concluir</Text>}
              </TouchableOpacity>

              <TouchableOpacity style={styles.skipBtn} onPress={handlePular} disabled={loading}>
                <Text style={styles.skipText}>Pular por agora</Text>
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
  scroll: { paddingHorizontal: 24, paddingTop: 40, paddingBottom: 48 },

  dots: { flexDirection: 'row', gap: 8, justifyContent: 'center', marginBottom: 36 },
  dot:  { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2A2A2A' },
  dotActive: { backgroundColor: '#A8235A', width: 24 },

  stepTag:  { fontSize: 11, fontWeight: '700', color: '#A8235A', letterSpacing: 1.4, marginBottom: 10 },
  title:    { fontSize: 26, fontWeight: '800', color: '#FFFFFF', marginBottom: 8 },
  subtitle: { fontSize: 14, fontWeight: '400', color: '#C9A8B6', lineHeight: 21, marginBottom: 32 },

  label: { fontSize: 12, fontWeight: '600', color: '#C9A8B6', marginBottom: 8, letterSpacing: 0.4 },

  input: {
    backgroundColor: INPUT_BG, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, color: '#FFFFFF', marginBottom: 18,
  },

  prefixRow:   { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  prefix:      { backgroundColor: INPUT_BG, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, marginRight: 8 },
  prefixText:  { fontSize: 15, fontWeight: '600', color: '#C9A8B6' },
  prefixInput: { flex: 1, marginBottom: 0 },

  btn:         { height: 52, borderRadius: 14, backgroundColor: '#A8235A', alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  btnDisabled: { opacity: 0.6 },
  btnText:     { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },

  skipBtn:  { alignItems: 'center', paddingVertical: 14 },
  skipText: { fontSize: 14, fontWeight: '600', color: '#A8235A' },
});
