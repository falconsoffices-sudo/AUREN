import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Contacts from 'expo-contacts';
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

const EMPTY_ROW = () => ({ nome: '', fone: '' });

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

  // Step 2 — Clientes (multi)
  const [clientesRows,       setClientesRows]       = useState(Array.from({ length: 20 }, EMPTY_ROW));
  const [quantosVisiveis,    setQuantosVisiveis]    = useState(3);
  const [usouImportacao,     setUsouImportacao]     = useState(false);
  const [carregandoContatos, setCarregandoContatos] = useState(false);
  const [contatoModal,       setContatoModal]       = useState(false);
  const [todosContatos,      setTodosContatos]      = useState([]);
  const [contatoQuery,       setContatoQuery]       = useState('');
  const [selecionados,       setSelecionados]       = useState([]);

  // Derived — step 2
  const visivelRows   = clientesRows.slice(0, quantosVisiveis);
  const podeConcluir  = visivelRows.some(r => r.nome.trim() && r.fone.trim());

  const contatosFiltrados = useMemo(() => {
    if (!contatoQuery.trim()) return todosContatos;
    const q = contatoQuery.toLowerCase();
    return todosContatos.filter(c => c.name?.toLowerCase().includes(q));
  }, [todosContatos, contatoQuery]);

  async function getUid() {
    const { data } = await supabase.auth.getUser();
    return data?.user?.id ?? null;
  }

  async function finalizarOnboarding(uid) {
    await supabase.from('profiles').update({ onboarding_completo: true }).eq('id', uid);
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

  async function importarAgenda() {
    setCarregandoContatos(true);
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão negada', 'Ative o acesso aos contatos nas configurações do dispositivo.');
        return;
      }
      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name],
      });
      const comFone = (data ?? [])
        .filter(c => c.name && c.phoneNumbers?.length > 0)
        .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
      setTodosContatos(comFone);
      setSelecionados([]);
      setContatoQuery('');
      setContatoModal(true);
    } catch {
      Alert.alert('Erro', 'Não foi possível acessar os contatos.');
    } finally {
      setCarregandoContatos(false);
    }
  }

  function toggleContato(id) {
    setSelecionados(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 20) {
        Alert.alert('Limite atingido', 'Você pode importar até 20 clientes de uma vez.');
        return prev;
      }
      return [...prev, id];
    });
  }

  function confirmarContatos() {
    const selected = todosContatos.filter(c => selecionados.includes(c.id)).slice(0, 20);
    const novasRows = selected.map(c => {
      const digits = (c.phoneNumbers?.[0]?.number ?? '').replace(/\D/g, '').slice(-10);
      return { nome: c.name ?? '', fone: digits ? formatPhone(digits) : '' };
    });
    while (novasRows.length < 20) novasRows.push(EMPTY_ROW());
    setClientesRows(novasRows);
    setQuantosVisiveis(Math.max(3, Math.min(selected.length, 20)));
    setUsouImportacao(true);
    setContatoModal(false);
  }

  function updateRow(idx, field, value) {
    setClientesRows(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      return updated;
    });
  }

  async function handleStep2() {
    const completos = visivelRows.filter(r => r.nome.trim() && r.fone.trim());
    setLoading(true);
    try {
      const uid = await getUid();
      if (uid) {
        await supabase.from('clientes').insert(
          completos.map(r => ({
            profissional_id: uid,
            nome:     r.nome.trim(),
            telefone: `+1${r.fone.replace(/\D/g, '')}`,
          }))
        );
        if (usouImportacao) {
          const { error: agendaError } = await supabase
            .from('profiles')
            .update({ agenda_conectada: true })
            .eq('id', uid);
        }
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

          {/* ── Step 2: Clientes (multi) ── */}
          {step === 2 && (
            <>
              <Text style={styles.stepTag}>PASSO 3 DE 3</Text>
              <Text style={styles.title}>Convide suas primeiras clientes</Text>
              <Text style={styles.subtitle}>
                Adicione até 20 clientes agora e o AUREN começa a trabalhar por você imediatamente
              </Text>

              <View style={styles.motivCard}>
                <Text style={styles.motivText}>
                  Profissionais que cadastram 10+ clientes no primeiro dia têm 3x mais retenção no app e começam a receber alertas de clientes inativas imediatamente.
                </Text>
              </View>

              <TouchableOpacity
                style={styles.btnAgenda}
                onPress={importarAgenda}
                disabled={carregandoContatos || loading}
                activeOpacity={0.85}
              >
                {carregandoContatos
                  ? <ActivityIndicator color="#A8235A" />
                  : <Text style={styles.btnAgendaText}>Importar da minha agenda</Text>}
              </TouchableOpacity>

              {visivelRows.map((row, idx) => (
                <View key={idx} style={{ marginBottom: 4 }}>
                  <Text style={styles.label}>Cliente {idx + 1}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Nome *"
                    placeholderTextColor="#6B4A58"
                    value={row.nome}
                    onChangeText={v => updateRow(idx, 'nome', v)}
                    autoCapitalize="words"
                    returnKeyType="next"
                  />
                  <View style={styles.prefixRow}>
                    <View style={styles.prefix}><Text style={styles.prefixText}>+1</Text></View>
                    <TextInput
                      style={[styles.input, styles.prefixInput]}
                      placeholder="(305) 555-0100"
                      placeholderTextColor="#6B4A58"
                      value={row.fone}
                      onChangeText={raw => updateRow(idx, 'fone', formatPhone(raw))}
                      keyboardType="phone-pad"
                      returnKeyType="next"
                    />
                  </View>
                </View>
              ))}

              {quantosVisiveis < 20 && (
                <TouchableOpacity style={styles.addMaisBtn} onPress={() => setQuantosVisiveis(prev => Math.min(prev + 3, 20))} activeOpacity={0.8}>
                  <Text style={styles.addMaisText}>+ Adicionar mais {Math.min(quantosVisiveis + 3, 20) - quantosVisiveis}</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.btn, { marginTop: 16 }, loading && styles.btnDisabled]}
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

      {/* ── Modal: seletor de contatos ── */}
      <Modal
        visible={contatoModal}
        animationType="slide"
        onRequestClose={() => setContatoModal(false)}
      >
        <SafeAreaView style={ctStyles.safe} edges={['top', 'bottom']}>
          <View style={ctStyles.header}>
            <Text style={ctStyles.title}>Selecionar contatos</Text>
            <Text style={ctStyles.count}>
              {selecionados.length} selecionado{selecionados.length !== 1 ? 's' : ''}
            </Text>
          </View>

          <TextInput
            style={ctStyles.search}
            placeholder="Buscar contato..."
            placeholderTextColor="#6B4A58"
            value={contatoQuery}
            onChangeText={setContatoQuery}
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="while-editing"
          />

          <FlatList
            data={contatosFiltrados}
            keyExtractor={c => c.id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item: c }) => {
              const sel  = selecionados.includes(c.id);
              const fone = c.phoneNumbers?.[0]?.number ?? '';
              return (
                <TouchableOpacity
                  style={[ctStyles.item, sel && ctStyles.itemSelected]}
                  onPress={() => toggleContato(c.id)}
                  activeOpacity={0.7}
                >
                  <View style={[ctStyles.check, sel && ctStyles.checkSelected]}>
                    {sel && <Text style={ctStyles.checkMark}>✓</Text>}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={ctStyles.nome}>{c.name}</Text>
                    {!!fone && <Text style={ctStyles.fone}>{fone}</Text>}
                  </View>
                </TouchableOpacity>
              );
            }}
            contentContainerStyle={{ paddingBottom: 20 }}
          />

          <View style={ctStyles.footer}>
            <TouchableOpacity
              style={ctStyles.btnCancelar}
              onPress={() => setContatoModal(false)}
              activeOpacity={0.8}
            >
              <Text style={ctStyles.btnCancelarText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[ctStyles.btnConfirmar, selecionados.length === 0 && { opacity: 0.4 }]}
              onPress={confirmarContatos}
              disabled={selecionados.length === 0}
              activeOpacity={0.85}
            >
              <Text style={ctStyles.btnConfirmarText}>Confirmar ({selecionados.length})</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

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
  subtitle: { fontSize: 14, fontWeight: '400', color: '#C9A8B6', lineHeight: 21, marginBottom: 20 },

  motivCard: {
    backgroundColor: 'rgba(168,35,90,0.10)', borderRadius: 12,
    padding: 14, marginBottom: 20,
    borderWidth: 1, borderColor: 'rgba(168,35,90,0.25)',
  },
  motivText: { fontSize: 13, fontWeight: '400', color: '#C9A8B6', lineHeight: 20 },

  btnAgenda: {
    borderWidth: 1.5, borderColor: '#A8235A', borderRadius: 14,
    height: 52, alignItems: 'center', justifyContent: 'center', marginBottom: 24,
  },
  btnAgendaText: { fontSize: 15, fontWeight: '700', color: '#A8235A' },

  label: { fontSize: 12, fontWeight: '600', color: '#C9A8B6', marginBottom: 8, letterSpacing: 0.4 },

  input: {
    backgroundColor: INPUT_BG, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, color: '#FFFFFF', marginBottom: 10,
  },

  prefixRow:   { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  prefix:      { backgroundColor: INPUT_BG, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, marginRight: 8 },
  prefixText:  { fontSize: 15, fontWeight: '600', color: '#C9A8B6' },
  prefixInput: { flex: 1, marginBottom: 0 },

  addMaisBtn: { alignItems: 'center', paddingVertical: 14, marginBottom: 8 },
  addMaisText: { fontSize: 14, fontWeight: '700', color: '#A8235A' },

  btn:         { height: 52, borderRadius: 14, backgroundColor: '#A8235A', alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  btnDisabled: { opacity: 0.4 },
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

// ── Contacts picker modal styles ──────────────────────────────────────────────

const ctStyles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#0E0F11' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  title:  { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  count:  { fontSize: 13, fontWeight: '600', color: '#A8235A' },
  search: {
    backgroundColor: '#1A1B1E', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 13,
    fontSize: 14, color: '#FFFFFF',
    marginHorizontal: 20, marginBottom: 8,
  },
  item: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#1A1B1E',
  },
  itemSelected: { backgroundColor: 'rgba(168,35,90,0.08)' },
  check: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: '#3D1020',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 14, flexShrink: 0,
  },
  checkSelected: { backgroundColor: '#A8235A', borderColor: '#A8235A' },
  checkMark: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },
  nome: { fontSize: 15, fontWeight: '600', color: '#FFFFFF', marginBottom: 2 },
  fone: { fontSize: 12, fontWeight: '400', color: '#6B4A58' },
  footer: {
    flexDirection: 'row', gap: 10,
    paddingHorizontal: 20, paddingVertical: 16,
    borderTopWidth: 1, borderTopColor: '#1A1B1E',
  },
  btnCancelar: {
    flex: 1, height: 50, borderRadius: 12,
    borderWidth: 1, borderColor: '#3A3A3A',
    alignItems: 'center', justifyContent: 'center',
  },
  btnCancelarText: { fontSize: 15, fontWeight: '600', color: '#8A8A8E' },
  btnConfirmar: {
    flex: 2, height: 50, borderRadius: 12,
    backgroundColor: '#A8235A',
    alignItems: 'center', justifyContent: 'center',
  },
  btnConfirmarText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});
