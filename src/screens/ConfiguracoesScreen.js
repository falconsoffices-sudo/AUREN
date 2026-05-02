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
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  { label: 'EN-US',    value: 'en' },
];

const DIAS_SEMANA = [
  { label: 'Dom', value: 'dom' },
  { label: 'Seg', value: 'seg' },
  { label: 'Ter', value: 'ter' },
  { label: 'Qua', value: 'qua' },
  { label: 'Qui', value: 'qui' },
  { label: 'Sex', value: 'sex' },
  { label: 'Sáb', value: 'sab' },
];

const DEFAULT_HORARIO = {
  dias: ['seg', 'ter', 'qua', 'qui', 'sex'],
  inicio: '08:00',
  fim: '17:00',
  almocoInicio: '12:00',
  almocoFim: '13:00',
};

const DEFAULT_HORARIO_ESPECIAL = {
  ativo:  false,
  dias:   ['sab', 'dom'],
  inicio: '09:00',
  fim:    '18:00',
};

export default function ConfiguracoesScreen({ navigation }) {
  const { themeMode, setThemeMode } = useTheme();

  const [loading,          setLoading]          = useState(true);
  const [saving,           setSaving]           = useState(false);
  const [userId,           setUserId]           = useState(null);

  const [notificacoes,      setNotificacoes]      = useState('on');
  const [dataFechamento,    setDataFechamento]    = useState('28');
  const [idioma,            setIdioma]            = useState('pt');
  const [horario,           setHorario]           = useState(DEFAULT_HORARIO);
  const [horarioEspecial,   setHorarioEspecial]   = useState(DEFAULT_HORARIO_ESPECIAL);

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
      try {
        const storedH = await AsyncStorage.getItem('auren:horario_atendimento');
        if (storedH) setHorario({ ...DEFAULT_HORARIO, ...JSON.parse(storedH) });
        const storedE = await AsyncStorage.getItem('auren:horario_especial');
        if (storedE) setHorarioEspecial({ ...DEFAULT_HORARIO_ESPECIAL, ...JSON.parse(storedE) });
      } catch {}
      setLoading(false);
    })();
  }, []);

  function toggleDia(value) {
    setHorario(h => {
      const dias = h.dias.includes(value)
        ? h.dias.filter(d => d !== value)
        : [...h.dias, value];
      return { ...h, dias };
    });
  }

  function toggleDiaEspecial(value) {
    setHorarioEspecial(h => {
      const dias = (h.dias ?? []).includes(value)
        ? (h.dias ?? []).filter(d => d !== value)
        : [...(h.dias ?? []), value];
      return { ...h, dias };
    });
  }

  const handleSave = async () => {
    const dia = parseInt(dataFechamento, 10);
    if (!dia || dia < 1 || dia > 31) {
      Alert.alert('Valor inválido', 'A data de fechamento deve ser entre 1 e 31.');
      return;
    }
    setSaving(true);
    try {
      await AsyncStorage.setItem('auren:horario_atendimento', JSON.stringify(horario));
      await AsyncStorage.setItem('auren:horario_especial', JSON.stringify(horarioEspecial));
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id:                   userId,
          notificacoes,
          modo_app:             themeMode,
          data_fechamento:      dia,
          idioma,
          horario_atendimento:  horario,
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

        <SectionTitle label="HORÁRIO DE ATENDIMENTO" />

        {/* Grupo: Horários recomendados */}
        <Text style={styles.subSectionTitle}>Horários recomendados</Text>
        <View style={styles.card}>
          <View style={{ paddingVertical: 14 }}>
            <Text style={styles.rowLabel}>Dias de atendimento</Text>
            <View style={styles.daysRow}>
              {DIAS_SEMANA.map(d => {
                const active = horario.dias.includes(d.value);
                return (
                  <TouchableOpacity
                    key={d.value}
                    style={[styles.dayBtn, active && styles.dayBtnActive]}
                    onPress={() => toggleDia(d.value)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.dayBtnText, active && styles.dayBtnTextActive]}>{d.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>Manhã início</Text>
              <Text style={styles.rowHint}>Recomendado: 8AM</Text>
            </View>
            <TextInput
              style={styles.numInput}
              value={horario.inicio}
              onChangeText={t => setHorario(h => ({ ...h, inicio: t }))}
              placeholder="08:00"
              placeholderTextColor={colors.gray}
              keyboardType="numbers-and-punctuation"
              maxLength={5}
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>Pausa início</Text>
              <Text style={styles.rowHint}>Recomendado: 12PM</Text>
            </View>
            <TextInput
              style={styles.numInput}
              value={horario.almocoInicio}
              onChangeText={t => setHorario(h => ({ ...h, almocoInicio: t }))}
              placeholder="12:00"
              placeholderTextColor={colors.gray}
              keyboardType="numbers-and-punctuation"
              maxLength={5}
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>Pausa fim</Text>
              <Text style={styles.rowHint}>Recomendado: 1PM</Text>
            </View>
            <TextInput
              style={styles.numInput}
              value={horario.almocoFim}
              onChangeText={t => setHorario(h => ({ ...h, almocoFim: t }))}
              placeholder="13:00"
              placeholderTextColor={colors.gray}
              keyboardType="numbers-and-punctuation"
              maxLength={5}
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>Tarde fim</Text>
              <Text style={styles.rowHint}>Recomendado: 5PM</Text>
            </View>
            <TextInput
              style={styles.numInput}
              value={horario.fim}
              onChangeText={t => setHorario(h => ({ ...h, fim: t }))}
              placeholder="17:00"
              placeholderTextColor={colors.gray}
              keyboardType="numbers-and-punctuation"
              maxLength={5}
            />
          </View>
        </View>

        {/* Grupo: Horários especiais */}
        <Text style={styles.subSectionTitle}>Horários especiais</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>Bloco adicional</Text>
              <Text style={styles.rowHint}>Ex: Sáb-Dom, 9:00 AM às 6:00 PM</Text>
            </View>
            <TouchableOpacity
              style={[styles.toggleBtn, horarioEspecial.ativo && styles.toggleBtnActive]}
              onPress={() => setHorarioEspecial(h => ({ ...h, ativo: !h.ativo }))}
              activeOpacity={0.75}
            >
              <Text style={[styles.toggleText, horarioEspecial.ativo && styles.toggleTextActive]}>
                {horarioEspecial.ativo ? 'Ativo' : 'Inativo'}
              </Text>
            </TouchableOpacity>
          </View>
          {horarioEspecial.ativo && (
            <>
              <View style={styles.divider} />
              <View style={{ paddingVertical: 14 }}>
                <Text style={styles.rowLabel}>Dias</Text>
                <Text style={styles.rowHint}>Dias com horário especial</Text>
                <View style={styles.daysRow}>
                  {DIAS_SEMANA.map(d => {
                    const active = (horarioEspecial.dias ?? []).includes(d.value);
                    return (
                      <TouchableOpacity
                        key={d.value}
                        style={[styles.dayBtn, active && styles.dayBtnActive]}
                        onPress={() => toggleDiaEspecial(d.value)}
                        activeOpacity={0.75}
                      >
                        <Text style={[styles.dayBtnText, active && styles.dayBtnTextActive]}>{d.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
              <View style={styles.divider} />
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Início</Text>
                <TextInput
                  style={styles.numInput}
                  value={horarioEspecial.inicio}
                  onChangeText={t => setHorarioEspecial(h => ({ ...h, inicio: t }))}
                  placeholder="09:00"
                  placeholderTextColor={colors.gray}
                  keyboardType="numbers-and-punctuation"
                  maxLength={5}
                />
              </View>
              <View style={styles.divider} />
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Fim</Text>
                <TextInput
                  style={styles.numInput}
                  value={horarioEspecial.fim}
                  onChangeText={t => setHorarioEspecial(h => ({ ...h, fim: t }))}
                  placeholder="18:00"
                  placeholderTextColor={colors.gray}
                  keyboardType="numbers-and-punctuation"
                  maxLength={5}
                />
              </View>
            </>
          )}
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
            onPress={() => navigation.navigate('Indicacao')}
            activeOpacity={0.7}
          >
            <Text style={styles.linkLabel}>Indicar um profissional</Text>
            <Text style={styles.linkArrow}>›</Text>
          </TouchableOpacity>
          <View style={styles.linkDivider} />
          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => navigation.navigate('Tutoriais')}
            activeOpacity={0.7}
          >
            <Text style={styles.linkLabel}>Tutoriais</Text>
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
          <View style={styles.linkDivider} />
          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => navigation.navigate('Politicas')}
            activeOpacity={0.7}
          >
            <Text style={styles.linkLabel}>Termos e Privacidade</Text>
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

  daysRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingTop: 10, paddingBottom: 4 },
  dayBtn: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
    backgroundColor: INPUT_BG,
  },
  dayBtnActive: { backgroundColor: colors.primary },
  dayBtnText: { fontSize: 12, fontWeight: '600', color: colors.gray },
  dayBtnTextActive: { color: colors.white },

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
