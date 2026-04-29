import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import theme from '../constants/theme';
import { supabase } from '../lib/supabase';

const c  = theme.colors;
const sh = theme.shadows;

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
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${Math.min(progress, 100)}%` }]} />
    </View>
  );
}

function StatColumn({ label, value, meta }) {
  return (
    <View style={styles.statCol}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      {meta ? <Text style={styles.statMeta}>{meta}</Text> : null}
    </View>
  );
}

function AgendamentoRow({ agendamento, showDivider }) {
  const clienteNome = agendamento.clientes?.nome ?? 'Cliente';
  const servicoNome = agendamento.servicos?.nome ?? '—';
  const hora        = formatHora(agendamento.data_hora);
  const dotColor    = STATUS_COLORS[agendamento.status] ?? '#6B7280';

  return (
    <>
      {showDivider && <View style={styles.agendDivider} />}
      <View style={styles.agendRow}>
        <View style={[styles.agendDot, { backgroundColor: dotColor }]} />
        <View style={styles.agendInfo}>
          <Text style={styles.agendNome} numberOfLines={1}>{clienteNome}</Text>
          <Text style={styles.agendServico} numberOfLines={1}>{servicoNome}</Text>
        </View>
        <Text style={styles.agendHora}>{hora}</Text>
      </View>
    </>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const [loading,           setLoading]           = useState(true);
  const [primeiroNome,      setPrimeiroNome]      = useState('');
  const [nivelGamificacao,  setNivelGamificacao]  = useState(1);
  const [agendamentosHoje,  setAgendamentosHoje]  = useState([]);
  const [faturamentoSemana, setFaturamentoSemana] = useState(0);
  const [faturamentoMes,    setFaturamentoMes]    = useState(0);

  const carregarDados = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData?.user?.id;
    if (!uid) { setLoading(false); return; }

    const { hoje, ontem, semanaInicio, semanaFim, mesInicio, mesFim } = getDateRanges();

    const [profileRes, agendSemanaRes, agendMesRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('nome, nivel_gamificacao')
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
    }

    const semanaData = agendSemanaRes.data ?? [];
    const statusFat  = ['finalizado', 'confirmado', 'pendente'];

    setAgendamentosHoje(semanaData.filter(a => a.data_hora.startsWith(hoje)));

    const soma = rows => rows.reduce((s, r) => s + Number(r.valor || 0), 0);
    setFaturamentoSemana(soma(semanaData.filter(a => statusFat.includes(a.status))));
    setFaturamentoMes(soma(agendMesRes.data ?? []));

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
            <ActivityIndicator color={c.magenta} style={{ marginTop: 56 }} />
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
                  <Text style={styles.insightTitle}>Horários vagos</Text>
                  <Text style={styles.insightText}>
                    Você tem 2 horários abertos à tarde. Considere contatar clientes
                    que costumam agendar nesse período para preenchê-los.
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
            </>
          )}
        </ScrollView>
      </View>

    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: c.dark,
  },
  shell: {
    flex: 1,
    backgroundColor: c.creme,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  scroll: {
    paddingHorizontal: 18,
    paddingTop: 22,
    paddingBottom: 44,
  },

  logoImage: {
    height: 28,
    resizeMode: 'contain',
  },

  header: {
    backgroundColor: c.dark,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 30,
  },
  logoRow: {
    marginBottom: 20,
  },
  greeting: {
    fontSize: 26,
    fontWeight: '800',
    color: c.white,
    marginBottom: 4,
  },
  date: {
    fontSize: 13,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.42)',
    textTransform: 'capitalize',
  },

  card: {
    backgroundColor: c.white,
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    ...sh.sm,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: c.fg3,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 14,
  },

  /* Card: Hoje */
  cardToday: {
    backgroundColor: c.white,
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: c.magenta,
    ...sh.sm,
  },
  todayBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: c.magenta,
    letterSpacing: 1.4,
    marginBottom: 12,
  },
  todayValue: {
    fontSize: 38,
    fontWeight: '800',
    color: c.magenta,
    lineHeight: 44,
  },
  todayCaption: {
    fontSize: 13,
    fontWeight: '400',
    color: c.fg3,
    marginTop: 4,
  },

  /* Agendamento rows */
  agendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  agendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
    flexShrink: 0,
  },
  agendInfo: {
    flex: 1,
    marginRight: 10,
  },
  agendNome: {
    fontSize: 14,
    fontWeight: '700',
    color: c.dark,
  },
  agendServico: {
    fontSize: 12,
    fontWeight: '400',
    color: c.fg3,
    marginTop: 2,
  },
  agendHora: {
    fontSize: 13,
    fontWeight: '700',
    color: c.magenta,
    flexShrink: 0,
  },
  agendDivider: {
    height: 1,
    backgroundColor: c.bege2,
  },

  /* StatColumn */
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statCol: {
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 44,
    backgroundColor: c.bege2,
    marginHorizontal: 18,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '400',
    color: c.fg3,
    marginBottom: 5,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: c.dark,
  },
  statMeta: {
    fontSize: 11,
    fontWeight: '400',
    color: c.fg3,
    marginTop: 3,
  },

  /* Card: Nível */
  levelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  levelTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: c.dark,
    marginBottom: 14,
  },
  levelPercent: {
    fontSize: 22,
    fontWeight: '800',
    color: c.magenta,
  },
  progressTrack: {
    height: 8,
    backgroundColor: c.bege2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: 8,
    backgroundColor: c.magenta,
    borderRadius: 4,
  },

  /* Insights */
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: c.dark,
    marginTop: 8,
    marginBottom: 12,
  },
  insightCard: {
    backgroundColor: c.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    ...sh.sm,
  },
  insightDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: c.magenta,
    marginTop: 5,
    marginRight: 12,
    flexShrink: 0,
  },
  insightBody: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: c.fg,
    marginBottom: 5,
  },
  insightText: {
    fontSize: 13,
    fontWeight: '400',
    color: c.fg3,
    lineHeight: 20,
  },
});
