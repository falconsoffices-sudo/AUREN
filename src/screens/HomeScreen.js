import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import theme from '../constants/theme';
import { supabase } from '../lib/supabase';

const c  = theme.colors;
const sh = theme.shadows;

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProgressBar({ progress }) {
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${progress}%` }]} />
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

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const [primeiroNome, setPrimeiroNome] = useState('');

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) return;
      const { data } = await supabase
        .from('profiles')
        .select('nome')
        .eq('id', userData.user.id)
        .single();
      if (data?.nome) setPrimeiroNome(data.nome.trim().split(' ')[0]);
    })();
  }, []);

  const today = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
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
        <Text style={styles.greeting}>Olá, {primeiroNome || 'Maria'}</Text>
        <Text style={styles.date}>{today}</Text>
      </View>

      {/* ── Cream content shell ── */}
      <View style={styles.shell}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >

          {/* Card: Hoje */}
          <View style={styles.cardToday}>
            <Text style={styles.todayBadge}>HOJE · 4 ATENDIMENTOS</Text>
            <Text style={styles.todayValue}>$420</Text>
            <Text style={styles.todayCaption}>previsto para hoje</Text>
          </View>

          {/* Card: Faturamento */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Faturamento</Text>
            <View style={styles.statRow}>
              <StatColumn label="Esta semana" value="$1.840" />
              <View style={styles.statDivider} />
              <StatColumn label="Este mês" value="$6.290" meta="meta $7.000" />
            </View>
          </View>

          {/* Card: Nível de agenda */}
          <View style={styles.card}>
            <View style={styles.levelHeader}>
              <Text style={styles.cardLabel}>Nível de agenda</Text>
              <Text style={styles.levelPercent}>62%</Text>
            </View>
            <Text style={styles.levelTitle}>Agenda Cheia</Text>
            <ProgressBar progress={62} />
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

  /* Logo image */
  logoImage: {
    height: 28,
    resizeMode: 'contain',
  },

  /* Dark header */
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

  /* Base card */
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
