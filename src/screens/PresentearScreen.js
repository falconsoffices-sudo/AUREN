import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  StyleSheet,
  Alert,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Contacts from 'expo-contacts';

const OPCOES = [
  { id: 1, plano: 'Básico', meses: 1, preco: '$59',  label: 'Básico · 1 mês',   economia: null },
  { id: 2, plano: 'Pro',    meses: 1, preco: '$89',  label: 'Pro · 1 mês',       economia: null },
  { id: 3, plano: 'Pro',    meses: 3, preco: '$240', label: 'Pro · 3 meses',     economia: 'Economize $27' },
  { id: 4, plano: 'Pro',    meses: 6, preco: '$450', label: 'Pro · 6 meses',     economia: 'Economize $84' },
];

function formatPhone(raw) {
  const digits = raw.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export default function PresentearScreen({ navigation }) {
  const [opcaoSelecionada,  setOpcaoSelecionada]  = useState(null);
  const [nomeDestinatario,  setNomeDestinatario]  = useState('');
  const [telefoneDestinatario, setTelefoneDestinatario] = useState('');
  const [emailDestinatario, setEmailDestinatario] = useState('');
  const [mensagem,          setMensagem]          = useState('');

  const [contatoModal,       setContatoModal]       = useState(false);
  const [todosContatos,      setTodosContatos]      = useState([]);
  const [contatoQuery,       setContatoQuery]       = useState('');
  const [carregandoContatos, setCarregandoContatos] = useState(false);

  async function importarAgenda() {
    setCarregandoContatos(true);
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão necessária', 'Permita o acesso aos contatos nas configurações do dispositivo.');
        return;
      }
      const { data: contacts } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name],
      });
      const validos = contacts
        .filter(c => c.name && c.phoneNumbers?.length > 0)
        .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
      setTodosContatos(validos);
      setContatoQuery('');
      setContatoModal(true);
    } catch (err) {
      Alert.alert('Erro', err.message);
    } finally {
      setCarregandoContatos(false);
    }
  }

  function selecionarContato(c) {
    setNomeDestinatario(c.name ?? '');
    setTelefoneDestinatario(formatPhone(c.phoneNumbers?.[0]?.number ?? ''));
    setContatoModal(false);
  }

  function handleEnviar() {
    if (!opcaoSelecionada) {
      Alert.alert('Selecione um plano', 'Escolha uma opção de presente antes de continuar.');
      return;
    }
    if (!emailDestinatario.trim() || !emailDestinatario.includes('@')) {
      Alert.alert('E-mail inválido', 'Digite um endereço de e-mail válido para o presente.');
      return;
    }
    Alert.alert(
      'Em breve!',
      'O envio de presentes estará disponível em breve. Obrigada pelo interesse!',
      [{ text: 'OK' }],
    );
  }

  const contatosFiltrados = todosContatos.filter(c =>
    !contatoQuery.trim() || (c.name ?? '').toLowerCase().includes(contatoQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Presentear com AUREN</Text>
        <View style={styles.headerRight} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

          <Text style={styles.intro}>
            Presenteie uma colega com acesso ao AUREN. Escolha o plano e período ideal.
          </Text>

          <Text style={styles.sectionLabel}>ESCOLHA O PRESENTE</Text>
          {OPCOES.map(op => {
            const ativo = opcaoSelecionada?.id === op.id;
            return (
              <TouchableOpacity
                key={op.id}
                style={[styles.opcaoCard, ativo && styles.opcaoCardAtiva]}
                onPress={() => setOpcaoSelecionada(op)}
                activeOpacity={0.8}
              >
                <View style={styles.opcaoLeft}>
                  <Text style={[styles.opcaoLabel, ativo && styles.opcaoLabelAtiva]}>{op.label}</Text>
                  {op.economia && (
                    <View style={styles.economiaBadge}>
                      <Text style={styles.economiaText}>{op.economia}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.opcaoRight}>
                  <Text style={[styles.opcaoPreco, ativo && styles.opcaoPrecoAtivo]}>{op.preco}</Text>
                  <Text style={styles.opcaoPeriodo}>/total</Text>
                </View>
                <View style={[styles.radio, ativo && styles.radioAtivo]}>
                  {ativo && <View style={styles.radioDot} />}
                </View>
              </TouchableOpacity>
            );
          })}

          <Text style={[styles.sectionLabel, { marginTop: 8 }]}>DESTINATÁRIO</Text>

          <TouchableOpacity
            style={[styles.importBtn, carregandoContatos && { opacity: 0.6 }]}
            onPress={importarAgenda}
            disabled={carregandoContatos}
            activeOpacity={0.8}
          >
            {carregandoContatos
              ? <ActivityIndicator color="#A8235A" size="small" />
              : <Text style={styles.importBtnText}>Importar da agenda</Text>}
          </TouchableOpacity>

          <Text style={styles.label}>Nome</Text>
          <TextInput
            style={styles.input}
            placeholder="Nome da presenteada"
            placeholderTextColor="#6B4A58"
            value={nomeDestinatario}
            onChangeText={setNomeDestinatario}
            autoCapitalize="words"
            returnKeyType="next"
          />

          <Text style={styles.label}>Telefone</Text>
          <TextInput
            style={styles.input}
            placeholder="(000) 000-0000"
            placeholderTextColor="#6B4A58"
            value={telefoneDestinatario}
            onChangeText={v => setTelefoneDestinatario(formatPhone(v))}
            keyboardType="phone-pad"
            returnKeyType="next"
          />

          <Text style={styles.label}>E-mail *</Text>
          <TextInput
            style={styles.input}
            placeholder="colega@email.com"
            placeholderTextColor="#6B4A58"
            value={emailDestinatario}
            onChangeText={setEmailDestinatario}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
          />

          <Text style={styles.label}>Mensagem pessoal (opcional)</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            placeholder="Parabéns! Espero que o AUREN te ajude muito no seu negócio."
            placeholderTextColor="#6B4A58"
            value={mensagem}
            onChangeText={setMensagem}
            multiline
            numberOfLines={3}
            returnKeyType="done"
          />

          <TouchableOpacity
            style={styles.enviarBtn}
            onPress={handleEnviar}
            activeOpacity={0.85}
          >
            <Text style={styles.enviarBtnText}>Enviar presente</Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Contacts picker ── */}
      <Modal visible={contatoModal} transparent animationType="slide" onRequestClose={() => setContatoModal(false)}>
        <View style={ct.backdrop}>
          <View style={ct.container}>
            <View style={ct.header}>
              <Text style={ct.title}>Selecionar contato</Text>
              <TouchableOpacity onPress={() => setContatoModal(false)} activeOpacity={0.7}>
                <Text style={ct.close}>Cancelar</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={ct.search}
              placeholder="Buscar..."
              placeholderTextColor="#C9A8B6"
              value={contatoQuery}
              onChangeText={setContatoQuery}
              autoCorrect={false}
            />
            <FlatList
              data={contatosFiltrados}
              keyExtractor={c => c.id}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item: c }) => (
                <TouchableOpacity style={ct.item} onPress={() => selecionarContato(c)} activeOpacity={0.7}>
                  <Text style={ct.name}>{c.name}</Text>
                  <Text style={ct.phone}>{c.phoneNumbers?.[0]?.number ?? ''}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const INPUT_BG = '#1A1B1E';
const CARD_BG  = '#222222';

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0E0F11' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 20, marginBottom: 8,
  },
  backBtn:     { width: 32, alignItems: 'center' },
  backArrow:   { fontSize: 32, color: '#FFFFFF', lineHeight: 34, marginTop: -4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  headerRight: { width: 32 },

  scroll: { paddingHorizontal: 20, paddingBottom: 48, paddingTop: 12 },

  intro: {
    fontSize: 14, fontWeight: '400', color: '#C9A8B6',
    lineHeight: 21, marginBottom: 28,
  },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: '#6B4A58',
    letterSpacing: 1.2, marginBottom: 12,
  },

  opcaoCard: {
    backgroundColor: CARD_BG, borderRadius: 14,
    padding: 16, marginBottom: 10,
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: 'transparent',
  },
  opcaoCardAtiva: { borderColor: '#A8235A', backgroundColor: 'rgba(168,35,90,0.08)' },
  opcaoLeft:   { flex: 1 },
  opcaoLabel:  { fontSize: 15, fontWeight: '600', color: '#C9A8B6', marginBottom: 4 },
  opcaoLabelAtiva: { color: '#FFFFFF' },
  economiaBadge: {
    backgroundColor: 'rgba(168,35,90,0.2)', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start',
  },
  economiaText: { fontSize: 11, fontWeight: '700', color: '#A8235A' },

  opcaoRight:      { alignItems: 'flex-end', marginRight: 14 },
  opcaoPreco:      { fontSize: 18, fontWeight: '800', color: '#C9A8B6' },
  opcaoPrecoAtivo: { color: '#FFFFFF' },
  opcaoPeriodo:    { fontSize: 11, color: '#6B4A58', marginTop: 1 },

  radio:     { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#2A2A2A', alignItems: 'center', justifyContent: 'center' },
  radioAtivo:{ borderColor: '#A8235A' },
  radioDot:  { width: 10, height: 10, borderRadius: 5, backgroundColor: '#A8235A' },

  importBtn: {
    borderWidth: 1, borderColor: '#A8235A', borderRadius: 8,
    paddingVertical: 10, alignItems: 'center', marginBottom: 18,
    height: 40, justifyContent: 'center',
  },
  importBtnText: { fontSize: 13, fontWeight: '600', color: '#A8235A' },

  label: { fontSize: 12, fontWeight: '600', color: '#C9A8B6', marginBottom: 8, letterSpacing: 0.4 },

  input: {
    backgroundColor: INPUT_BG, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, color: '#FFFFFF', marginBottom: 18,
  },
  textarea: { height: 90, textAlignVertical: 'top', paddingTop: 14 },

  enviarBtn: {
    height: 54, borderRadius: 14, backgroundColor: '#A8235A',
    alignItems: 'center', justifyContent: 'center', marginTop: 8,
  },
  enviarBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});

const ct = StyleSheet.create({
  backdrop:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)' },
  container: { flex: 1, backgroundColor: '#0E0F11', marginTop: 60, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  header:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
  title:     { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  close:     { fontSize: 15, fontWeight: '600', color: '#A8235A' },
  search: {
    marginHorizontal: 20, marginBottom: 10,
    backgroundColor: '#1A1B1E', borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 15, color: '#FFFFFF',
  },
  item:  { paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#1A1B1E' },
  name:  { fontSize: 15, fontWeight: '500', color: '#FFFFFF' },
  phone: { fontSize: 12, fontWeight: '400', color: '#C9A8B6', marginTop: 2 },
});
