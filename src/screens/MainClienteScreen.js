import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';

const Tab = createBottomTabNavigator();

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_CFG = {
  pendente:   { label: 'Pendente',   color: '#F59E0B' },
  confirmado: { label: 'Confirmado', color: '#10B981' },
  finalizado: { label: 'Finalizado', color: '#6B7280' },
  cancelado:  { label: 'Cancelado',  color: '#EF4444' },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatData(iso) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    weekday: 'short', day: '2-digit', month: 'short',
  });
}

function formatHora(iso) {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
}

function isFuturo(iso) {
  return new Date(iso) > new Date();
}

// Vincula o usuário logado a agendamentos via clientes.telefone == profiles.telefone
async function fetchAgendamentosCliente(uid) {
  const { data: prof } = await supabase
    .from('profiles')
    .select('telefone')
    .eq('id', uid)
    .single();
  if (!prof?.telefone) return [];

  const { data: clRows } = await supabase
    .from('clientes')
    .select('id')
    .eq('telefone', prof.telefone);
  const ids = clRows?.map(r => r.id) ?? [];
  if (!ids.length) return [];

  const { data } = await supabase
    .from('agendamentos')
    .select(`
      id, data_hora, status, valor, profissional_id,
      servico:servicos(nome, duracao_minutos),
      profissional:profiles!profissional_id(nome)
    `)
    .in('cliente_id', ids)
    .order('data_hora', { ascending: false });
  return data ?? [];
}

// ── Slot calculation helpers (usa horário padrão quando profissional não configurou) ──

const DEFAULT_HORARIO_PROF = {
  dias: ['seg', 'ter', 'qua', 'qui', 'sex'],
  inicio: '08:00', fim: '17:00',
  almocoInicio: '12:00', almocoFim: '13:00',
};

function toMins(str) {
  const [h, m] = (str || '0:0').split(':').map(Number);
  return h * 60 + m;
}

function calcSlotsProf(agendamentos) {
  const weekDayMap = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
  if (!DEFAULT_HORARIO_PROF.dias.includes(weekDayMap[new Date().getDay()])) return null;
  const workStart = toMins(DEFAULT_HORARIO_PROF.inicio);
  const workEnd   = toMins(DEFAULT_HORARIO_PROF.fim);
  const busy = [{ s: toMins(DEFAULT_HORARIO_PROF.almocoInicio), e: toMins(DEFAULT_HORARIO_PROF.almocoFim) }];
  for (const a of agendamentos) {
    if (a.status === 'cancelado') continue;
    const d = new Date(a.data_hora);
    busy.push({ s: d.getHours() * 60 + d.getMinutes(), e: d.getHours() * 60 + d.getMinutes() + (a.servico?.duracao_minutos ?? 60) });
  }
  busy.sort((a, b) => a.s - b.s);
  const merged = [];
  for (const iv of busy) {
    if (!merged.length || iv.s > merged[merged.length - 1].e) merged.push({ ...iv });
    else merged[merged.length - 1].e = Math.max(merged[merged.length - 1].e, iv.e);
  }
  let slots = 0, cur = workStart;
  for (const { s, e } of merged) {
    const gapEnd = Math.min(s, workEnd);
    if (gapEnd > cur) slots += Math.floor((gapEnd - cur) / 90);
    cur = Math.max(cur, Math.min(e, workEnd));
  }
  if (workEnd > cur) slots += Math.floor((workEnd - cur) / 90);
  return slots;
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function Card({ title, children }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {children}
    </View>
  );
}

function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.pendente;
  return (
    <View style={[styles.statusBadge, { backgroundColor: cfg.color + '22' }]}>
      <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

// ── ClienteHomeScreen ─────────────────────────────────────────────────────────

function ClienteHomeScreen({ navigation }) {
  const [nome,        setNome]        = useState('');
  const [proximo,     setProximo]     = useState(null);
  const [historico,   setHistorico]   = useState([]);
  const [profs,       setProfs]       = useState([]);
  const [conexoesProf, setConexoesProf] = useState([]);
  const [nomeProfFav,  setNomeProfFav]  = useState('');
  const [loading,     setLoading]     = useState(true);

  useFocusEffect(useCallback(() => {
    let active = true;
    (async () => {
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData?.user?.id;
      if (!uid) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('nome')
        .eq('id', uid)
        .single();
      if (active) setNome(profile?.nome ?? '');

      const todos = await fetchAgendamentosCliente(uid);
      if (!active) return;

      const agora = new Date();

      const futuros = todos
        .filter(a => new Date(a.data_hora) >= agora && a.status !== 'cancelado')
        .sort((a, b) => new Date(a.data_hora) - new Date(b.data_hora));
      setProximo(futuros[0] ?? null);

      setHistorico(todos.filter(a => a.status === 'finalizado').slice(0, 3));

      const profMap = {};
      todos.forEach(a => {
        if (a.profissional?.nome) profMap[a.profissional.nome] = true;
      });
      setProfs(Object.keys(profMap));

      // Profissional favorita = a do agendamento mais recente
      const profFavId   = todos[0]?.profissional_id ?? null;
      const profFavNome = todos[0]?.profissional?.nome ?? '';
      if (active) setNomeProfFav(profFavNome);

      if (profFavId) {
        const now    = new Date();
        const pad    = n => String(n).padStart(2, '0');
        const hoje   = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
        const { data: agHoje } = await supabase
          .from('agendamentos')
          .select('data_hora, status, servico:servicos(duracao_minutos)')
          .eq('profissional_id', profFavId)
          .gte('data_hora', `${hoje}T00:00:00`)
          .lte('data_hora', `${hoje}T23:59:59`);
        const slotsProf = calcSlotsProf(agHoje ?? []);
        if (slotsProf === 0) {
          const { data: conRows } = await supabase
            .from('conexoes')
            .select('*, conexao:profiles!conexao_id(id, nome, cidade)')
            .eq('profissional_id', profFavId)
            .eq('status', 'aceita');
          if (active) setConexoesProf(conRows ?? []);
        } else {
          if (active) setConexoesProf([]);
        }
      }

      if (active) setLoading(false);
    })();
    return () => { active = false; };
  }, []));

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.centered}><ActivityIndicator color="#A8235A" size="large" /></View>
      </SafeAreaView>
    );
  }

  const primeiroNome = nome.split(' ')[0];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <Text style={styles.greeting}>Olá, {primeiroNome || 'bem-vinda'} 👋</Text>

        {/* Próximo agendamento */}
        <Card title="Próximo Agendamento">
          {proximo ? (
            <View>
              <View style={styles.proxRow}>
                <Text style={styles.proxServico}>{proximo.servico?.nome ?? 'Serviço'}</Text>
                <StatusBadge status={proximo.status} />
              </View>
              <Text style={styles.proxProf}>com {proximo.profissional?.nome ?? '—'}</Text>
              <Text style={styles.proxData}>
                {formatData(proximo.data_hora)}{'  ·  '}{formatHora(proximo.data_hora)}
              </Text>
            </View>
          ) : (
            <Text style={styles.emptyText}>Nenhum agendamento próximo</Text>
          )}
        </Card>

        {/* Minhas Profissionais */}
        <Card title="Minhas Profissionais">
          {profs.length > 0 ? (
            profs.map((p, i) => (
              <View key={p} style={[styles.profRow, i > 0 && styles.profRowBorder]}>
                <View style={styles.profAvatar}>
                  <Text style={styles.profAvatarText}>{p[0]?.toUpperCase()}</Text>
                </View>
                <Text style={styles.profNome}>{p}</Text>
              </View>
            ))
          ) : (
            <View>
              <Text style={styles.emptyText}>Você ainda não tem agendamentos.</Text>
              <Text style={styles.ctaText}>
                Peça à sua profissional para te cadastrar no AUREN.
              </Text>
            </View>
          )}
        </Card>

        {/* Conexões da profissional favorita (agenda cheia) */}
        {conexoesProf.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Agenda cheia</Text>
            <Text style={styles.conexaoIntro}>
              A agenda de {nomeProfFav} está cheia. Veja profissionais de confiança dela:
            </Text>
            {conexoesProf.slice(0, 2).map((c, i) => (
              <View key={c.id} style={[styles.profRow, i > 0 && styles.profRowBorder]}>
                <View style={styles.profAvatar}>
                  <Text style={styles.profAvatarText}>{c.conexao?.nome?.[0]?.toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.profNome}>{c.conexao?.nome}</Text>
                  {c.conexao?.cidade
                    ? <Text style={styles.conexaoCidade}>{c.conexao.cidade}</Text>
                    : null}
                </View>
              </View>
            ))}
            <TouchableOpacity
              style={styles.conexaoBtn}
              onPress={() => navigation.navigate('Agenda')}
              activeOpacity={0.85}
            >
              <Text style={styles.conexaoBtnText}>Agendar com conexão</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Histórico */}
        <Card title="Histórico">
          {historico.length > 0 ? (
            historico.map((a, i) => (
              <View key={a.id} style={[styles.histRow, i > 0 && styles.histRowBorder]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.histServico}>{a.servico?.nome ?? 'Serviço'}</Text>
                  <Text style={styles.histMeta}>
                    {formatData(a.data_hora)}{'  ·  '}{a.profissional?.nome ?? '—'}
                  </Text>
                </View>
                <StatusBadge status={a.status} />
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>Nenhum atendimento realizado ainda.</Text>
          )}
        </Card>

      </ScrollView>
    </SafeAreaView>
  );
}

// ── ClienteAgendaScreen ───────────────────────────────────────────────────────

function ClienteAgendaScreen() {
  const [agendamentos, setAgendamentos] = useState([]);
  const [loading,      setLoading]      = useState(true);

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data: authData } = await supabase.auth.getUser();
    const uid = authData?.user?.id;
    if (uid) setAgendamentos(await fetchAgendamentosCliente(uid));
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { carregar(); }, [carregar]));

  const cancelar = (id) => {
    Alert.alert('Cancelar agendamento', 'Tem certeza que deseja cancelar?', [
      { text: 'Não', style: 'cancel' },
      {
        text: 'Sim, cancelar', style: 'destructive',
        onPress: async () => {
          await supabase.from('agendamentos').update({ status: 'cancelado' }).eq('id', id);
          carregar();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Text style={styles.screenTitle}>Minha Agenda</Text>

      {loading ? (
        <View style={styles.centered}><ActivityIndicator color="#A8235A" size="large" /></View>
      ) : agendamentos.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyIcon}>📅</Text>
          <Text style={styles.emptyTitle}>Nenhum agendamento</Text>
          <Text style={styles.emptySubtitle}>
            Seus agendamentos aparecerão aqui quando uma profissional te cadastrar no AUREN.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {agendamentos.map((a, i) => {
            const podeCancel = isFuturo(a.data_hora) && a.status !== 'cancelado' && a.status !== 'finalizado';
            return (
              <View key={a.id} style={[styles.agendaCard, i === 0 && { marginTop: 0 }]}>
                <View style={styles.agendaHeader}>
                  <Text style={styles.agendaServico}>{a.servico?.nome ?? 'Serviço'}</Text>
                  <StatusBadge status={a.status} />
                </View>
                <Text style={styles.agendaProf}>com {a.profissional?.nome ?? '—'}</Text>
                <Text style={styles.agendaData}>
                  {formatData(a.data_hora)}{'  ·  '}{formatHora(a.data_hora)}
                </Text>
                {podeCancel && (
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => cancelar(a.id)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.cancelBtnText}>Cancelar agendamento</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ── ClientePerfilScreen ───────────────────────────────────────────────────────

function ClientePerfilScreen({ navigation }) {
  const [nome,     setNome]     = useState('');
  const [email,    setEmail]    = useState('');
  const [telefone, setTelefone] = useState('');
  const [editando, setEditando] = useState(false);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [uid,      setUid]      = useState(null);

  useFocusEffect(useCallback(() => {
    (async () => {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (!user) return;
      setUid(user.id);
      setEmail(user.email ?? '');
      const { data: prof } = await supabase
        .from('profiles')
        .select('nome, telefone')
        .eq('id', user.id)
        .single();
      setNome(prof?.nome ?? '');
      setTelefone(prof?.telefone ?? '');
      setLoading(false);
    })();
  }, []));

  const salvar = async () => {
    if (!nome.trim()) { Alert.alert('Campo obrigatório', 'Informe seu nome.'); return; }
    setSaving(true);
    await supabase.from('profiles').update({ nome: nome.trim(), telefone }).eq('id', uid);
    setSaving(false);
    setEditando(false);
  };

  const sair = () => {
    Alert.alert('Sair', 'Deseja sair da sua conta?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair', style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
          navigation.replace('Welcome');
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.centered}><ActivityIndicator color="#A8235A" size="large" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.screenTitle}>Meu Perfil</Text>

        <View style={styles.card}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{nome?.[0]?.toUpperCase() ?? '?'}</Text>
          </View>

          <Text style={styles.fieldLabel}>Nome</Text>
          {editando ? (
            <TextInput
              style={styles.fieldInput}
              value={nome}
              onChangeText={setNome}
              autoCapitalize="words"
              placeholderTextColor="#6B4A58"
            />
          ) : (
            <Text style={styles.fieldValue}>{nome || '—'}</Text>
          )}

          <Text style={styles.fieldLabel}>E-mail</Text>
          <Text style={[styles.fieldValue, styles.fieldReadonly]}>{email || '—'}</Text>

          <Text style={styles.fieldLabel}>Telefone</Text>
          {editando ? (
            <TextInput
              style={styles.fieldInput}
              value={telefone}
              onChangeText={setTelefone}
              keyboardType="phone-pad"
              placeholderTextColor="#6B4A58"
            />
          ) : (
            <Text style={styles.fieldValue}>{telefone || '—'}</Text>
          )}
        </View>

        {editando ? (
          <View style={styles.editBtns}>
            <TouchableOpacity
              style={[styles.primaryBtn, saving && { opacity: 0.6 }]}
              onPress={salvar}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.primaryBtnText}>Salvar</Text>}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.outlineBtn}
              onPress={() => setEditando(false)}
              activeOpacity={0.75}
            >
              <Text style={styles.outlineBtnText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.outlineBtn}
            onPress={() => setEditando(true)}
            activeOpacity={0.85}
          >
            <Text style={styles.outlineBtnText}>Editar dados</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.sairBtn} onPress={sair} activeOpacity={0.7}>
          <Text style={styles.sairBtnText}>Sair</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Tab Navigator ─────────────────────────────────────────────────────────────

export default function MainClienteScreen() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#1A1B1E',
          borderTopColor: 'transparent',
          borderTopWidth: 1,
        },
        tabBarActiveTintColor:   '#A8235A',
        tabBarInactiveTintColor: '#B09AA8',
      }}
    >
      <Tab.Screen name="Início" component={ClienteHomeScreen}   />
      <Tab.Screen name="Agenda" component={ClienteAgendaScreen} />
      <Tab.Screen name="Perfil" component={ClientePerfilScreen} />
    </Tab.Navigator>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const INPUT_BG = '#1A1B1E';

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: '#0E0F11' },
  scroll:  { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 },
  centered:{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },

  // Home
  greeting:  { fontSize: 24, fontWeight: '800', color: '#FFFFFF', marginBottom: 20, marginTop: 8 },

  // Card
  card:      { backgroundColor: INPUT_BG, borderRadius: 16, padding: 18, marginBottom: 16 },
  cardTitle: { fontSize: 13, fontWeight: '700', color: '#A8235A', letterSpacing: 0.8, marginBottom: 14, textTransform: 'uppercase' },

  // Status badge
  statusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  statusText:  { fontSize: 11, fontWeight: '700' },

  // Próximo agendamento
  proxRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  proxServico:{ fontSize: 16, fontWeight: '700', color: '#FFFFFF', flex: 1, marginRight: 8 },
  proxProf:   { fontSize: 13, fontWeight: '400', color: '#C9A8B6', marginBottom: 4 },
  proxData:   { fontSize: 13, fontWeight: '600', color: '#8A8A8E' },

  // Profissionais
  profRow:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  profRowBorder: { borderTopWidth: 1, borderTopColor: '#2A2A30' },
  profAvatar:    { width: 36, height: 36, borderRadius: 18, backgroundColor: '#A8235A22', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  profAvatarText:{ fontSize: 16, fontWeight: '700', color: '#A8235A' },
  profNome:      { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },

  // Histórico
  histRow:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  histRowBorder: { borderTopWidth: 1, borderTopColor: '#2A2A30' },
  histServico:   { fontSize: 14, fontWeight: '600', color: '#FFFFFF', marginBottom: 3 },
  histMeta:      { fontSize: 12, fontWeight: '400', color: '#8A8A8E' },

  // Empty states
  emptyText:    { fontSize: 14, fontWeight: '400', color: '#6B4A58', textAlign: 'center' },
  ctaText:      { fontSize: 13, fontWeight: '500', color: '#A8235A', textAlign: 'center', marginTop: 8, lineHeight: 20 },
  emptyIcon:    { fontSize: 48, marginBottom: 16 },
  emptyTitle:   { fontSize: 18, fontWeight: '700', color: '#FFFFFF', marginBottom: 10, textAlign: 'center' },
  emptySubtitle:{ fontSize: 14, fontWeight: '400', color: '#6B4A58', textAlign: 'center', lineHeight: 22 },

  // Agenda screen
  screenTitle: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', marginBottom: 16, paddingHorizontal: 20, paddingTop: 12 },
  agendaCard:  { backgroundColor: INPUT_BG, borderRadius: 16, padding: 18, marginHorizontal: 20, marginBottom: 12 },
  agendaHeader:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  agendaServico:{ fontSize: 15, fontWeight: '700', color: '#FFFFFF', flex: 1, marginRight: 8 },
  agendaProf:  { fontSize: 13, fontWeight: '400', color: '#C9A8B6', marginBottom: 4 },
  agendaData:  { fontSize: 13, fontWeight: '600', color: '#8A8A8E' },
  cancelBtn:   { marginTop: 14, borderWidth: 1, borderColor: '#EF4444', borderRadius: 10, paddingVertical: 9, alignItems: 'center' },
  cancelBtnText:{ fontSize: 13, fontWeight: '700', color: '#EF4444' },

  // Perfil screen
  avatarCircle:{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#A8235A22', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 24 },
  avatarText:  { fontSize: 30, fontWeight: '800', color: '#A8235A' },
  fieldLabel:  { fontSize: 11, fontWeight: '600', color: '#6B4A58', letterSpacing: 0.6, marginBottom: 6, marginTop: 14 },
  fieldValue:  { fontSize: 15, fontWeight: '400', color: '#FFFFFF', paddingVertical: 4 },
  fieldReadonly:{ color: '#6B4A58' },
  fieldInput:  { backgroundColor: '#0E0F11', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#FFFFFF', marginBottom: 4 },

  // Buttons
  primaryBtn:     { height: 52, borderRadius: 14, backgroundColor: '#A8235A', alignItems: 'center', justifyContent: 'center', marginTop: 20, marginBottom: 10 },
  primaryBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  outlineBtn:     { height: 52, borderRadius: 14, borderWidth: 1.5, borderColor: '#A8235A', alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  outlineBtnText: { fontSize: 16, fontWeight: '700', color: '#A8235A' },
  editBtns:       { gap: 0 },
  sairBtn:        { alignItems: 'center', paddingVertical: 20, marginTop: 8 },
  sairBtnText:    { fontSize: 14, fontWeight: '600', color: '#EF4444' },

  // Conexões card
  conexaoIntro:   { fontSize: 13, fontWeight: '400', color: '#C9A8B6', marginBottom: 14, lineHeight: 20 },
  conexaoCidade:  { fontSize: 12, fontWeight: '400', color: '#6B4A58', marginTop: 2 },
  conexaoBtn:     { marginTop: 16, height: 48, borderRadius: 12, backgroundColor: '#A8235A', alignItems: 'center', justifyContent: 'center' },
  conexaoBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
});
