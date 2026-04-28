import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import colors from '../constants/colors';

// ─── Constants ────────────────────────────────────────────────────────────────

const NIVEIS = [
  {
    nivel:    1,
    nome:     'Começando',
    emoji:    '🌱',
    descricao: 'Você está dando os primeiros passos na AUREN.',
    criterios: ['Cadastre seu perfil completo', 'Adicione pelo menos 1 serviço', 'Faça seu 1º agendamento'],
    proximos:  ['Cadastre 5 clientes', 'Realize 5 agendamentos'],
    meta_clientes: 5,
    meta_agendamentos: 5,
  },
  {
    nivel:    2,
    nome:     'Em Ritmo',
    emoji:    '⚡',
    descricao: 'Sua agenda está ganhando forma.',
    criterios: ['5+ clientes cadastrados', '5+ agendamentos realizados'],
    proximos:  ['Alcance 15 clientes', 'Complete 20 agendamentos'],
    meta_clientes: 15,
    meta_agendamentos: 20,
  },
  {
    nivel:    3,
    nome:     'Agenda Cheia',
    emoji:    '📅',
    descricao: 'Sua agenda está bombando!',
    criterios: ['15+ clientes cadastrados', '20+ agendamentos realizados'],
    proximos:  ['Alcance 30 clientes', 'Complete 50 agendamentos'],
    meta_clientes: 30,
    meta_agendamentos: 50,
  },
  {
    nivel:    4,
    nome:     'Profissional',
    emoji:    '💎',
    descricao: 'Você é uma referência na sua área.',
    criterios: ['30+ clientes cadastrados', '50+ agendamentos realizados'],
    proximos:  ['Alcance 60 clientes', 'Complete 100 agendamentos'],
    meta_clientes: 60,
    meta_agendamentos: 100,
  },
  {
    nivel:    5,
    nome:     'Elite AUREN',
    emoji:    '👑',
    descricao: 'O topo da profissão. Você chegou lá!',
    criterios: ['60+ clientes cadastrados', '100+ agendamentos realizados'],
    proximos:  [],
    meta_clientes: null,
    meta_agendamentos: null,
  },
];

const NIVEL_COLORS = ['#4ade80', '#FACC15', '#A8235A', '#3B5BA5', '#E8C4A0'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function clamp(val, min, max) {
  return Math.min(max, Math.max(min, val));
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProgressBar({ pct, color }) {
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${clamp(pct,0,1)*100}%`, backgroundColor: color }]} />
    </View>
  );
}

function NivelCard({ info, isCurrent, totalClientes, totalAgendamentos }) {
  const color    = NIVEL_COLORS[info.nivel - 1];
  const isLast   = info.nivel === 5;
  const achieved = isCurrent || (totalClientes >= (info.meta_clientes ?? 0) && !isCurrent);

  const pct = isLast ? 1 : clamp(
    Math.min(
      info.meta_clientes     ? totalClientes      / info.meta_clientes     : 1,
      info.meta_agendamentos ? totalAgendamentos  / info.meta_agendamentos : 1,
    ), 0, 1
  );

  return (
    <View style={[styles.nivelCard, isCurrent && { borderWidth: 1.5, borderColor: color }]}>
      <View style={styles.nivelCardTop}>
        <View style={[styles.nivelBadge, { backgroundColor: color + '22' }]}>
          <Text style={styles.nivelEmoji}>{info.emoji}</Text>
          <Text style={[styles.nivelNum, { color }]}>Nível {info.nivel}</Text>
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.nivelNome}>{info.nome}</Text>
          <Text style={styles.nivelDesc} numberOfLines={2}>{info.descricao}</Text>
        </View>
        {isCurrent && (
          <View style={[styles.currentBadge, { backgroundColor: color + '22' }]}>
            <Text style={[styles.currentBadgeText, { color }]}>ATUAL</Text>
          </View>
        )}
      </View>

      {!isLast && (
        <>
          <ProgressBar pct={pct} color={color} />
          <Text style={styles.nivelProgress}>
            {totalClientes}/{info.meta_clientes} clientes · {totalAgendamentos}/{info.meta_agendamentos} agendamentos
          </Text>
        </>
      )}

      <View style={styles.criteriosList}>
        {info.criterios.map((c, i) => (
          <View key={i} style={styles.criterioRow}>
            <Text style={[styles.criterioCheck, { color }]}>✓</Text>
            <Text style={styles.criterioText}>{c}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function GamificacaoScreen({ navigation }) {
  const [loading,            setLoading]            = useState(true);
  const [nivelAtual,         setNivelAtual]         = useState(1);
  const [totalClientes,      setTotalClientes]      = useState(0);
  const [totalAgendamentos,  setTotalAgendamentos]  = useState(0);

  useEffect(() => {
    (async () => {
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData?.user?.id;
      if (!uid) { setLoading(false); return; }

      const [profileRes, clientesRes, agendamentosRes] = await Promise.all([
        supabase.from('profiles').select('nivel_gamificacao').eq('id', uid).single(),
        supabase.from('clientes').select('id', { count: 'exact', head: true }).eq('profissional_id', uid),
        supabase.from('agendamentos').select('id', { count: 'exact', head: true }).eq('profissional_id', uid),
      ]);

      setNivelAtual(profileRes.data?.nivel_gamificacao ?? 1);
      setTotalClientes(clientesRes.count ?? 0);
      setTotalAgendamentos(agendamentosRes.count ?? 0);
      setLoading(false);
    })();
  }, []);

  const currentInfo = NIVEIS[nivelAtual - 1] ?? NIVEIS[0];
  const nextInfo    = NIVEIS[nivelAtual] ?? null;
  const nivelColor  = NIVEL_COLORS[nivelAtual - 1];

  const progressGeral = (nivelAtual - 1) / 4;

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gamificação</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Hero card ── */}
        <View style={[styles.heroCard, { borderColor: nivelColor + '55' }]}>
          <Text style={styles.heroEmoji}>{currentInfo.emoji}</Text>
          <Text style={[styles.heroNivel, { color: nivelColor }]}>NÍVEL {nivelAtual}</Text>
          <Text style={styles.heroNome}>{currentInfo.nome}</Text>
          <Text style={styles.heroDesc}>{currentInfo.descricao}</Text>

          {/* Progresso geral entre níveis */}
          <View style={styles.heroProgressWrap}>
            <View style={styles.heroProgressTrack}>
              <View style={[styles.heroProgressFill, { width: `${progressGeral * 100}%`, backgroundColor: nivelColor }]} />
            </View>
            <View style={styles.heroProgressLabels}>
              <Text style={styles.heroProgressLabel}>Nível 1</Text>
              <Text style={[styles.heroProgressPct, { color: nivelColor }]}>
                {Math.round(progressGeral * 100)}% do caminho
              </Text>
              <Text style={styles.heroProgressLabel}>Nível 5</Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{totalClientes}</Text>
              <Text style={styles.statLabel}>clientes</Text>
            </View>
            <View style={[styles.statDivider]} />
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{totalAgendamentos}</Text>
              <Text style={styles.statLabel}>agendamentos</Text>
            </View>
          </View>
        </View>

        {/* ── Próximo nível ── */}
        {nextInfo && (
          <View style={styles.proximoCard}>
            <Text style={styles.proximoTitle}>PARA CHEGAR AO NÍVEL {nextInfo.nivel}</Text>
            {nextInfo.criterios.map((c, i) => (
              <View key={i} style={styles.criterioRow}>
                <Text style={styles.criterioArrow}>›</Text>
                <Text style={styles.criterioText}>{c}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Todos os níveis ── */}
        <Text style={styles.sectionTitle}>TODOS OS NÍVEIS</Text>
        {NIVEIS.map(n => (
          <NivelCard
            key={n.nivel}
            info={n}
            isCurrent={n.nivel === nivelAtual}
            totalClientes={totalClientes}
            totalAgendamentos={totalAgendamentos}
          />
        ))}

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const CARD_BG = '#222222';
const SUBTLE  = '#2C2C2C';

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 20, marginBottom: 20,
  },
  backBtn:     { width: 32, alignItems: 'center' },
  backArrow:   { fontSize: 32, color: colors.white, lineHeight: 34, marginTop: -4 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: colors.white },
  headerRight: { width: 32 },

  scroll: { paddingHorizontal: 20, paddingBottom: 48 },

  // Hero
  heroCard: {
    backgroundColor: CARD_BG, borderRadius: 20,
    padding: 24, marginBottom: 16,
    alignItems: 'center', borderWidth: 1,
  },
  heroEmoji: { fontSize: 48, marginBottom: 8 },
  heroNivel: { fontSize: 11, fontWeight: '800', letterSpacing: 2, marginBottom: 4 },
  heroNome:  { fontSize: 26, fontWeight: '800', color: colors.white, marginBottom: 6 },
  heroDesc:  { fontSize: 13, fontWeight: '400', color: colors.gray, textAlign: 'center', marginBottom: 20 },

  heroProgressWrap: { width: '100%', marginBottom: 20 },
  heroProgressTrack: {
    height: 8, backgroundColor: '#333333', borderRadius: 4, overflow: 'hidden', marginBottom: 6,
  },
  heroProgressFill: { height: '100%', borderRadius: 4 },
  heroProgressLabels: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  heroProgressLabel: { fontSize: 10, fontWeight: '400', color: colors.gray },
  heroProgressPct:   { fontSize: 12, fontWeight: '800' },

  statsRow:    { flexDirection: 'row', alignItems: 'center', gap: 0 },
  statBox:     { alignItems: 'center', flex: 1 },
  statValue:   { fontSize: 28, fontWeight: '800', color: colors.white },
  statLabel:   { fontSize: 11, fontWeight: '400', color: colors.gray, marginTop: 2 },
  statDivider: { width: 1, height: 40, backgroundColor: SUBTLE },

  // Próximo nível
  proximoCard: {
    backgroundColor: CARD_BG, borderRadius: 14, padding: 16, marginBottom: 20,
  },
  proximoTitle: {
    fontSize: 10, fontWeight: '800', color: colors.gray,
    letterSpacing: 1.3, marginBottom: 10,
  },

  // Section
  sectionTitle: {
    fontSize: 10, fontWeight: '700', color: colors.gray,
    letterSpacing: 1.3, marginBottom: 10,
  },

  // Nivel cards
  nivelCard: {
    backgroundColor: CARD_BG, borderRadius: 14, padding: 14, marginBottom: 10,
  },
  nivelCardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  nivelBadge: {
    borderRadius: 10, padding: 10, alignItems: 'center', minWidth: 64,
  },
  nivelEmoji: { fontSize: 22, marginBottom: 2 },
  nivelNum:   { fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  nivelNome:  { fontSize: 15, fontWeight: '700', color: colors.white, marginBottom: 3 },
  nivelDesc:  { fontSize: 12, fontWeight: '400', color: colors.gray },
  currentBadge: {
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start',
  },
  currentBadgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 1 },

  progressTrack: {
    height: 6, backgroundColor: '#333333', borderRadius: 3,
    overflow: 'hidden', marginBottom: 6,
  },
  progressFill: { height: '100%', borderRadius: 3 },
  nivelProgress: {
    fontSize: 11, fontWeight: '400', color: '#444444', marginBottom: 8,
  },

  criteriosList: { gap: 4 },
  criterioRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  criterioCheck: { fontSize: 12, fontWeight: '700', lineHeight: 18 },
  criterioArrow: { fontSize: 14, fontWeight: '700', color: colors.gray, lineHeight: 18 },
  criterioText:  { fontSize: 13, fontWeight: '400', color: colors.gray, flex: 1, lineHeight: 18 },
});
