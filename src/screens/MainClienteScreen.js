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

const DEFAULT_HORARIO_PROF = {
  dias: ['seg', 'ter', 'qua', 'qui', 'sex'],
  inicio: '08:00', fim: '17:00',
  almocoInicio: '12:00', almocoFim: '13:00',
};

const DIA_KEYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];

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

function formatDiaSlot(date) {
  return date.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' });
}

function isFuturo(iso) {
  return new Date(iso) > new Date();
}

function toMins(str) {
  const [h, m] = (str || '0:0').split(':').map(Number);
  return h * 60 + m;
}

function pad(n) { return String(n).padStart(2, '0'); }

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

// Calcula o próximo slot livre (≥60 min) nos próximos 7 dias usando horário padrão
async function calcProximoSlot(profId) {
  const now = new Date();
  const em7 = new Date(now);
  em7.setDate(em7.getDate() + 7);

  const { data: ags } = await supabase
    .from('agendamentos')
    .select('data_hora, servico:servicos(duracao_minutos)')
    .eq('profissional_id', profId)
    .neq('status', 'cancelado')
    .gte('data_hora', `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}T00:00:00`)
    .lte('data_hora', `${em7.getFullYear()}-${pad(em7.getMonth()+1)}-${pad(em7.getDate())}T23:59:59`);

  const byDate = {};
  for (const a of ags ?? []) {
    const dt  = new Date(a.data_hora);
    const key = dt.toISOString().slice(0, 10);
    if (!byDate[key]) byDate[key] = [];
    byDate[key].push({ dt, dur: a.servico?.duracao_minutos ?? 60 });
  }

  const workStart = toMins(DEFAULT_HORARIO_PROF.inicio);
  const workEnd   = toMins(DEFAULT_HORARIO_PROF.fim);
  const almInicio = toMins(DEFAULT_HORARIO_PROF.almocoInicio);
  const almFim    = toMins(DEFAULT_HORARIO_PROF.almocoFim);

  for (let offset = 0; offset < 7; offset++) {
    const d = new Date(now);
    d.setDate(d.getDate() + offset);
    if (!DEFAULT_HORARIO_PROF.dias.includes(DIA_KEYS[d.getDay()])) continue;

    const dateStr = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
    const busy = [{ s: almInicio, e: almFim }];
    for (const { dt: adt, dur } of byDate[dateStr] ?? []) {
      const s = adt.getHours() * 60 + adt.getMinutes();
      busy.push({ s, e: s + dur });
    }
    busy.sort((a, b) => a.s - b.s);

    const merged = [];
    for (const iv of busy) {
      if (!merged.length || iv.s > merged[merged.length - 1].e) merged.push({ ...iv });
      else merged[merged.length - 1].e = Math.max(merged[merged.length - 1].e, iv.e);
    }

    let cur = workStart;
    if (offset === 0) cur = Math.max(cur, now.getHours() * 60 + now.getMinutes());

    for (const { s, e } of [...merged, { s: workEnd, e: workEnd }]) {
      if (s - cur >= 60) {
        const slot = new Date(d);
        slot.setHours(Math.floor(cur / 60), cur % 60, 0, 0);
        return slot;
      }
      cur = Math.max(cur, e);
    }
  }
  return null;
}

function calcSlotsProf(agendamentos) {
  if (!DEFAULT_HORARIO_PROF.dias.includes(DIA_KEYS[new Date().getDay()])) return null;
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
  const [uid,            setUid]            = useState(null);
  const [nome,           setNome]           = useState('');
  const [telefone,       setTelefone]       = useState('');
  const [primeiraVisita, setPrimeiraVisita] = useState(false);
  const [profBoas,       setProfBoas]       = useState(null);
  const [proximo,        setProximo]        = useState(null);
  const [historico,      setHistorico]      = useState([]);
  const [profs,          setProfs]          = useState([]);
  const [conexoesProf,   setConexoesProf]   = useState([]);
  const [nomeProfFav,    setNomeProfFav]    = useState('');
  const [filaSet,        setFilaSet]        = useState(new Set());
  const [semAgendamentos, setSemAgendamentos] = useState(false);
  const [loading,        setLoading]        = useState(true);

  useFocusEffect(useCallback(() => {
    let active = true;
    (async () => {
      const { data: authData } = await supabase.auth.getUser();
      const uidLocal = authData?.user?.id;
      if (!uidLocal) return;
      if (active) setUid(uidLocal);

      const [profileRes, filaRes] = await Promise.all([
        supabase.from('profiles').select('nome, telefone, primeira_visita').eq('id', uidLocal).single(),
        supabase.from('fila_espera').select('profissional_id').eq('cliente_id', uidLocal),
      ]);

      const profile = profileRes.data;
      if (active) {
        setNome(profile?.nome ?? '');
        setTelefone(profile?.telefone ?? '');
        setPrimeiraVisita(profile?.primeira_visita ?? false);
        setFilaSet(new Set((filaRes.data ?? []).map(r => r.profissional_id)));
      }

      const todos = await fetchAgendamentosCliente(uidLocal);
      if (!active) return;

      // Aviso telefone divergente
      if (todos.length === 0 && profile?.telefone) {
        setSemAgendamentos(true);
        setLoading(false);
        return;
      }
      setSemAgendamentos(false);

      const agora = new Date();
      const futuros = todos
        .filter(a => new Date(a.data_hora) >= agora && a.status !== 'cancelado')
        .sort((a, b) => new Date(a.data_hora) - new Date(b.data_hora));
      setProximo(futuros[0] ?? null);
      setHistorico(todos.filter(a => a.status === 'finalizado').slice(0, 3));

      // Build profs com ID + próximo slot
      const profMap = {};
      todos.forEach(a => {
        if (a.profissional_id && a.profissional?.nome && !profMap[a.profissional_id]) {
          profMap[a.profissional_id] = { id: a.profissional_id, nome: a.profissional.nome, proximoSlot: null };
        }
      });
      const profsList = Object.values(profMap);
      await Promise.all(profsList.map(async p => { p.proximoSlot = await calcProximoSlot(p.id); }));
      if (active) setProfs(profsList);

      // Profissional favorita — agenda cheia → conexões
      const profFavId   = todos[0]?.profissional_id ?? null;
      const profFavNome = todos[0]?.profissional?.nome ?? '';
      if (active) setNomeProfFav(profFavNome);

      if (profFavId) {
        const hoje = `${agora.getFullYear()}-${pad(agora.getMonth()+1)}-${pad(agora.getDate())}`;
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
          const conList = conRows ?? [];
          await Promise.all(conList.map(async c => {
            if (c.conexao?.id) c.proximoSlot = await calcProximoSlot(c.conexao.id);
          }));
          if (active) setConexoesProf(conList);
        } else {
          if (active) setConexoesProf([]);
        }
      }

      // Card boas-vindas — busca profissional que adicionou
      if (profile?.primeira_visita && profile?.telefone) {
        const { data: clRow } = await supabase
          .from('clientes')
          .select('profissional_id')
          .eq('telefone', profile.telefone)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (clRow?.profissional_id) {
          const { data: profData } = await supabase
            .from('profiles')
            .select('nome, cidade, estado')
            .eq('id', clRow.profissional_id)
            .single();
          if (active) setProfBoas(profData ?? null);
        }
      }

      if (active) setLoading(false);
    })();
    return () => { active = false; };
  }, []));

  async function fecharBoasVindas() {
    setPrimeiraVisita(false);
    if (uid) await supabase.from('profiles').update({ primeira_visita: false }).eq('id', uid);
  }

  async function entrarFila(profId) {
    if (!uid) return;
    try {
      await supabase.from('fila_espera').insert({ cliente_id: uid, profissional_id: profId });
      setFilaSet(prev => new Set([...prev, profId]));
    } catch (err) {
      Alert.alert('Erro', err.message);
    }
  }

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

        {/* Card boas-vindas */}
        {primeiraVisita && profBoas && (
          <View style={styles.boasVindasCard}>
            <TouchableOpacity style={styles.boasVindasClose} onPress={fecharBoasVindas} activeOpacity={0.7}>
              <Text style={styles.boasVindasCloseText}>×</Text>
            </TouchableOpacity>
            <View style={styles.boasVindasAvatar}>
              <Text style={styles.boasVindasAvatarText}>{profBoas.nome?.[0]?.toUpperCase() ?? '?'}</Text>
            </View>
            <Text style={styles.boasVindasTitle}>{profBoas.nome} te adicionou como cliente</Text>
            <Text style={styles.boasVindasSub}>
              Você agora faz parte da agenda de {profBoas.nome}. Agende seu primeiro horário.
            </Text>
            {(profBoas.cidade || profBoas.estado) && (
              <Text style={styles.boasVindasLocal}>
                {[profBoas.cidade, profBoas.estado].filter(Boolean).join(', ')}
              </Text>
            )}
            <TouchableOpacity
              style={styles.boasVindasBtn}
              onPress={() => { fecharBoasVindas(); navigation.navigate('Main', { screen: 'Agenda' }); }}
              activeOpacity={0.85}
            >
              <Text style={styles.boasVindasBtnText}>Ver horários disponíveis</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Aviso telefone divergente */}
        {semAgendamentos && telefone ? (
          <Card title="Atenção">
            <Text style={styles.avisoText}>
              Não encontramos seus agendamentos. Confirme com sua profissional se o telefone cadastrado está correto.
            </Text>
            <Text style={styles.avisoFone}>{telefone}</Text>
            <TouchableOpacity
              style={styles.atualizarFoneBtn}
              onPress={() => navigation.navigate('Perfil')}
              activeOpacity={0.85}
            >
              <Text style={styles.atualizarFoneBtnText}>Atualizar meu telefone</Text>
            </TouchableOpacity>
          </Card>
        ) : (
          <>
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
                  <View key={p.id} style={[styles.profRow, i > 0 && styles.profRowBorder]}>
                    <View style={styles.profAvatar}>
                      <Text style={styles.profAvatarText}>{p.nome[0]?.toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.profNome}>{p.nome}</Text>
                      {p.proximoSlot ? (
                        <Text style={styles.proximoSlotText}>
                          Próximo horário: {formatDiaSlot(p.proximoSlot)} às {formatHora(p.proximoSlot.toISOString())}
                        </Text>
                      ) : (
                        <View>
                          <Text style={styles.agendaCheiaText}>Agenda cheia</Text>
                          {!filaSet.has(p.id) ? (
                            <TouchableOpacity onPress={() => entrarFila(p.id)} activeOpacity={0.8}>
                              <Text style={styles.avisarText}>Me avise quando abrir</Text>
                            </TouchableOpacity>
                          ) : (
                            <Text style={styles.naFilaText}>Você será avisada quando abrir</Text>
                          )}
                        </View>
                      )}
                    </View>
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
                {conexoesProf.slice(0, 3).map((c, i) => (
                  <View key={c.id} style={[styles.profRow, i > 0 && styles.profRowBorder]}>
                    <View style={styles.profAvatar}>
                      <Text style={styles.profAvatarText}>{c.conexao?.nome?.[0]?.toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.profNome}>{c.conexao?.nome}</Text>
                      {c.conexao?.cidade
                        ? <Text style={styles.conexaoCidade}>{c.conexao.cidade}</Text>
                        : null}
                      {c.proximoSlot ? (
                        <Text style={styles.proximoSlotText}>
                          Próximo horário: {formatDiaSlot(c.proximoSlot)} às {formatHora(c.proximoSlot.toISOString())}
                        </Text>
                      ) : (
                        <Text style={styles.agendaCheiaText}>Agenda cheia</Text>
                      )}
                    </View>
                  </View>
                ))}
                <TouchableOpacity
                  style={styles.conexaoBtn}
                  onPress={() => navigation.navigate('Main', { screen: 'Agenda' })}
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
          </>
        )}

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

        {/* Pagamento placeholder */}
        <View style={styles.pagamentoCard}>
          <Text style={styles.pagamentoTitle}>Pagamento</Text>
          <Text style={styles.pagamentoText}>
            Em breve você poderá cadastrar seu cartão e pagar seus agendamentos diretamente pelo AUREN.
          </Text>
        </View>

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

  greeting:  { fontSize: 24, fontWeight: '800', color: '#FFFFFF', marginBottom: 20, marginTop: 8 },

  // Card de boas-vindas
  boasVindasCard: {
    backgroundColor: '#1A1B1E', borderRadius: 20, padding: 20, marginBottom: 16,
    borderWidth: 1.5, borderColor: '#A8235A', position: 'relative',
  },
  boasVindasClose:     { position: 'absolute', top: 12, right: 16, padding: 4 },
  boasVindasCloseText: { fontSize: 22, color: '#6B4A58', fontWeight: '400' },
  boasVindasAvatar:    { width: 52, height: 52, borderRadius: 26, backgroundColor: '#3D1020', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  boasVindasAvatarText:{ fontSize: 20, fontWeight: '700', color: '#E8C4A0' },
  boasVindasTitle:     { fontSize: 16, fontWeight: '700', color: '#FFFFFF', marginBottom: 6 },
  boasVindasSub:       { fontSize: 13, fontWeight: '400', color: '#C9A8B6', lineHeight: 20, marginBottom: 8 },
  boasVindasLocal:     { fontSize: 12, fontWeight: '500', color: '#8A8A8E', marginBottom: 16 },
  boasVindasBtn:       { height: 46, borderRadius: 12, backgroundColor: '#A8235A', alignItems: 'center', justifyContent: 'center' },
  boasVindasBtnText:   { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },

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
  profNome:      { fontSize: 14, fontWeight: '600', color: '#FFFFFF', marginBottom: 2 },

  // Slot / agenda cheia
  proximoSlotText: { fontSize: 12, fontWeight: '500', color: '#10B981', marginTop: 2 },
  agendaCheiaText: { fontSize: 12, fontWeight: '500', color: '#F59E0B', marginTop: 2 },
  avisarText:      { fontSize: 12, fontWeight: '600', color: '#A8235A', marginTop: 4 },
  naFilaText:      { fontSize: 12, fontWeight: '400', color: '#8A8A8E', marginTop: 4 },

  // Aviso telefone divergente
  avisoText:        { fontSize: 13, fontWeight: '400', color: '#C9A8B6', lineHeight: 20, marginBottom: 10 },
  avisoFone:        { fontSize: 15, fontWeight: '700', color: '#FFFFFF', marginBottom: 14 },
  atualizarFoneBtn: { height: 44, borderRadius: 10, backgroundColor: '#A8235A', alignItems: 'center', justifyContent: 'center' },
  atualizarFoneBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },

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

  // Pagamento placeholder
  pagamentoCard: {
    backgroundColor: INPUT_BG, borderRadius: 16, padding: 18, marginTop: 20,
    borderWidth: 1, borderColor: '#2A2A2A',
  },
  pagamentoTitle: { fontSize: 13, fontWeight: '700', color: '#6B4A58', letterSpacing: 0.8, marginBottom: 10, textTransform: 'uppercase' },
  pagamentoText:  { fontSize: 13, fontWeight: '400', color: '#6B4A58', lineHeight: 20 },

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
