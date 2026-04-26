import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import colors from '../constants/colors';

// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const DAYS_LONG  = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
const MONTHS     = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                    'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

const STATUS_MAP = {
  Finalizado: { bg: '#0D2B14', color: '#4ade80' },
  Próxima:    { bg: '#3B0A1E', color: colors.primary },
  Confirmada: { bg: '#2C2000', color: '#FACC15' },
};

const APPOINTMENTS = [
  { id: 1, time: '10:00 AM', name: 'Larissa Pereira', service: 'Esmaltação em gel',  duration: '1h',    value: '$110', status: 'Finalizado' },
  { id: 2, time: '11:30 AM', name: 'Camila Torres',   service: 'Gel + nail art',      duration: '1h30',  value: '$140', status: 'Finalizado' },
  { id: 3, time: '2:30 PM',  name: 'Mariana Souza',   service: 'Manutenção em gel',   duration: '45min', value: '$90',  status: 'Próxima'    },
  { id: 4, time: '4:00 PM',  name: 'Dona Rita',       service: 'Pé + mão',            duration: '1h30',  value: '$80',  status: 'Confirmada', vip: true },
];

const TODAY = new Date();
TODAY.setHours(0, 0, 0, 0);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth()    === b.getMonth()    &&
    a.getDate()     === b.getDate()
  );
}

function getWeekDays(baseDate, weekOffset) {
  const sunday = new Date(baseDate);
  sunday.setDate(baseDate.getDate() - baseDate.getDay() + weekOffset * 7);
  sunday.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    return d;
  });
}

function getInitials(name) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function AppointmentCard({ time, name, service, duration, value, status, vip }) {
  const s = STATUS_MAP[status];
  const isNext = status === 'Próxima';

  return (
    <View style={[styles.apptCard, isNext && styles.apptCardHighlight]}>
      <View style={styles.apptTopRow}>
        <Text style={styles.apptTime}>{time}</Text>
        <View style={[styles.statusBadge, { backgroundColor: s.bg }]}>
          <Text style={[styles.statusText, { color: s.color }]}>{status}</Text>
        </View>
      </View>

      <View style={styles.apptClientRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitials(name)}</Text>
        </View>
        <View style={styles.apptInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.clientName} numberOfLines={1}>{name}</Text>
            {vip && (
              <View style={styles.vipBadge}>
                <Text style={styles.vipText}>VIP</Text>
              </View>
            )}
          </View>
          <Text style={styles.serviceText}>{service} · {duration}</Text>
        </View>
        <Text style={[styles.apptValue, isNext && { color: colors.primary }]}>
          {value}
        </Text>
      </View>
    </View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function AgendaScreen() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [selected, setSelected]     = useState(TODAY);

  const weekDays   = getWeekDays(TODAY, weekOffset);
  const monthLabel = `${MONTHS[TODAY.getMonth()]} ${TODAY.getFullYear()}`;
  const isToday    = isSameDay(selected, TODAY);
  const apptCount  = isToday ? APPOINTMENTS.length : 0;
  const dayLabel   = `${DAYS_LONG[selected.getDay()]}, ${selected.getDate()} de ${MONTHS[selected.getMonth()]}`;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Agenda</Text>
        <Text style={styles.headerMonth}>{monthLabel}</Text>
      </View>

      {/* ── Week selector ── */}
      <View style={styles.weekRow}>
        <TouchableOpacity
          style={styles.navBtn}
          onPress={() => setWeekOffset(o => o - 1)}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.navBtnText}>‹</Text>
        </TouchableOpacity>

        {weekDays.map((day, i) => {
          const active = isSameDay(day, selected);
          return (
            <TouchableOpacity
              key={i}
              style={[styles.dayItem, active && styles.dayItemActive]}
              onPress={() => setSelected(day)}
              activeOpacity={0.75}
            >
              <Text style={[styles.dayShort, active && styles.dayTextActive]}>
                {DAYS_SHORT[day.getDay()]}
              </Text>
              <Text style={[styles.dayNum, active && styles.dayTextActive]}>
                {day.getDate()}
              </Text>
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity
          style={styles.navBtn}
          onPress={() => setWeekOffset(o => o + 1)}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.navBtnText}>›</Text>
        </TouchableOpacity>
      </View>

      {/* ── Day title ── */}
      <Text style={styles.dayTitle}>
        {dayLabel}{apptCount > 0 ? `  ·  ${apptCount} Agendamentos` : ''}
      </Text>

      {/* ── Appointment list ── */}
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {isToday ? (
          APPOINTMENTS.map(a => <AppointmentCard key={a.id} {...a} />)
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Nenhum agendamento para este dia.</Text>
          </View>
        )}
      </ScrollView>

      {/* ── FAB ── */}
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

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 28,
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.white,
  },
  headerMonth: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.gray,
    paddingBottom: 3,
  },

  weekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  navBtn: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnText: {
    fontSize: 26,
    fontWeight: '400',
    color: colors.gray,
    lineHeight: 30,
  },
  dayItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: 12,
  },
  dayItemActive: { backgroundColor: colors.primary },
  dayShort: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.gray,
    marginBottom: 5,
    letterSpacing: 0.3,
  },
  dayNum: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.gray,
  },
  dayTextActive: { color: colors.white },

  dayTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
    paddingHorizontal: 20,
    marginBottom: 16,
  },

  scroll: { paddingHorizontal: 20, paddingBottom: 110 },

  apptCard: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
  },
  apptCardHighlight: {
    borderWidth: 1,
    borderColor: 'rgba(168,35,90,0.45)',
  },
  apptTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  apptTime: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.gray,
    letterSpacing: 0.3,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  apptClientRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2E2E2E',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.cream,
  },
  apptInfo: { flex: 1 },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 3,
  },
  clientName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.white,
  },
  vipBadge: {
    backgroundColor: 'rgba(232,196,160,0.15)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(232,196,160,0.3)',
  },
  vipText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.cream,
    letterSpacing: 0.8,
  },
  serviceText: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.gray,
  },
  apptValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
    marginLeft: 8,
  },

  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyText: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.gray,
  },

  fab: {
    position: 'absolute',
    bottom: 24, right: 20,
    width: 56, height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 8,
  },
  fabText: {
    fontSize: 30,
    fontWeight: '400',
    color: colors.white,
    lineHeight: 34,
  },
});
