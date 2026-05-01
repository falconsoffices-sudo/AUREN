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
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';

const TOTAL_STEPS = 3;

const SERVICOS_CATALOGO = [
  { nome: 'Manicure Básica',                valor: 35 },
  { nome: 'Gel Manicure',                   valor: 55 },
  { nome: 'Acrylic Nails',                  valor: 85 },
  { nome: 'Dip Powder',                     valor: 65 },
  { nome: 'Nail Art',                       valor: 75 },
  { nome: 'Pedicure',                       valor: 45 },
  { nome: 'Spa/Deluxe Manicure & Pedicure', valor: 95 },
  { nome: 'Remoção e Manutenção',           valor: 40 },
];

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
];

function formatPhone(raw) {
  const digits = raw.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

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
  const [servicoNome,          setServicoNome]          = useState('');
  const [servicoValor,         setServicoValor]         = useState('');
  const [servicoDuracao,       setServicoDuracao]       = useState('');
  const [servicoPickerVisible, setServicoPickerVisible] = useState(false);

  // Step 1 — Endereço
  const [street,             setStreet]             = useState('');
  const [apt,                setApt]                = useState('');
  const [city,               setCity]               = useState('');
  const [addrState,          setAddrState]          = useState('');
  const [zip,                setZip]                = useState('');
  const [statePickerVisible, setStatePickerVisible] = useState(false);

  // Step 2 — Cliente
  const [clienteNome, setClienteNome] = useState('');
  const [clienteFone, setClienteFone] = useState('');

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
      Alert.alert('Campo obrigatório', 'Selecione um serviço.');
      return;
    }
    setLoading(true);
    try {
      const uid = await getUid();
      if (uid) {
        await supabase.from('servicos').insert({
          profissional_id: uid,
          nome:            servicoNome.trim(),
          valor:           parseFloat(servicoValor.replace(',', '.')) || 0,
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
    if (!street.trim()) {
      Alert.alert('Campo obrigatório', 'Informe o endereço (Street Address).');
      return;
    }
    if (zip.trim() && !/^\d{5}$/.test(zip.trim())) {
      Alert.alert('ZIP inválido', 'O ZIP Code deve ter 5 dígitos.');
      return;
    }
    setLoading(true);
    try {
      const uid = await getUid();
      if (uid) {
        await supabase.from('profiles').update({
          endereco_comercial: JSON.stringify({
            street: street.trim(),
            apt:    apt.trim(),
            city:   city.trim(),
            state:  addrState,
            zip:    zip.trim(),
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
          telefone: clienteFone ? `+1${clienteFone.replace(/\D/g, '')}` : null,
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

  function handleBack() {
    if (step === 0) navigation.goBack();
    else setStep(step - 1);
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
          <TouchableOpacity onPress={handleBack} style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, alignSelf: 'flex-start' }}>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#A8235A' }}>←</Text>
          </TouchableOpacity>
          <ProgressDots current={step} />

          {/* ── Step 0: Primeiro serviço ── */}
          {step === 0 && (
            <>
              <Text style={styles.stepTag}>PASSO 1 DE 3</Text>
              <Text style={styles.title}>Seu primeiro serviço</Text>
              <Text style={styles.subtitle}>
                Adicione o serviço que você mais realiza para começar.
              </Text>

              <Text style={styles.label}>Serviço *</Text>
              <TouchableOpacity
                style={styles.pickerField}
                onPress={() => setServicoPickerVisible(true)}
                activeOpacity={0.8}
              >
                <Text style={servicoNome ? styles.pickerFieldText : styles.pickerFieldPlaceholder} numberOfLines={1}>
                  {servicoNome || 'Selecionar serviço...'}
                </Text>
                <Text style={styles.pickerArrow}>▼</Text>
              </TouchableOpacity>

              <Modal
                visible={servicoPickerVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setServicoPickerVisible(false)}
              >
                <View style={styles.pickerBackdrop}>
                  <TouchableOpacity style={{ flex: 1 }} onPress={() => setServicoPickerVisible(false)} activeOpacity={1} />
                  <View style={styles.pickerSheet}>
                    <View style={styles.pickerHandle} />
                    <Text style={styles.pickerTitle}>Selecionar Serviço</Text>
                    <ScrollView showsVerticalScrollIndicator={false}>
                      {SERVICOS_CATALOGO.map((s, idx) => (
                        <TouchableOpacity
                          key={s.nome}
                          style={[styles.pickerItem, idx < SERVICOS_CATALOGO.length - 1 && styles.pickerItemBorder]}
                          onPress={() => {
                            setServicoNome(s.nome);
                            setServicoValor(String(s.valor));
                            setServicoPickerVisible(false);
                          }}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.pickerItemNome}>{s.nome}</Text>
                          <Text style={styles.pickerItemValor}>${s.valor}</Text>
                        </TouchableOpacity>
                      ))}
                      <View style={{ height: 20 }} />
                    </ScrollView>
                  </View>
                </View>
              </Modal>

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
              <Text style={styles.title}>Endereço do seu negócio</Text>
              <Text style={styles.subtitle}>
                Onde você atende? Isso ajuda a organizar sua agenda por localização.
              </Text>

              <Text style={styles.label}>Street Address *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: 123 Collins Ave"
                placeholderTextColor="#6B4A58"
                value={street}
                onChangeText={setStreet}
                autoCapitalize="words"
                returnKeyType="next"
              />

              <Text style={styles.label}>Apt / Suite / Unit</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Apt 4B (opcional)"
                placeholderTextColor="#6B4A58"
                value={apt}
                onChangeText={setApt}
                autoCapitalize="words"
                returnKeyType="next"
              />

              <Text style={styles.label}>City</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Miami"
                placeholderTextColor="#6B4A58"
                value={city}
                onChangeText={setCity}
                autoCapitalize="words"
                returnKeyType="next"
              />

              <Text style={styles.label}>State</Text>
              <TouchableOpacity
                style={styles.pickerField}
                onPress={() => setStatePickerVisible(true)}
                activeOpacity={0.8}
              >
                <Text style={addrState ? styles.pickerFieldText : styles.pickerFieldPlaceholder}>
                  {addrState || 'Selecionar estado...'}
                </Text>
                <Text style={styles.pickerArrow}>▼</Text>
              </TouchableOpacity>

              <Modal
                visible={statePickerVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setStatePickerVisible(false)}
              >
                <View style={styles.pickerBackdrop}>
                  <TouchableOpacity style={{ flex: 1 }} onPress={() => setStatePickerVisible(false)} activeOpacity={1} />
                  <View style={styles.pickerSheet}>
                    <View style={styles.pickerHandle} />
                    <Text style={styles.pickerTitle}>Selecionar Estado</Text>
                    <ScrollView showsVerticalScrollIndicator={false}>
                      {US_STATES.map((st, idx) => (
                        <TouchableOpacity
                          key={st}
                          style={[styles.pickerItem, idx < US_STATES.length - 1 && styles.pickerItemBorder]}
                          onPress={() => {
                            setAddrState(st);
                            setStatePickerVisible(false);
                          }}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.pickerItemNome}>{st}</Text>
                        </TouchableOpacity>
                      ))}
                      <View style={{ height: 20 }} />
                    </ScrollView>
                  </View>
                </View>
              </Modal>

              <Text style={styles.label}>ZIP Code *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: 33139"
                placeholderTextColor="#6B4A58"
                value={zip}
                onChangeText={t => setZip(t.replace(/\D/g, '').slice(0, 5))}
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
                  onChangeText={raw => setClienteFone(formatPhone(raw))}
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

  dots:      { flexDirection: 'row', gap: 8, justifyContent: 'center', marginBottom: 36 },
  dot:       { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2A2A2A' },
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

  pickerField: {
    backgroundColor: INPUT_BG, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    marginBottom: 18, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between',
  },
  pickerFieldText:        { fontSize: 15, color: '#FFFFFF', flex: 1 },
  pickerFieldPlaceholder: { fontSize: 15, color: '#6B4A58', flex: 1 },
  pickerArrow:            { fontSize: 11, color: '#6B4A58', marginLeft: 8 },

  pickerBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  pickerSheet: {
    backgroundColor: '#0E0F11', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 24, paddingTop: 12, maxHeight: '75%',
  },
  pickerHandle:     { width: 40, height: 4, borderRadius: 2, backgroundColor: '#2A2A2A', alignSelf: 'center', marginBottom: 20 },
  pickerTitle:      { fontSize: 18, fontWeight: '700', color: '#FFFFFF', marginBottom: 16 },
  pickerItem:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
  pickerItemBorder: { borderBottomWidth: 1, borderBottomColor: '#2A2A2A' },
  pickerItemNome:   { fontSize: 15, fontWeight: '600', color: '#FFFFFF', flex: 1 },
  pickerItemValor:  { fontSize: 15, fontWeight: '700', color: '#A8235A', marginLeft: 12 },
});
