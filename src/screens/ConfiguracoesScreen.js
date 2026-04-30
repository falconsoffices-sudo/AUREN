import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';
import colors from '../constants/colors';

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionTitle({ label }) {
  return <Text style={styles.sectionTitle}>{label}</Text>;
}

function ToggleRow({ label, options, value, onChange }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.toggleGroup}>
        {options.map(opt => {
          const active = value === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              style={[styles.toggleBtn, active && styles.toggleBtnActive]}
              onPress={() => onChange(opt.value)}
              activeOpacity={0.75}
            >
              <Text style={[styles.toggleText, active && styles.toggleTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

const NOTIF_OPTIONS = [
  { label: 'Ativado',    value: 'on'  },
  { label: 'Desativado', value: 'off' },
];

const APARENCIA_OPTIONS = [
  { label: 'Automático', value: 'auto'  },
  { label: 'Diurno',     value: 'light' },
  { label: 'Noturno',    value: 'dark'  },
];

const IDIOMA_OPTIONS = [
  { label: 'PT-BR',    value: 'pt' },
  { label: 'ES-LATAM', value: 'es' },
];

export default function ConfiguracoesScreen({ navigation }) {
  const { themeMode, setThemeMode } = useTheme();

  const [loading,          setLoading]          = useState(true);
  const [saving,           setSaving]           = useState(false);
  const [userId,           setUserId]           = useState(null);

  const [notificacoes,     setNotificacoes]     = useState('on');
  const [dataFechamento,   setDataFechamento]   = useState('28');
  const [idioma,           setIdioma]           = useState('pt');

  useEffect(() => {
    (async () => {
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData?.user?.id;
      if (!uid) { setLoading(false); return; }
      setUserId(uid);

      const { data, error } = await supabase
        .from('profiles')
        .select('notificacoes, modo_app, data_fechamento, idioma')
        .eq('id', uid)
        .single();

      if (data) {
        setNotificacoes(data.notificacoes ?? 'on');
        if (data.modo_app === 'auto' || data.modo_app === 'dark' || data.modo_app === 'light') {
          setThemeMode(data.modo_app);
        }
        setDataFechamento(data.data_fechamento != null ? String(data.data_fechamento) : '28');
        setIdioma(data.idioma ?? 'pt');
      } else if (error && error.code !== 'PGRST116') {
        Alert.alert('Erro ao carregar', error.message);
      }
      setLoading(false);
    })();
  }, []);

  const handleSave = async () => {
    const dia = parseInt(dataFechamento, 10);
    if (!dia || dia < 1 || dia > 31) {
      Alert.alert('Valor inválido', 'A data de fechamento deve ser entre 1 e 31.');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id:               userId,
          notificacoes,
          modo_app:         themeMode,
          data_fechamento:  dia,
          idioma,
        });
      if (error) throw error;
      Alert.alert('Salvo!', 'Configurações atualizadas.');
    } catch (err) {
      Alert.alert('Erro ao salvar', err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Configurações</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        <SectionTitle label="PREFERÊNCIAS" />
        <View style={styles.card}>
          <ToggleRow
            label="Notificações"
            options={NOTIF_OPTIONS}
            value={notificacoes}
            onChange={setNotificacoes}
          />
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Aparência</Text>
          </View>
          <View style={styles.aparenciaRow}>
            {APARENCIA_OPTIONS.map(opt => {
              const active = themeMode === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.aparenciaBtn, active && styles.aparenciaBtnActive]}
                  onPress={() => setThemeMode(opt.value)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.aparenciaText, active && styles.aparenciaTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <SectionTitle label="FINANCEIRO" />
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>Fechamento mensal</Text>
              <Text style={styles.rowHint}>Dia do mês para fechar o caixa</Text>
            </View>
            <TextInput
              style={styles.numInput}
              value={dataFechamento}
              onChangeText={t => setDataFechamento(t.replace(/\D/g,'').slice(0,2))}
              keyboardType="number-pad"
              maxLength={2}
              returnKeyType="done"
            />
          </View>
        </View>

        <SectionTitle label="IDIOMA" />
        <View style={styles.card}>
          <View style={styles.fullToggleRow}>
            {IDIOMA_OPTIONS.map(opt => {
              const active = idioma === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.fullToggleBtn, active && styles.fullToggleBtnActive]}
                  onPress={() => setIdioma(opt.value)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.fullToggleText, active && styles.fullToggleTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.saveBtnText}>Salvar</Text>
          }
        </TouchableOpacity>

        <View style={styles.linksCard}>
          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => navigation.navigate('Ajuda')}
            activeOpacity={0.7}
          >
            <Text style={styles.linkLabel}>Ajuda</Text>
            <Text style={styles.linkArrow}>›</Text>
          </TouchableOpacity>
          <View style={styles.linkDivider} />
          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => navigation.navigate('SaibaMais')}
            activeOpacity={0.7}
          >
            <Text style={styles.linkLabel}>Saiba mais sobre o AUREN</Text>
            <Text style={styles.linkArrow}>›</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const CARD_BG  = '#222222';
const SUBTLE   = '#2C2C2C';
const INPUT_BG = '#2A2A2A';

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 20, marginBottom: 24,
  },
  backBtn:     { width: 32, alignItems: 'center' },
  backArrow:   { fontSize: 32, color: colors.white, lineHeight: 34, marginTop: -4 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: colors.white },
  headerRight: { width: 32 },

  scroll: { paddingHorizontal: 20, paddingBottom: 48 },

  sectionTitle: {
    fontSize: 11, fontWeight: '700', color: colors.gray,
    letterSpacing: 1.2, marginBottom: 10, marginTop: 4,
  },

  card: {
    backgroundColor: CARD_BG, borderRadius: 16,
    paddingHorizontal: 16, marginBottom: 20, overflow: 'hidden',
  },
  divider: { height: 1, backgroundColor: SUBTLE },

  row: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingVertical: 14,
  },
  rowLabel: { fontSize: 15, fontWeight: '500', color: colors.white },
  rowHint:  { fontSize: 11, fontWeight: '400', color: colors.gray, marginTop: 2 },

  toggleGroup: { flexDirection: 'row', gap: 6 },
  toggleBtn: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8,
    backgroundColor: INPUT_BG,
  },
  toggleBtnActive: { backgroundColor: colors.primary },
  toggleText:       { fontSize: 12, fontWeight: '600', color: colors.gray },
  toggleTextActive: { color: colors.white },

  aparenciaRow: { flexDirection: 'row', gap: 8, paddingBottom: 14 },
  aparenciaBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 20,
    alignItems: 'center', backgroundColor: INPUT_BG,
    borderWidth: 1, borderColor: 'transparent',
  },
  aparenciaBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  aparenciaText:       { fontSize: 13, fontWeight: '600', color: colors.gray },
  aparenciaTextActive: { color: '#FFFFFF' },

  numInput: {
    backgroundColor: INPUT_BG, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 18, fontWeight: '700', color: colors.white,
    textAlign: 'center', minWidth: 56,
  },

  fullToggleRow: { flexDirection: 'row', gap: 10, paddingVertical: 14 },
  fullToggleBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    alignItems: 'center', backgroundColor: INPUT_BG,
  },
  fullToggleBtnActive: { backgroundColor: colors.primary },
  fullToggleText:       { fontSize: 14, fontWeight: '600', color: colors.gray },
  fullToggleTextActive: { color: colors.white },

  saveBtn: {
    height: 54, borderRadius: 14, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', marginTop: 4,
  },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: colors.white },

  linksCard: {
    backgroundColor: CARD_BG, borderRadius: 16,
    overflow: 'hidden', marginTop: 20,
  },
  linkRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 16,
  },
  linkDivider: { height: 1, backgroundColor: SUBTLE, marginHorizontal: 18 },
  linkLabel:   { fontSize: 15, fontWeight: '500', color: colors.white },
  linkArrow:   { fontSize: 20, color: '#444444', lineHeight: 22 },
});
