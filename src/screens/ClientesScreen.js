import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import colors from '../constants/colors';

// ─── Data ────────────────────────────────────────────────────────────────────

const CLIENTS = [
  { id: 1, name: 'Carla Mendes',   badge: 'VIP',  lastService: 'Gel',                lastTime: 'há 4 dias',    phone: '(305) 555-0142', visits: 18 },
  { id: 2, name: 'Mariana Souza',  badge: null,   lastService: 'Manutenção',          lastTime: 'há 2 dias',    phone: '(305) 555-0187', visits: 12 },
  { id: 3, name: 'Camila Torres',  badge: null,   lastService: 'Nail art',            lastTime: 'há 1 semana',  phone: '(786) 555-0331', visits: 9  },
  { id: 4, name: 'Dona Rita',      badge: 'VIP',  lastService: 'Pé + mão',            lastTime: 'há 3 semanas', phone: '(305) 555-0209', visits: 24 },
  { id: 5, name: 'Sofia Mendez',   badge: 'NOVA', lastService: 'Primeira vez quinta', lastTime: null,           phone: '(786) 555-0478', visits: 1  },
];

const BADGE_STYLE = {
  VIP:  { bg: 'rgba(232,196,160,0.14)', color: colors.cream,  border: 'rgba(232,196,160,0.28)' },
  NOVA: { bg: 'rgba(74,222,128,0.12)',  color: '#4ade80',     border: 'rgba(74,222,128,0.28)'  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(name) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function normalize(str) {
  return str.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SummaryCard({ value, label }) {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function Badge({ type }) {
  const s = BADGE_STYLE[type];
  if (!s) return null;
  return (
    <View style={[styles.badge, { backgroundColor: s.bg, borderColor: s.border }]}>
      <Text style={[styles.badgeText, { color: s.color }]}>{type}</Text>
    </View>
  );
}

function ClientCard({ name, badge, lastService, lastTime, phone, visits }) {
  const serviceLine = lastTime ? `${lastService} · ${lastTime}` : lastService;
  return (
    <TouchableOpacity style={styles.clientCard} activeOpacity={0.72}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{getInitials(name)}</Text>
      </View>
      <View style={styles.clientInfo}>
        <View style={styles.nameRow}>
          <Text style={styles.clientName} numberOfLines={1}>{name}</Text>
          {badge && <Badge type={badge} />}
        </View>
        <Text style={styles.serviceText} numberOfLines={1}>{serviceLine}</Text>
        <Text style={styles.phoneText}>{phone}</Text>
      </View>
      <View style={styles.visitsCol}>
        <Text style={styles.visitsCount}>{visits}</Text>
        <Text style={styles.visitsLabel}>visitas</Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function ClientesScreen() {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!query.trim()) return CLIENTS;
    const q = normalize(query.trim());
    return CLIENTS.filter(c => normalize(c.name).includes(q) || c.phone.includes(q));
  }, [query]);

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
          <SummaryCard value="47" label="Total de clientes" />
          <SummaryCard value="31" label="Ativas este mês" />
        </View>

        <Text style={styles.sectionLabel}>
          {query.trim()
            ? `${filtered.length} resultado${filtered.length !== 1 ? 's' : ''}`
            : 'Todas as clientes'}
        </Text>

        {filtered.length > 0 ? (
          filtered.map(c => <ClientCard key={c.id} {...c} />)
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Nenhuma cliente encontrada.</Text>
          </View>
        )}
      </ScrollView>

      <TouchableOpacity style={styles.fab} activeOpacity={0.85}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const CARD_BG = '#222222';

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },

  header: { paddingHorizontal: 20, paddingTop: 28, marginBottom: 20 },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 3,
  },
  headerSubtitle: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.gray,
  },

  searchWrap: { paddingHorizontal: 20, marginBottom: 20 },
  searchInput: {
    backgroundColor: CARD_BG,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 14,
    fontWeight: '400',
    color: colors.white,
  },

  scroll: { paddingHorizontal: 20, paddingBottom: 110 },

  summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  summaryCard: {
    flex: 1,
    backgroundColor: CARD_BG,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 16,
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.white,
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.gray,
  },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.gray,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    marginBottom: 12,
  },

  clientCard: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: '#2E2E2E',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 13, flexShrink: 0,
  },
  avatarText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.cream,
  },
  clientInfo: { flex: 1, marginRight: 12 },
  nameRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 7, marginBottom: 3, flexWrap: 'wrap',
  },
  clientName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.white,
  },
  badge: {
    paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: 6, borderWidth: 1,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  serviceText: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.gray,
    marginBottom: 3,
  },
  phoneText: {
    fontSize: 12,
    fontWeight: '400',
    color: '#555555',
  },
  visitsCol: { alignItems: 'center', flexShrink: 0 },
  visitsCount: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.white,
    lineHeight: 22,
  },
  visitsLabel: {
    fontSize: 10,
    fontWeight: '400',
    color: colors.gray,
    marginTop: 2,
  },

  emptyState: { alignItems: 'center', paddingTop: 48 },
  emptyText: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.gray,
  },

  fab: {
    position: 'absolute', bottom: 24, right: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45, shadowRadius: 10, elevation: 8,
  },
  fabText: {
    fontSize: 30,
    fontWeight: '400',
    color: colors.white,
    lineHeight: 34,
  },
});
