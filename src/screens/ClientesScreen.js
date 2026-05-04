import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Contacts from 'expo-contacts';
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

// ─── Cliente Histórico Modal ──────────────────────────────────────────────────

function formatDtBrief(dt) {
  const d = new Date(dt);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatMoeda(v) {
  return Number(v || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

const STATUS_COLOR = {
  confirmado: '#10B981',
  finalizado: '#6B7280',
  cancelado:  '#EF4444',
  pendente:   '#F59E0B',
};

function ClienteHistoricoModal({ visible, cliente, userId, onClose, onEditar }) {
  const [loading,      setLoading]      = useState(false);
  const [agendamentos, setAgendamentos] = useState([]);

  useEffect(() => {
    if (!visible || !cliente || !userId) return;
    setLoading(true);
    supabase
      .from('agendamentos')
      .select('id, data_hora, status, valor, servicos(nome)')
      .eq('profissional_id', userId)
      .eq('cliente_id', cliente.id)
      .order('data_hora', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setAgendamentos(data ?? []);
        setLoading(false);
      });
  }, [visible, cliente, userId]);

  if (!cliente) return null;

  const ativos       = agendamentos.filter(a => a.status !== 'cancelado');
  const totalVisitas = ativos.length;
  const valorTotal   = ativos.reduce((s, a) => s + Number(a.valor || 0), 0);
  const ultimaVisita = ativos[0]?.data_hora ?? null;

  const bySvc = {};
  for (const a of ativos) {
    const nome = a.servicos?.nome ?? '—';
    bySvc[nome] = (bySvc[nome] ?? 0) + 1;
  }
  const topServicos = Object.entries(bySvc).sort(([, a], [, b]) => b - a).slice(0, 3);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={modal.backdrop}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} activeOpacity={1} />
        <View style={[modal.sheet, { maxHeight: '92%', paddingBottom: 0 }]}>
          <ScrollView
            bounces={false}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 40 }}
          >
            <View style={modal.handle} />

            <View style={hist.headerRow}>
              <View style={hist.avatar}>
                <Text style={hist.avatarText}>{getInitials(cliente.nome)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={hist.nome}>{cliente.nome}</Text>
                {cliente.vip && (
                  <View style={hist.vipBadge}>
                    <Text style={hist.vipText}>VIP</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={hist.resumoRow}>
              <View style={hist.resumoCell}>
                <Text style={hist.resumoVal}>{totalVisitas}</Text>
                <Text style={hist.resumoLbl}>visitas</Text>
              </View>
              <View style={hist.resumoDiv} />
              <View style={hist.resumoCell}>
                <Text style={hist.resumoVal}>{formatMoeda(valorTotal)}</Text>
                <Text style={hist.resumoLbl}>total gasto</Text>
              </View>
              <View style={hist.resumoDiv} />
              <View style={hist.resumoCell}>
                <Text style={hist.resumoVal}>{ultimaVisita ? formatDtBrief(ultimaVisita) : '—'}</Text>
                <Text style={hist.resumoLbl}>última visita</Text>
              </View>
            </View>

            {topServicos.length > 0 && (
              <>
                <Text style={hist.sectionLabel}>SERVIÇOS MAIS FEITOS</Text>
                <View style={hist.card}>
                  {topServicos.map(([nome, count], i) => (
                    <View key={i}>
                      {i > 0 && <View style={hist.divider} />}
                      <View style={hist.svcRow}>
                        <Text style={hist.svcNome} numberOfLines={1}>{nome}</Text>
                        <Text style={hist.svcCount}>{count}×</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </>
            )}

            <Text style={hist.sectionLabel}>HISTÓRICO</Text>
            {loading ? (
              <ActivityIndicator color="#A8235A" style={{ marginTop: 20 }} />
            ) : agendamentos.length === 0 ? (
              <Text style={hist.semDados}>Nenhum atendimento registrado.</Text>
            ) : (
              <View style={hist.card}>
                {agendamentos.map((a, i) => (
                  <View key={a.id}>
                    {i > 0 && <View style={hist.divider} />}
                    <View style={hist.agRow}>
                      <View style={[hist.statusDot, { backgroundColor: STATUS_COLOR[a.status] ?? '#6B7280' }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={hist.agServico} numberOfLines={1}>{a.servicos?.nome ?? '—'}</Text>
                        <Text style={hist.agData}>{formatDtBrief(a.data_hora)}</Text>
                      </View>
                      <Text style={hist.agValor}>{formatMoeda(a.valor)}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            <View style={hist.btnRow}>
              <TouchableOpacity style={hist.btnEditar} onPress={onEditar} activeOpacity={0.85}>
                <Text style={hist.btnEditarText}>Editar cliente</Text>
              </TouchableOpacity>
              <TouchableOpacity style={hist.btnFechar} onPress={onClose} activeOpacity={0.75}>
                <Text style={hist.btnFecharText}>Fechar</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const hist = StyleSheet.create({
  headerRow:  { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 14 },
  avatar:     { width: 52, height: 52, borderRadius: 26, backgroundColor: '#3D1020', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '700', color: '#E8C4A0' },
  nome:       { fontSize: 20, fontWeight: '700', color: '#FFFFFF', marginBottom: 4 },
  vipBadge:   { backgroundColor: 'rgba(232,196,160,0.14)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, alignSelf: 'flex-start', borderWidth: 1, borderColor: 'rgba(232,196,160,0.28)' },
  vipText:    { fontSize: 9, fontWeight: '800', color: '#E8C4A0', letterSpacing: 0.7 },

  resumoRow:  { flexDirection: 'row', backgroundColor: '#1A1B1E', borderRadius: 14, marginBottom: 22, overflow: 'hidden' },
  resumoCell: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  resumoDiv:  { width: 1, backgroundColor: '#2A2A2A' },
  resumoVal:  { fontSize: 13, fontWeight: '800', color: '#FFFFFF', marginBottom: 3 },
  resumoLbl:  { fontSize: 10, color: '#8A8A8E' },

  sectionLabel: { fontSize: 10, fontWeight: '700', color: '#8A8A8E', letterSpacing: 1.2, marginBottom: 8 },
  card:       { backgroundColor: '#1A1B1E', borderRadius: 12, overflow: 'hidden', marginBottom: 18 },
  divider:    { height: 1, backgroundColor: '#2A2A2A' },

  svcRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12 },
  svcNome:   { fontSize: 13, fontWeight: '500', color: '#FFFFFF', flex: 1 },
  svcCount:  { fontSize: 13, fontWeight: '700', color: '#A8235A' },

  agRow:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 11, gap: 10 },
  statusDot: { width: 7, height: 7, borderRadius: 4, flexShrink: 0 },
  agServico: { fontSize: 13, fontWeight: '500', color: '#FFFFFF' },
  agData:    { fontSize: 11, color: '#8A8A8E', marginTop: 1 },
  agValor:   { fontSize: 13, fontWeight: '700', color: '#C8C8CE', flexShrink: 0 },

  semDados:  { fontSize: 13, color: '#8A8A8E', marginBottom: 18 },

  btnRow:        { flexDirection: 'row', gap: 10, marginTop: 4 },
  btnEditar:     { flex: 2, height: 50, borderRadius: 12, backgroundColor: '#A8235A', alignItems: 'center', justifyContent: 'center' },
  btnEditarText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  btnFechar:     { flex: 1, height: 50, borderRadius: 12, borderWidth: 1, borderColor: '#3A3A3A', alignItems: 'center', justifyContent: 'center' },
  btnFecharText: { fontSize: 15, fontWeight: '600', color: '#8A8A8E' },
});

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
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (!userId) throw new Error('Usuário não autenticado.');

      const servicoFinal = servicoOpcao === 'Outro' ? servicoOutro.trim() : servicoOpcao;

      const foneDb = telefone ? `+1${telefone.replace(/\D/g, '')}` : null;

      if (foneDb) {
        const { data: existing } = await supabase
          .from('clientes')
          .select('id')
          .eq('profissional_id', userId)
          .eq('telefone', foneDb)
          .maybeSingle();
        if (existing) {
          Alert.alert('Cliente duplicada', 'Já existe uma cliente com este telefone cadastrada.');
          setSaving(false);
          return;
        }
      }

      const { error } = await supabase.from('clientes').insert({
        profissional_id:  userId,
        nome:             nome.trim(),
        telefone:         foneDb,
        servico_favorito: servicoFinal || null,
        observacoes:      observacoes.trim() || null,
      });
      if (error) throw error;

      if (foneDb) {
        const { data: profileMatch } = await supabase
          .from('profiles')
          .select('id, nome')
          .eq('telefone', foneDb)
          .maybeSingle();
        if (profileMatch) {
          await supabase.from('profiles').update({ primeira_visita: true }).eq('id', profileMatch.id);
          console.log(`[PUSH] Nova cliente: ${nome.trim()} (${foneDb}) adicionada à agenda. Notificando ${profileMatch.nome} (${profileMatch.id})`);
        }
      }

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

  const [clientes,          setClientes]          = useState([]);
  const [loading,           setLoading]           = useState(true);
  const [query,             setQuery]             = useState('');
  const [addVisible,        setAddVisible]        = useState(false);
  const [editVisible,       setEditVisible]       = useState(false);
  const [selectedCliente,   setSelectedCliente]   = useState(null);
  const [historicoVisible,  setHistoricoVisible]  = useState(false);
  const [historicoCliente,  setHistoricoCliente]  = useState(null);
  const [userId,            setUserId]            = useState(null);

  // Importar da agenda
  const [carregandoContatos, setCarregandoContatos] = useState(false);
  const [importandoContatos, setImportandoContatos] = useState(false);
  const [contatoModal,       setContatoModal]       = useState(false);
  const [todosContatos,      setTodosContatos]      = useState([]);
  const [contatoQuery,       setContatoQuery]       = useState('');
  const [selecionados,       setSelecionados]       = useState([]);

  const contatosFiltrados = useMemo(() => {
    if (!contatoQuery.trim()) return todosContatos;
    const q = contatoQuery.toLowerCase();
    return todosContatos.filter(c => c.name?.toLowerCase().includes(q));
  }, [todosContatos, contatoQuery]);

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

  const openHistorico = (cliente) => {
    setHistoricoCliente(cliente);
    setHistoricoVisible(true);
  };

  const openEdit = (cliente) => {
    setSelectedCliente(cliente);
    setEditVisible(true);
  };

  const closeEdit = () => {
    setEditVisible(false);
    setSelectedCliente(null);
  };

  async function importarDaAgenda() {
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
    setSelecionados(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }

  async function confirmarImportacao() {
    if (!userId) return;
    setContatoModal(false);
    setImportandoContatos(true);
    try {
      const selected = todosContatos.filter(c => selecionados.includes(c.id));
      const duplicados = [];
      const inseridos  = [];

      for (const c of selected) {
        const digits  = (c.phoneNumbers?.[0]?.number ?? '').replace(/\D/g, '').slice(-10);
        const foneDb  = digits ? `+1${digits}` : null;

        if (foneDb) {
          const { data: existing } = await supabase
            .from('clientes')
            .select('id')
            .eq('profissional_id', userId)
            .eq('telefone', foneDb)
            .maybeSingle();

          if (existing) {
            duplicados.push(c.name ?? '');
            continue;
          }
        }

        await supabase.from('clientes').insert({
          profissional_id: userId,
          nome:     c.name ?? 'Sem nome',
          telefone: foneDb,
        });
        inseridos.push(c.name ?? '');
      }

      await fetchClientes();

      if (duplicados.length > 0 && inseridos.length > 0) {
        Alert.alert(
          `${inseridos.length} cliente${inseridos.length !== 1 ? 's' : ''} importada${inseridos.length !== 1 ? 's' : ''}`,
          `${duplicados.length} contato${duplicados.length !== 1 ? 's' : ''} já ${duplicados.length !== 1 ? 'estavam cadastrados' : 'estava cadastrado'}.`
        );
      } else if (duplicados.length > 0) {
        Alert.alert(
          'Já cadastradas',
          duplicados.length === 1
            ? `"${duplicados[0]}" já está cadastrada.`
            : `${duplicados.length} contatos já são clientes cadastradas.`
        );
      } else if (inseridos.length > 0) {
        Alert.alert('Importação concluída', `${inseridos.length} cliente${inseridos.length !== 1 ? 's' : ''} importada${inseridos.length !== 1 ? 's' : ''} com sucesso.`);
      }
    } catch (err) {
      Alert.alert('Erro', err.message);
    } finally {
      setImportandoContatos(false);
      setSelecionados([]);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>

      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Clientes</Text>
          <Text style={styles.headerSubtitle}>Sua base em Miami, FL</Text>
        </View>
        <TouchableOpacity
          style={styles.importBtn}
          onPress={importarDaAgenda}
          disabled={carregandoContatos || importandoContatos}
          activeOpacity={0.85}
        >
          {carregandoContatos || importandoContatos
            ? <ActivityIndicator size="small" color="#A8235A" />
            : <Text style={styles.importBtnText}>Importar da agenda</Text>}
        </TouchableOpacity>
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
              onPress={() => openHistorico(c)}
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

      <ClienteHistoricoModal
        visible={historicoVisible}
        cliente={historicoCliente}
        userId={userId}
        onClose={() => setHistoricoVisible(false)}
        onEditar={() => {
          setHistoricoVisible(false);
          setTimeout(() => openEdit(historicoCliente), 320);
        }}
      />

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
              onPress={confirmarImportacao}
              disabled={selecionados.length === 0}
              activeOpacity={0.85}
            >
              <Text style={ctStyles.btnConfirmarText}>Importar ({selecionados.length})</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

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

    header: { paddingHorizontal: 20, paddingTop: 28, marginBottom: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    headerTitle:    { fontSize: 28, fontWeight: '700', color: text, marginBottom: 3 },
    headerSubtitle: { fontSize: 13, fontWeight: '400', color: sub },

    importBtn: {
      borderWidth: 1.5, borderColor: '#A8235A', borderRadius: 20,
      paddingHorizontal: 14, paddingVertical: 8,
      flexDirection: 'row', alignItems: 'center', gap: 6,
    },
    importBtnText: { fontSize: 13, fontWeight: '700', color: '#A8235A' },

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

// ─── Contacts picker modal styles ─────────────────────────────────────────────

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
  checkMark:     { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },
  nome:          { fontSize: 15, fontWeight: '600', color: '#FFFFFF', marginBottom: 2 },
  fone:          { fontSize: 12, fontWeight: '400', color: '#6B4A58' },
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
  btnCancelarText:  { fontSize: 15, fontWeight: '600', color: '#8A8A8E' },
  btnConfirmar: {
    flex: 2, height: 50, borderRadius: 12,
    backgroundColor: '#A8235A',
    alignItems: 'center', justifyContent: 'center',
  },
  btnConfirmarText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});
