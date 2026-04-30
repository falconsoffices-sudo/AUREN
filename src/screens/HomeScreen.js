import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';
import { calcularNivel } from '../lib/gamificacao';
import { scheduleNotification } from '../lib/notifications';

// ─── Constants ────────────────────────────────────────────────────────────────

const NIVEL_LABELS = {
  1: 'Iniciante',
  2: 'Em Crescimento',
  3: 'Profissional',
  4: 'Expert',
  5: 'Master',
};

const STATUS_COLORS = {
  pendente:   '#F59E0B',
  confirmado: '#10B981',
  finalizado: '#6B7280',
  cancelado:  '#EF4444',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatMoeda(valor) {
  return Number(valor || 0).toLocaleString('en-US', {
    style: 'currency', currency: 'USD',
  });
}

function formatHora(dataHoraStr) {
  return new Date(dataHoraStr).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
}

// Monta strings de data local sem conversão UTC
function getDateRanges() {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const fmtDate = dt =>
    `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;

  // Dia
  const hoje        = fmtDate(now);
  const ontemDate   = new Date(now); ontemDate.setDate(now.getDate() - 1);
  const ontem       = fmtDate(ontemDate);

  // Semana: segunda → domingo
  const diaSemana      = now.getDay(); // 0=Dom
  const diasAteSegunda = diaSemana === 0 ? 6 : diaSemana - 1;
  const seg            = new Date(now); seg.setDate(now.getDate() - diasAteSegunda);
  const dom            = new Date(seg); dom.setDate(seg.getDate() + 6);
  const semanaInicio   = `${fmtDate(seg)}T00:00:00`;
  const semanaFim      = `${fmtDate(dom)}T23:59:59`;

  // Mês: dia 1 → último dia do mês
  const ultimoDia = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const mesInicio = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01T00:00:00`;
  const mesFim    = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(ultimoDia)}T23:59:59`;

  return { hoje, ontem, semanaInicio, semanaFim, mesInicio, mesFim };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProgressBar({ progress }) {
  const { isDark } = useTheme();
  return (
    <View style={{ height: 8, backgroundColor: isDark ? '#2A2A2A' : '#E6D8CF', borderRadius: 4, overflow: 'hidden' }}>
      <View style={{ height: 8, backgroundColor: '#A8235A', borderRadius: 4, width: `${Math.min(progress, 100)}%` }} />
    </View>
  );
}

function StatColumn({ label, value, meta }) {
  const { isDark } = useTheme();
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 12, fontWeight: '400', color: isDark ? '#C9A8B6' : '#6B4A58', marginBottom: 5 }}>{label}</Text>
      <Text style={{ fontSize: 22, fontWeight: '800', color: isDark ? '#F5EDE8' : '#1A0A14' }}>{value}</Text>
      {meta ? <Text style={{ fontSize: 11, fontWeight: '400', color: isDark ? '#C9A8B6' : '#6B4A58', marginTop: 3 }}>{meta}</Text> : null}
    </View>
  );
}

function AgendamentoRow({ agendamento, showDivider }) {
  const { isDark } = useTheme();
  const clienteNome = agendamento.clientes?.nome ?? 'Cliente';
  const servicoNome = agendamento.servicos?.nome ?? '—';
  const hora        = formatHora(agendamento.data_hora);
  const dotColor    = STATUS_COLORS[agendamento.status] ?? '#6B7280';

  return (
    <>
      {showDivider && <View style={{ height: 1, backgroundColor: isDark ? '#2A2A2A' : '#E6D8CF' }} />}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10 }}>
        <View style={{ width: 8, height: 8, borderRadius: 4, marginRight: 12, flexShrink: 0, backgroundColor: dotColor }} />
        <View style={{ flex: 1, marginRight: 10 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: isDark ? '#F5EDE8' : '#1A0A14' }} numberOfLines={1}>{clienteNome}</Text>
          <Text style={{ fontSize: 12, fontWeight: '400', color: isDark ? '#C9A8B6' : '#6B4A58', marginTop: 2 }} numberOfLines={1}>{servicoNome}</Text>
        </View>
        <Text style={{ fontSize: 13, fontWeight: '700', color: '#A8235A', flexShrink: 0 }}>{hora}</Text>
      </View>
    </>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

function timeToMins(str) {
  const [h, m] = (str || '0:0').split(':').map(Number);
  return h * 60 + m;
}

function calcSlotsLivres(agendamentos, horario) {
  const weekDayMap = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
  const todayKey = weekDayMap[new Date().getDay()];
  if (!horario.dias.includes(todayKey)) return 0;

  const workStart  = timeToMins(horario.inicio);
  const workEnd    = timeToMins(horario.fim);
  const busy = [{ s: timeToMins(horario.almocoInicio), e: timeToMins(horario.almocoFim) }];

  for (const a of agendamentos) {
    if (a.status === 'cancelado') continue;
    const d = new Date(a.data_hora);
    const s = d.getHours() * 60 + d.getMinutes();
    const dur = a.servicos?.duracao_minutos ?? 60;
    busy.push({ s, e: s + dur });
  }

  busy.sort((a, b) => a.s - b.s);

  const merged = [];
  for (const iv of busy) {
    if (!merged.length || iv.s > merged[merged.length - 1].e) {
      merged.push({ ...iv });
    } else {
      merged[merged.length - 1].e = Math.max(merged[merged.length - 1].e, iv.e);
    }
  }

  let slots = 0;
  let cur = workStart;
  for (const { s, e } of merged) {
    const gapEnd = Math.min(s, workEnd);
    if (gapEnd > cur && gapEnd - cur >= 90) slots++;
    cur = Math.max(cur, Math.min(e, workEnd));
  }
  if (workEnd - cur >= 90) slots++;
  return slots;
}

const DEFAULT_HORARIO = {
  dias: ['seg', 'ter', 'qua', 'qui', 'sex'],
  inicio: '08:00', fim: '17:00',
  almocoInicio: '12:00', almocoFim: '13:00',
};

export default function HomeScreen({ navigation }) {
  const { isDark } = useTheme();
  const styles = useMemo(() => makeStyles(isDark), [isDark]);

  const [loading,           setLoading]           = useState(true);
  const [primeiroNome,      setPrimeiroNome]      = useState('');
  const [nivelGamificacao,  setNivelGamificacao]  = useState(1);
  const [agendamentosHoje,  setAgendamentosHoje]  = useState([]);
  const [faturamentoSemana, setFaturamentoSemana] = useState(0);
  const [faturamentoMes,    setFaturamentoMes]    = useState(0);
  const [diasTrial,         setDiasTrial]         = useState(null);
  const [slotsLivres,       setSlotsLivres]       = useState(null);
  const [licencaDias,       setLicencaDias]       = useState(null);
  const [mostraDiaCuidado,  setMostraDiaCuidado]  = useState(false);
  const [nomeIncompleto,    setNomeIncompleto]     = useState(false);

  const carregarDados = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData?.user?.id;
    if (!uid) { setLoading(false); return; }

    const { hoje, ontem, semanaInicio, semanaFim, mesInicio, mesFim } = getDateRanges();

    const [profileRes, agendSemanaRes, agendMesRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('nome, nivel_gamificacao, created_at, licenca_expiracao, nome_completo_pendente')
        .eq('id', uid)
        .single(),

      // Todos os agendamentos da semana — filtra hoje em JS para evitar problema de timezone
      supabase
        .from('agendamentos')
        .select('*, clientes(nome), servicos(nome, valor)')
        .eq('profissional_id', uid)
        .gte('data_hora', semanaInicio)
        .lte('data_hora', semanaFim)
        .order('data_hora'),

      // Faturamento do mês
      supabase
        .from('agendamentos')
        .select('valor')
        .eq('profissional_id', uid)
        .in('status', ['finalizado', 'confirmado', 'pendente'])
        .gte('data_hora', mesInicio)
        .lte('data_hora', mesFim),
    ]);

    if (profileRes.data) {
      if (profileRes.data.nome)
        setPrimeiroNome(profileRes.data.nome.trim().split(' ')[0]);
      setNivelGamificacao(profileRes.data.nivel_gamificacao ?? 1);
      // Recalcula nível em background; atualiza UI se subiu
      calcularNivel(uid).then(result => {
        if (result && result.nivel !== (profileRes.data.nivel_gamificacao ?? 1)) {
          setNivelGamificacao(result.nivel);
        }
      }).catch(() => {});
      if (profileRes.data.created_at) {
        const criado = new Date(profileRes.data.created_at);
        const dias = Math.floor((Date.now() - criado.getTime()) / (1000 * 60 * 60 * 24));
        const restantes = 30 - dias;
        setDiasTrial(restantes > 0 ? restantes : 0);
      }
      if (profileRes.data.licenca_expiracao) {
        const [y, mo, d] = profileRes.data.licenca_expiracao.split('-').map(Number);
        const exp  = new Date(y, mo - 1, d);
        const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
        setLicencaDias(Math.round((exp.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)));
      }

      // Banner nome incompleto: só após 30 dias de conta
      if (profileRes.data.nome_completo_pendente && profileRes.data.created_at) {
        const diasConta = Math.floor((Date.now() - new Date(profileRes.data.created_at).getTime()) / 86400000);
        if (diasConta >= 30) setNomeIncompleto(true);
      }
    }

    // Card "Seu dia de cuidado" — uma vez por mês
    try {
      const agora   = new Date();
      const mesKey  = `meu_dia_${agora.getMonth() + 1}_${agora.getFullYear()}`;
      const jaViu   = await AsyncStorage.getItem(mesKey);
      if (!jaViu) {
        setMostraDiaCuidado(true);
        await AsyncStorage.setItem(mesKey, '1');
        // Notificação push para dia 1 do próximo mês às 9h
        const proximo1 = new Date(agora.getFullYear(), agora.getMonth() + 1, 1, 9, 0, 0);
        const secsAte  = (proximo1.getTime() - agora.getTime()) / 1000;
        if (secsAte > 0) {
          scheduleNotification(
            'Seu dia de cuidado ✨',
            'Cuide-se também! Reserve um dia este mês para suas unhas com outra profissional AUREN.',
            secsAte,
          ).catch(() => {});
        }
      }
    } catch (_) {}

    const semanaData = agendSemanaRes.data ?? [];
    const statusFat  = ['finalizado', 'confirmado', 'pendente'];

    const hojeAgend = semanaData.filter(a => a.data_hora.startsWith(hoje));
    setAgendamentosHoje(hojeAgend);

    const soma = rows => rows.reduce((s, r) => s + Number(r.valor || 0), 0);
    setFaturamentoSemana(soma(semanaData.filter(a => statusFat.includes(a.status))));
    setFaturamentoMes(soma(agendMesRes.data ?? []));

    try {
      const storedH = await AsyncStorage.getItem('auren:horario_atendimento');
      const horario = storedH ? { ...DEFAULT_HORARIO, ...JSON.parse(storedH) } : DEFAULT_HORARIO;
      setSlotsLivres(calcSlotsLivres(hojeAgend, horario));
    } catch {
      setSlotsLivres(null);
    }

    setLoading(false);
  }, []);

  // Recarrega sempre que a tela recebe foco
  useFocusEffect(
    useCallback(() => {
      carregarDados();
    }, [carregarDados])
  );

  // Listeners realtime — recarrega ao mudar agendamentos ou financeiro
  useEffect(() => {
    const chAgend = supabase
      .channel('home_agendamentos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agendamentos' },
        () => { carregarDados(); })
      .subscribe();

    const chFin = supabase
      .channel('financeiro_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'financeiro' },
        () => { carregarDados(); })
      .subscribe();

    return () => {
      supabase.removeChannel(chAgend);
      supabase.removeChannel(chFin);
    };
  }, [carregarDados]);

  // ── Derived values ────────────────────────────────────────────
  const ativos            = agendamentosHoje.filter(a => a.status !== 'cancelado');
  const totalAtendimentos = ativos.length;
  const valorPrevisto     = ativos.reduce((s, a) => s + Number(a.valor ?? a.servicos?.valor ?? 0), 0);

  const proximosDois = agendamentosHoje
    .filter(a => a.status === 'pendente' || a.status === 'confirmado')
    .slice(0, 2);

  const proximaCliente = proximosDois[0]?.clientes?.nome ?? null;

  const nivelLabel    = NIVEL_LABELS[nivelGamificacao] ?? `Nível ${nivelGamificacao}`;
  const nivelProgress = Math.min(nivelGamificacao * 20, 100);

  const today = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>

      {/* ── Dark header ── */}
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <Image
            source={require('../../assets/images/logo.png')}
            style={styles.logoImage}
          />
        </View>
        <Text style={styles.greeting}>Olá, {primeiroNome || '—'}</Text>
        <Text style={styles.date}>{today}</Text>
      </View>

      {/* ── Cream content shell ── */}
      <View style={styles.shell}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {loading ? (
            <ActivityIndicator color="#A8235A" style={{ marginTop: 56 }} />
          ) : (
            <>
              {/* Banner de licença */}
              {licencaDias !== null && licencaDias <= 30 && (
                <TouchableOpacity
                  style={[
                    styles.licencaBanner,
                    licencaDias <= 0 ? styles.licencaCritical
                    : licencaDias <= 7 ? styles.licencaUrgent
                    : styles.licencaWarning,
                  ]}
                  onPress={() => licencaDias <= 0
                    ? navigation.navigate('Perfil', { screen: 'MeusDados' })
                    : navigation.navigate('SaibaMais')}
                  activeOpacity={0.85}
                >
                  <View style={styles.trialLeft}>
                    <Text style={styles.licencaTitle}>
                      {licencaDias <= 0
                        ? 'Sua licença expirou.'
                        : `Sua licença expira em ${licencaDias} ${licencaDias === 1 ? 'dia' : 'dias'}.`}
                    </Text>
                    <Text style={styles.licencaSub}>
                      {licencaDias <= 0
                        ? 'Atualize em Meus Dados para continuar.'
                        : 'Renove para continuar usando o AUREN.'}
                    </Text>
                  </View>
                  <Text style={styles.licencaCta}>
                    {licencaDias <= 0 ? 'Atualizar' : 'Saiba mais'}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Banner de trial */}
              {diasTrial !== null && diasTrial > 0 && diasTrial <= 30 && (
                <TouchableOpacity
                  style={styles.trialBanner}
                  onPress={() => navigation.navigate('Perfil')}
                  activeOpacity={0.85}
                >
                  <View style={styles.trialLeft}>
                    <Text style={styles.trialTitle}>
                      {diasTrial <= 3
                        ? `Últimos ${diasTrial} ${diasTrial === 1 ? 'dia' : 'dias'} de trial!`
                        : `${diasTrial} dias restantes no trial`}
                    </Text>
                    <Text style={styles.trialSub}>Escolha seu plano e continue crescendo</Text>
                  </View>
                  <Text style={styles.trialArrow}>›</Text>
                </TouchableOpacity>
              )}

              {/* Banner nome incompleto */}
              {nomeIncompleto && (
                <TouchableOpacity
                  style={styles.nomeIncompletoBanner}
                  onPress={() => navigation.navigate('Perfil', { screen: 'MeusDados' })}
                  activeOpacity={0.85}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.nomeIncompletoTitle}>Nome incompleto</Text>
                    <Text style={styles.nomeIncompletoSub}>
                      Complete seu nome completo em Meus Dados para continuar usando o AUREN.
                    </Text>
                  </View>
                  <Text style={styles.nomeIncompletoArrow}>›</Text>
                </TouchableOpacity>
              )}

              {/* Empty state */}
              {agendamentosHoje.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyEmoji}>📅</Text>
                  <Text style={styles.emptyTitle}>Nenhum agendamento hoje</Text>
                  <Text style={styles.emptySub}>
                    Você ainda não tem clientes agendadas para hoje.{'\n'}
                    Que tal criar seu primeiro agendamento?
                  </Text>
                  <TouchableOpacity
                    style={styles.emptyBtn}
                    onPress={() => navigation.navigate('Agenda')}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.emptyBtnText}>Ir para a Agenda</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
              {/* Card: Hoje */}
              <View style={styles.cardToday}>
                <Text style={styles.todayBadge}>
                  {`HOJE · ${totalAtendimentos} ${totalAtendimentos === 1 ? 'ATENDIMENTO' : 'ATENDIMENTOS'}`}
                </Text>
                <Text style={styles.todayValue}>{formatMoeda(valorPrevisto)}</Text>
                <Text style={styles.todayCaption}>
                  {proximaCliente ? `próxima: ${proximaCliente}` : 'previsto para hoje'}
                </Text>
              </View>

              {/* Próximos 2 agendamentos */}
              {proximosDois.length > 0 && (
                <View style={styles.card}>
                  <Text style={styles.cardLabel}>Próximos agendamentos</Text>
                  {proximosDois.map((a, idx) => (
                    <AgendamentoRow key={a.id} agendamento={a} showDivider={idx > 0} />
                  ))}
                </View>
              )}

              {/* Card: Faturamento */}
              <View style={styles.card}>
                <Text style={styles.cardLabel}>Faturamento</Text>
                <View style={styles.statRow}>
                  <StatColumn
                    label="Esta semana"
                    value={formatMoeda(faturamentoSemana)}
                  />
                  <View style={styles.statDivider} />
                  <StatColumn
                    label="Este mês"
                    value={formatMoeda(faturamentoMes)}
                  />
                </View>
              </View>

              {/* Card: Nível de gamificação */}
              <View style={styles.card}>
                <View style={styles.levelHeader}>
                  <Text style={styles.cardLabel}>Nível</Text>
                  <Text style={styles.levelPercent}>Nível {nivelGamificacao}</Text>
                </View>
                <Text style={styles.levelTitle}>{nivelLabel}</Text>
                <ProgressBar progress={nivelProgress} />
              </View>

              {/* Insights */}
              <Text style={styles.sectionTitle}>Insights de hoje</Text>

              <View style={styles.insightCard}>
                <View style={styles.insightDot} />
                <View style={styles.insightBody}>
                  <Text style={styles.insightTitle}>
                    {slotsLivres !== null
                      ? `${slotsLivres} horário${slotsLivres !== 1 ? 's' : ''} livre${slotsLivres !== 1 ? 's' : ''} hoje`
                      : 'Horários vagos'}
                  </Text>
                  <Text style={styles.insightText}>
                    {slotsLivres === 0
                      ? 'Sua agenda está cheia hoje! Ótimo trabalho.'
                      : slotsLivres !== null
                      ? `Você tem ${slotsLivres} janela${slotsLivres !== 1 ? 's' : ''} disponível${slotsLivres !== 1 ? 'is' : ''} (mín. 1h30). Considere contatar clientes para preenchê-${slotsLivres !== 1 ? 'las' : 'la'}.`
                      : 'Configure seu horário de atendimento em Configurações para ver slots livres.'}
                  </Text>
                </View>
              </View>

              <View style={styles.insightCard}>
                <View style={styles.insightDot} />
                <View style={styles.insightBody}>
                  <Text style={styles.insightTitle}>Clientes inativas</Text>
                  <Text style={styles.insightText}>
                    3 clientes não retornam há mais de 45 dias. Um contato rápido
                    pode recuperar essas visitas esta semana.
                  </Text>
                </View>
              </View>

              {slotsLivres !== null && slotsLivres > 0 && (
                <TouchableOpacity
                  style={styles.insightCard}
                  onPress={() => navigation.navigate('Indicacao')}
                  activeOpacity={0.8}
                >
                  <View style={styles.insightDot} />
                  <View style={styles.insightBody}>
                    <Text style={styles.insightTitle}>Indique o AUREN</Text>
                    <Text style={styles.insightText}>
                      Você tem horários livres hoje. Que tal indicar o AUREN para
                      uma colega profissional? Ela vai amar.
                    </Text>
                  </View>
                  <Text style={{ fontSize: 20, color: '#A8235A', lineHeight: 22, alignSelf: 'center', marginLeft: 8 }}>›</Text>
                </TouchableOpacity>
              )}

              {/* Card Seu dia de cuidado — aparece uma vez por mês */}
              {mostraDiaCuidado && (
                <View style={styles.diaCuidadoCard}>
                  <Text style={styles.diaCuidadoTitle}>Seu dia de cuidado ✨</Text>
                  <Text style={styles.diaCuidadoText}>
                    Cuide-se também! Reserve um dia este mês para suas unhas com outra profissional AUREN.
                  </Text>
                  <TouchableOpacity
                    style={styles.diaCuidadoBtn}
                    onPress={() => navigation.navigate('Perfil', { screen: 'Conexoes' })}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.diaCuidadoBtnText}>Ver profissionais disponíveis</Text>
                  </TouchableOpacity>
                </View>
              )}
                </>
              )}
            </>
          )}
        </ScrollView>
      </View>

    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function makeStyles(isDark) {
  const bg    = isDark ? '#0E0F11' : '#F5EDE8';
  const card  = isDark ? '#1A1B1E' : '#FFFFFF';
  const text  = isDark ? '#F5EDE8' : '#1A0A14';
  const sub   = isDark ? '#C9A8B6' : '#6B4A58';
  const divBg = isDark ? '#2A2A2A' : '#E6D8CF';

  const SM_SHADOW = {
    shadowColor: '#0E0F11',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0 : 0.07,
    shadowRadius: 6,
    elevation: isDark ? 0 : 3,
  };

  return StyleSheet.create({
    safe:   { flex: 1, backgroundColor: bg },
    shell:  { flex: 1, backgroundColor: bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
    scroll: { paddingHorizontal: 18, paddingTop: 22, paddingBottom: 44 },

    logoImage: { height: 28, resizeMode: 'contain' },

    header:   { backgroundColor: '#0E0F11', paddingHorizontal: 20, paddingTop: 14, paddingBottom: 30 },
    logoRow:  { marginBottom: 20 },
    greeting: { fontSize: 26, fontWeight: '800', color: '#FFFFFF', marginBottom: 4 },
    date:     { fontSize: 13, fontWeight: '400', color: 'rgba(255,255,255,0.42)', textTransform: 'capitalize' },

    card:      { backgroundColor: card, borderRadius: 16, padding: 18, marginBottom: 12, ...SM_SHADOW },
    cardLabel: { fontSize: 11, fontWeight: '600', color: '#A8235A', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 14 },

    cardToday:    { backgroundColor: card, borderRadius: 16, padding: 18, marginBottom: 12, borderLeftWidth: 3, borderLeftColor: '#A8235A', ...SM_SHADOW },
    todayBadge:   { fontSize: 11, fontWeight: '700', color: '#A8235A', letterSpacing: 1.4, marginBottom: 12 },
    todayValue:   { fontSize: 38, fontWeight: '800', color: '#A8235A', lineHeight: 44 },
    todayCaption: { fontSize: 13, fontWeight: '400', color: sub, marginTop: 4 },

    statRow:     { flexDirection: 'row', alignItems: 'center' },
    statDivider: { width: 1, height: 44, backgroundColor: divBg, marginHorizontal: 18 },

    levelHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    levelTitle:   { fontSize: 20, fontWeight: '800', color: text, marginBottom: 14 },
    levelPercent: { fontSize: 22, fontWeight: '800', color: '#A8235A' },

    trialBanner: {
      backgroundColor: 'rgba(168,35,90,0.08)', borderRadius: 14,
      padding: 14, marginBottom: 12, flexDirection: 'row',
      alignItems: 'center', borderWidth: 1, borderColor: 'rgba(168,35,90,0.25)',
    },
    trialLeft:  { flex: 1 },
    trialTitle: { fontSize: 14, fontWeight: '700', color: text },
    trialSub:   { fontSize: 12, fontWeight: '400', color: sub, marginTop: 2 },
    trialArrow: { fontSize: 22, color: '#A8235A', marginLeft: 10 },

    emptyCard: {
      backgroundColor: card, borderRadius: 20, padding: 32,
      alignItems: 'center', marginBottom: 12, ...SM_SHADOW,
    },
    emptyEmoji:   { fontSize: 48, marginBottom: 16 },
    emptyTitle:   { fontSize: 18, fontWeight: '800', color: text, marginBottom: 8, textAlign: 'center' },
    emptySub:     { fontSize: 13, fontWeight: '400', color: sub, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
    emptyBtn:     { backgroundColor: '#A8235A', borderRadius: 12, paddingHorizontal: 28, paddingVertical: 13 },
    emptyBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },

    sectionTitle: { fontSize: 16, fontWeight: '700', color: text, marginTop: 8, marginBottom: 12 },
    insightCard:  { backgroundColor: card, borderRadius: 16, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'flex-start', ...SM_SHADOW },
    insightDot:   { width: 6, height: 6, borderRadius: 3, backgroundColor: '#A8235A', marginTop: 5, marginRight: 12, flexShrink: 0 },
    insightBody:  { flex: 1 },
    insightTitle: { fontSize: 14, fontWeight: '700', color: text, marginBottom: 5 },
    insightText:  { fontSize: 13, fontWeight: '400', color: sub, lineHeight: 20 },

    licencaBanner:   { borderRadius: 14, padding: 14, marginBottom: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1 },
    licencaWarning:  { backgroundColor: 'rgba(245,158,11,0.10)', borderColor: 'rgba(245,158,11,0.35)' },
    licencaUrgent:   { backgroundColor: 'rgba(239,68,68,0.10)', borderColor: 'rgba(239,68,68,0.40)' },
    licencaCritical: { backgroundColor: 'rgba(220,38,38,0.15)', borderColor: 'rgba(220,38,38,0.55)' },
    licencaTitle:    { fontSize: 14, fontWeight: '700', color: text },
    licencaSub:      { fontSize: 12, fontWeight: '400', color: sub, marginTop: 2 },
    licencaCta:      { fontSize: 13, fontWeight: '700', color: '#A8235A', marginLeft: 12 },

    nomeIncompletoBanner: {
      backgroundColor: 'rgba(249,115,22,0.10)', borderRadius: 14,
      padding: 14, marginBottom: 12, flexDirection: 'row',
      alignItems: 'center', borderWidth: 1, borderColor: 'rgba(249,115,22,0.35)',
    },
    nomeIncompletoTitle: { fontSize: 14, fontWeight: '700', color: '#F97316', marginBottom: 2 },
    nomeIncompletoSub:   { fontSize: 12, fontWeight: '400', color: sub, lineHeight: 18 },
    nomeIncompletoArrow: { fontSize: 22, color: '#F97316', marginLeft: 10 },

    diaCuidadoCard: {
      backgroundColor: card, borderRadius: 16, padding: 18,
      marginBottom: 12, borderLeftWidth: 3, borderLeftColor: '#A8235A', ...SM_SHADOW,
    },
    diaCuidadoTitle:   { fontSize: 15, fontWeight: '800', color: text, marginBottom: 8 },
    diaCuidadoText:    { fontSize: 13, fontWeight: '400', color: sub, lineHeight: 20, marginBottom: 14 },
    diaCuidadoBtn:     { backgroundColor: '#A8235A', borderRadius: 10, paddingVertical: 11, paddingHorizontal: 18, alignSelf: 'flex-start' },
    diaCuidadoBtnText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  });
}
