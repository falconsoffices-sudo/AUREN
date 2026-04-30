import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';
import colors from '../constants/colors';

// ─── Constants ────────────────────────────────────────────────────────────────

const SERVICOS_OPCOES = [
  'Manicure Básica',
  'Gel Manicure',
  'Acrylic Nails',
  'Dip Powder',
  'Nail Art',
  'Pedicure',
  'Spa/Deluxe Manicure & Pedicure',
  'Remoção e Manutenção',
  'Outro',
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(name = '') {
  return name.trim().split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function normalize(str = '') {
  return str.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function formatPhone(raw = '') {
  const digits = raw.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

// Determina qual opção do dropdown corresponde ao valor salvo
function resolveServicoOpcao(sf) {
  if (!sf) return { opcao: '', outro: '' };
  if (SERVICOS_OPCOES.slice(0, -1).includes(sf)) return { opcao: sf, outro: '' };
  return { opcao: 'Outro', outro: sf };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SummaryCard({ value, label }) {
  const { isDark } = useTheme();
  const styles = useMemo(() => makeStyles(isDark), [isDark]);
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function ClientCard({ nome, vip, servico_favorito, telefone, total_visitas, onPress }) {
  const { isDark } = useTheme();
  const styles = useMemo(() => makeStyles(isDark), [isDark]);
  return (
    <TouchableOpacity style={styles.clientCard} activeOpacity={0.72} onPress={onPress}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{getInitials(nome)}</Text>
      </View>

      <View style={styles.clientInfo}>
        <View style={styles.nameRow}>
          <Text style={styles.clientName} numberOfLines={1}>{nome}</Text>
          {vip && (
            <View style={styles.vipBadge}>
              <Text style={styles.vipBadgeText}>VIP</Text>
            </View>
          )}
        </View>
        {servico_favorito ? (
          <Text style={styles.serviceText} numberOfLines={1}>{servico_favorito}</Text>
        ) : null}
        {telefone ? (
          <Text style={styles.phoneText}>{telefone}</Text>
        ) : null}
      </View>

      <View style={styles.visitsCol}>
        <Text style={styles.visitsCount}>{total_visitas ?? 0}</Text>
        <Text style={styles.visitsLabel}>visitas</Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Shared Dropdown for serviço favorito ────────────────────────────────────

function ServicoDropdown({ opcao, setOpcao, aberto, setAberto }) {
  return (
    <>
      <TouchableOpacity
        style={[modal.input, modal.dropdownTrigger]}
        onPress={() => setAberto(o => !o)}
        activeOpacity={0.8}
      >
        <Text style={opcao ? modal.dropdownValueText : modal.dropdownPlaceholderText}>
          {opcao || 'Serviço favorito'}
        </Text>
        <Text style={modal.dropdownArrow}>{aberto ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {aberto && (
        <View style={modal.dropdownList}>
          <ScrollView bounces={false} showsVerticalScrollIndicator={false} nestedScrollEnabled>
            {SERVICOS_OPCOES.map((opt, idx) => (
              <TouchableOpacity
                key={opt}
                style={[
                  modal.dropdownItem,
                  idx < SERVICOS_OPCOES.length - 1 && modal.dropdownItemBorder,
                  opcao === opt && modal.dropdownItemActive,
                ]}
                onPress={() => { setOpcao(opt); setAberto(false); }}
                activeOpacity={0.7}
              >
                <Text style={[modal.dropdownItemText, opcao === opt && modal.dropdownItemTextActive]}>
                  {opt}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </>
  );
}

// ─── Add Client Modal ─────────────────────────────────────────────────────────

function AddClientModal({ visible, onClose, onSaved }) {
  const [nome,          setNome]          = useState('');
  const [telefone,      setTelefone]      = useState('');
  const [servicoOpcao,  setServicoOpcao]  = useState('');
  const [servicoAberto, setServicoAberto] = useState(false);
  const [servicoOutro,  setServicoOutro]  = useState('');
  const [observacoes,   setObservacoes]   = useState('');
  const [saving,        setSaving]        = useState(false);

  const reset = () => {
    setNome(''); setTelefone('');
    setServicoOpcao(''); setServicoAberto(false); setServicoOutro('');
    setObservacoes('');
  };

  const handleClose = () => { reset(); onClose(); };

  const handleSave = async () => {
    if (!nome.trim()) {
      Alert.alert('Campo obrigatório', 'Informe o nome da cliente.'); return;
    }
    setSaving(true);
    try {
      const { data: userData, error: authError } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      console.log('[AddCliente] auth.getUser =>', { userId, authError });
      if (!userId) throw new Error('Usuário não autenticado.');

      const { data: teste, error: testeError } = await supabase
        .from('clientes').select('id').limit(1);
      console.log('TESTE SELECT:', { teste, testeError });

      const servicoFinal = servicoOpcao === 'Outro' ? servicoOutro.trim() : servicoOpcao;

      const payload = {
        profissional_id:  userId,
        nome:             nome.trim(),
        telefone:         telefone ? `+1${telefone.replace(/\D/g, '')}` : null,
        servico_favorito: servicoFinal || null,
        observacoes:      observacoes.trim() || null,
      };
      console.log('[AddCliente] insert payload =>', payload);

      const { error } = await supabase.from('clientes').insert(payload);
      if (error) throw error;

      reset();
      onSaved();
    } catch (err) {
      Alert.alert('Erro ao salvar', err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={modal.backdrop}>
        <TouchableOpacity style={{ flex: 1 }} onPress={handleClose} activeOpacity={1} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[modal.sheet, { paddingBottom: 0, maxHeight: '92%' }]}>
            <ScrollView
              bounces={false}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 40 }}
            >
              <View style={modal.handle} />
              <Text style={modal.title}>Nova cliente</Text>

              <TextInput
                style={modal.input}
                placeholder="Nome completo *"
                placeholderTextColor="#6B4A58"
                value={nome}
                onChangeText={setNome}
                autoCapitalize="words"
                returnKeyType="next"
              />

              <View style={modal.phoneRow}>
                <View style={modal.phonePrefix}>
                  <Text style={modal.phonePrefixText}>+1</Text>
                </View>
                <TextInput
                  style={[modal.input, { flex: 1, marginBottom: 0 }]}
                  placeholder="(305) 555-0100"
                  placeholderTextColor="#6B4A58"
                  value={telefone}
                  onChangeText={raw => setTelefone(formatPhone(raw))}
                  keyboardType="phone-pad"
                  returnKeyType="next"
                />
              </View>

              <ServicoDropdown
                opcao={servicoOpcao}
                setOpcao={setServicoOpcao}
                aberto={servicoAberto}
                setAberto={setServicoAberto}
              />

              {servicoOpcao === 'Outro' && (
                <TextInput
                  style={modal.input}
                  placeholder="Nome do serviço"
                  placeholderTextColor="#6B4A58"
                  value={servicoOutro}
                  onChangeText={setServicoOutro}
                  autoCapitalize="sentences"
                  returnKeyType="next"
                />
              )}

              <TextInput
                style={[modal.input, modal.inputMulti]}
                placeholder="Observações"
                placeholderTextColor="#6B4A58"
                value={observacoes}
                onChangeText={setObservacoes}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />

              <TouchableOpacity
                style={[modal.saveBtn, saving && { opacity: 0.7 }]}
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.85}
              >
                {saving
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={modal.saveBtnText}>Salvar</Text>
                }
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ─── Edit Client Modal ────────────────────────────────────────────────────────

function EditClientModal({ visible, cliente, onClose, onSaved }) {
  const [nome,          setNome]          = useState('');
  const [telefone,      setTelefone]      = useState('');
  const [servicoOpcao,  setServicoOpcao]  = useState('');
  const [servicoAberto, setServicoAberto] = useState(false);
  const [servicoOutro,  setServicoOutro]  = useState('');
  const [observacoes,   setObservacoes]   = useState('');
  const [saving,        setSaving]        = useState(false);

  useEffect(() => {
    if (cliente) {
      setNome(cliente.nome ?? '');
      const digits = (cliente.telefone ?? '').replace(/\D/g, '').slice(-10);
      setTelefone(digits ? formatPhone(digits) : '');
      const { opcao, outro } = resolveServicoOpcao(cliente.servico_favorito);
      setServicoOpcao(opcao);
      setServicoOutro(outro);
      setServicoAberto(false);
      setObservacoes(cliente.observacoes ?? '');
    }
  }, [cliente]);

  const handleSave = async () => {
    if (!nome.trim()) {
      Alert.alert('Campo obrigatório', 'Informe o nome da cliente.'); return;
    }
    setSaving(true);
    try {
      const servicoFinal = servicoOpcao === 'Outro' ? servicoOutro.trim() : servicoOpcao;
      const { error } = await supabase
        .from('clientes')
        .update({
          nome:             nome.trim(),
          telefone:         telefone ? `+1${telefone.replace(/\D/g, '')}` : null,
          servico_favorito: servicoFinal || null,
          observacoes:      observacoes.trim() || null,
        })
        .eq('id', cliente.id);
      if (error) throw error;
      onSaved();
    } catch (err) {
      Alert.alert('Erro ao salvar', err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!cliente) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={modal.backdrop}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} activeOpacity={1} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[modal.sheet, { paddingBottom: 0, maxHeight: '92%' }]}>
            <ScrollView
              bounces={false}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 40 }}
            >
              <View style={modal.handle} />
              <Text style={modal.title}>Editar Cliente</Text>

              <TextInput
                style={modal.input}
                placeholder="Nome completo *"
                placeholderTextColor="#6B4A58"
                value={nome}
                onChangeText={setNome}
                autoCapitalize="words"
                returnKeyType="next"
              />

              <View style={modal.phoneRow}>
                <View style={modal.phonePrefix}>
                  <Text style={modal.phonePrefixText}>+1</Text>
                </View>
                <TextInput
                  style={[modal.input, { flex: 1, marginBottom: 0 }]}
                  placeholder="(305) 555-0100"
                  placeholderTextColor="#6B4A58"
                  value={telefone}
                  onChangeText={raw => setTelefone(formatPhone(raw))}
                  keyboardType="phone-pad"
                  returnKeyType="next"
                />
              </View>

              <ServicoDropdown
                opcao={servicoOpcao}
                setOpcao={setServicoOpcao}
                aberto={servicoAberto}
                setAberto={setServicoAberto}
              />

              {servicoOpcao === 'Outro' && (
                <TextInput
                  style={modal.input}
                  placeholder="Nome do serviço"
                  placeholderTextColor="#6B4A58"
                  value={servicoOutro}
                  onChangeText={setServicoOutro}
                  autoCapitalize="sentences"
                  returnKeyType="next"
                />
              )}

              <TextInput
                style={[modal.input, modal.inputMulti]}
                placeholder="Observações"
                placeholderTextColor="#6B4A58"
                value={observacoes}
                onChangeText={setObservacoes}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />

              <TouchableOpacity
                style={[modal.saveBtn, saving && { opacity: 0.7 }]}
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.85}
              >
                {saving
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={modal.saveBtnText}>Salvar</Text>
                }
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function ClientesScreen() {
  const { isDark } = useTheme();
  const styles = useMemo(() => makeStyles(isDark), [isDark]);
  const [clientes,        setClientes]        = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [query,           setQuery]           = useState('');
  const [addVisible,      setAddVisible]      = useState(false);
  const [editVisible,     setEditVisible]     = useState(false);
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [userId,          setUserId]          = useState(null);

  const fetchClientes = useCallback(async (uid) => {
    const id = uid ?? userId;
    if (!id) return;
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .eq('profissional_id', id)
      .order('nome');
    if (!error && data) setClientes(data);
  }, [userId]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData?.user?.id;
      if (uid) {
        setUserId(uid);
        await fetchClientes(uid);
      }
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return clientes;
    const q = normalize(query.trim());
    return clientes.filter(c =>
      normalize(c.nome).includes(q) ||
      (c.telefone && c.telefone.includes(q))
    );
  }, [query, clientes]);

  const totalAtivas = clientes.filter(c => c.ativa).length;

  const openEdit = (cliente) => {
    setSelectedCliente(cliente);
    setEditVisible(true);
  };

  const closeEdit = () => {
    setEditVisible(false);
    setSelectedCliente(null);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Clientes</Text>
        <Text style={styles.headerSubtitle}>Sua base em Miami, FL</Text>
      </View>

      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por nome ou telefone"
          placeholderTextColor={colors.gray}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          clearButtonMode="while-editing"
          autoCorrect={false}
          autoCapitalize="none"
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.summaryRow}>
          <SummaryCard value={String(clientes.length)} label="Total de clientes" />
          <SummaryCard value={String(totalAtivas)}     label="Ativas" />
        </View>

        <Text style={styles.sectionLabel}>
          {query.trim()
            ? `${filtered.length} resultado${filtered.length !== 1 ? 's' : ''}`
            : 'Todas as clientes'}
        </Text>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : filtered.length > 0 ? (
          filtered.map(c => (
            <ClientCard
              key={c.id}
              {...c}
              onPress={() => openEdit(c)}
            />
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              {clientes.length === 0
                ? 'Nenhuma cliente cadastrada ainda.'
                : 'Nenhuma cliente encontrada.'}
            </Text>
          </View>
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() => setAddVisible(true)}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <AddClientModal
        visible={addVisible}
        onClose={() => setAddVisible(false)}
        onSaved={() => { setAddVisible(false); fetchClientes(); }}
      />

      <EditClientModal
        visible={editVisible}
        cliente={selectedCliente}
        onClose={closeEdit}
        onSaved={() => { closeEdit(); fetchClientes(); }}
      />

    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function makeStyles(isDark) {
  const bg     = isDark ? '#0E0F11' : '#F5EDE8';
  const cardBg = isDark ? '#1A1B1E' : '#FFFFFF';
  const text   = isDark ? '#F5EDE8' : '#1A0A14';
  const sub    = isDark ? '#C9A8B6' : '#6B4A58';
  const avatar = isDark ? '#3D1020' : '#F0E4DC';

  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: bg },

    header: { paddingHorizontal: 20, paddingTop: 28, marginBottom: 20 },
    headerTitle:    { fontSize: 28, fontWeight: '700', color: text, marginBottom: 3 },
    headerSubtitle: { fontSize: 13, fontWeight: '400', color: sub },

    searchWrap: { paddingHorizontal: 20, marginBottom: 20 },
    searchInput: {
      backgroundColor: cardBg, borderRadius: 12,
      paddingHorizontal: 16, paddingVertical: 13,
      fontSize: 14, fontWeight: '400', color: text,
    },

    scroll: { paddingHorizontal: 20, paddingBottom: 110 },

    summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
    summaryCard: {
      flex: 1, backgroundColor: cardBg, borderRadius: 16,
      paddingVertical: 18, paddingHorizontal: 16,
    },
    summaryValue: { fontSize: 32, fontWeight: '800', color: text, marginBottom: 4 },
    summaryLabel: { fontSize: 12, fontWeight: '400', color: sub },

    sectionLabel: {
      fontSize: 11, fontWeight: '600', color: sub,
      letterSpacing: 1.1, textTransform: 'uppercase', marginBottom: 12,
    },

    clientCard: {
      backgroundColor: cardBg, borderRadius: 16, padding: 16,
      marginBottom: 10, flexDirection: 'row', alignItems: 'center',
    },
    avatar: {
      width: 46, height: 46, borderRadius: 23, backgroundColor: avatar,
      alignItems: 'center', justifyContent: 'center', marginRight: 13, flexShrink: 0,
    },
    avatarText:  { fontSize: 15, fontWeight: '700', color: colors.cream },
    clientInfo:  { flex: 1, marginRight: 12 },
    nameRow:     { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 3, flexWrap: 'wrap' },
    clientName:  { fontSize: 15, fontWeight: '700', color: text },
    vipBadge: {
      backgroundColor: 'rgba(232,196,160,0.14)', paddingHorizontal: 7, paddingVertical: 2,
      borderRadius: 6, borderWidth: 1, borderColor: 'rgba(232,196,160,0.28)',
    },
    vipBadgeText: { fontSize: 9, fontWeight: '800', color: colors.cream, letterSpacing: 0.7 },
    serviceText:  { fontSize: 12, fontWeight: '400', color: sub, marginBottom: 3 },
    phoneText:    { fontSize: 12, fontWeight: '400', color: sub },

    visitsCol:    { alignItems: 'center', flexShrink: 0 },
    visitsCount:  { fontSize: 20, fontWeight: '800', color: text, lineHeight: 22 },
    visitsLabel:  { fontSize: 10, fontWeight: '400', color: sub, marginTop: 2 },

    emptyState: { alignItems: 'center', paddingTop: 48 },
    emptyText:  { fontSize: 14, fontWeight: '400', color: sub },

    fab: {
      position: 'absolute', bottom: 24, right: 20,
      width: 56, height: 56, borderRadius: 28,
      backgroundColor: colors.primary,
      alignItems: 'center', justifyContent: 'center',
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.45, shadowRadius: 10, elevation: 8,
    },
    fabText: { fontSize: 30, fontWeight: '400', color: colors.white, lineHeight: 34 },
  });
}

// ─── Modal styles ─────────────────────────────────────────────────────────────

const INPUT_BG = '#1A1B1E';

const modal = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#0E0F11',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 24, paddingTop: 12, paddingBottom: 40,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#3D1020', alignSelf: 'center', marginBottom: 20,
  },
  title: { fontSize: 20, fontWeight: '700', color: '#FFFFFF', marginBottom: 20 },
  input: {
    backgroundColor: INPUT_BG, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, fontWeight: '400', color: '#FFFFFF',
    marginBottom: 12,
  },
  inputMulti: { height: 80, paddingTop: 14 },
  phoneRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12,
  },
  phonePrefix: {
    backgroundColor: INPUT_BG, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 14,
  },
  phonePrefixText: { fontSize: 15, fontWeight: '600', color: '#C9A8B6' },

  dropdownTrigger: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  dropdownArrow:           { fontSize: 11, color: '#6B4A58' },
  dropdownValueText:       { fontSize: 15, fontWeight: '400', color: '#FFFFFF' },
  dropdownPlaceholderText: { fontSize: 15, fontWeight: '400', color: '#6B4A58' },
  dropdownList: {
    backgroundColor: '#150810', borderRadius: 12,
    marginTop: -8, marginBottom: 12, maxHeight: 260, overflow: 'hidden',
  },
  dropdownItem:           { paddingHorizontal: 16, paddingVertical: 13 },
  dropdownItemBorder:     { borderBottomWidth: 1, borderBottomColor: '#1A1B1E' },
  dropdownItemActive:     { backgroundColor: 'rgba(168,35,90,0.15)' },
  dropdownItemText:       { fontSize: 15, fontWeight: '400', color: '#FFFFFF' },
  dropdownItemTextActive: { fontWeight: '700', color: '#A8235A' },

  saveBtn: {
    height: 52, borderRadius: 14, backgroundColor: '#A8235A',
    alignItems: 'center', justifyContent: 'center', marginTop: 8,
  },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});
