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
import colors from '../constants/colors';

// ─── Constants ────────────────────────────────────────────────────────────────

const ESTADOS = ['FL', 'TX', 'CA', 'NY', 'Outro'];
const IDIOMAS  = [
  { label: 'PT-BR',    value: 'pt' },
  { label: 'ES-LATAM', value: 'es' },
];
const GENEROS  = [
  { label: 'Feminino',  value: 'feminino'  },
  { label: 'Masculino', value: 'masculino' },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function Field({ label, children }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function Toggle({ options, value, onChange }) {
  return (
    <View style={styles.toggleRow}>
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
  );
}

function EstadoDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <View>
      <TouchableOpacity
        style={[styles.input, styles.dropdownTrigger]}
        onPress={() => setOpen(o => !o)}
        activeOpacity={0.8}
      >
        <Text style={value ? styles.inputText : styles.inputPlaceholder}>
          {value || 'Selecione o estado'}
        </Text>
        <Text style={styles.dropdownArrow}>{open ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {open && (
        <View style={styles.dropdownList}>
          {ESTADOS.map((est, idx) => (
            <TouchableOpacity
              key={est}
              style={[
                styles.dropdownItem,
                idx < ESTADOS.length - 1 && styles.dropdownItemBorder,
                value === est && styles.dropdownItemActive,
              ]}
              onPress={() => { onChange(est); setOpen(false); }}
              activeOpacity={0.7}
            >
              <Text style={[styles.dropdownItemText, value === est && styles.dropdownItemTextActive]}>
                {est}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function MeusDadosScreen({ navigation }) {
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [userId,    setUserId]    = useState(null);

  const [nome,      setNome]      = useState('');
  const [telefone,  setTelefone]  = useState('');
  const [cidade,    setCidade]    = useState('');
  const [estado,    setEstado]    = useState('');
  const [idioma,    setIdioma]    = useState('pt');
  const [genero,    setGenero]    = useState('feminino');

  useEffect(() => {
    (async () => {
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData?.user?.id;
      if (!uid) { setLoading(false); return; }
      setUserId(uid);

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', uid)
        .single();

      if (data) {
        setNome(data.nome      ?? '');
        setTelefone(data.telefone ?? '');
        setCidade(data.cidade  ?? '');
        setEstado(data.estado  ?? '');
        setIdioma(data.idioma  ?? 'pt');
        setGenero(data.genero  ?? 'feminino');
      } else if (error && error.code !== 'PGRST116') {
        // PGRST116 = row not found (profile ainda não existe)
        Alert.alert('Erro ao carregar', error.message);
      }
      setLoading(false);
    })();
  }, []);

  const handleSave = async () => {
    if (!nome.trim()) {
      Alert.alert('Campo obrigatório', 'Informe o nome completo.');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id:       userId,
          nome:     nome.trim(),
          telefone: telefone.trim() || null,
          cidade:   cidade.trim()   || null,
          idioma,
          genero,
        });
      if (error) throw error;
      Alert.alert('Salvo!', 'Seus dados foram atualizados.');
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

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Meus Dados</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        <Field label="Nome completo">
          <TextInput
            style={[styles.input, styles.inputText]}
            placeholder="Seu nome completo"
            placeholderTextColor={colors.gray}
            value={nome}
            onChangeText={setNome}
            autoCapitalize="words"
            returnKeyType="next"
          />
        </Field>

        <Field label="Telefone">
          <TextInput
            style={[styles.input, styles.inputText]}
            placeholder="+1 (305) 555-0100"
            placeholderTextColor={colors.gray}
            value={telefone}
            onChangeText={setTelefone}
            keyboardType="phone-pad"
            returnKeyType="next"
          />
        </Field>

        <Field label="Cidade">
          <TextInput
            style={[styles.input, styles.inputText]}
            placeholder="Miami"
            placeholderTextColor={colors.gray}
            value={cidade}
            onChangeText={setCidade}
            autoCapitalize="words"
            returnKeyType="next"
          />
        </Field>

        <Field label="Estado">
          <EstadoDropdown value={estado} onChange={setEstado} />
        </Field>

        <Field label="Idioma">
          <Toggle options={IDIOMAS} value={idioma} onChange={setIdioma} />
        </Field>

        <Field label="Gênero">
          <Toggle options={GENEROS} value={genero} onChange={setGenero} />
        </Field>

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

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const CARD_BG  = '#222222';
const INPUT_BG = '#222222';
const SUBTLE   = '#2C2C2C';

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 20, marginBottom: 24,
  },
  backBtn:     { width: 32, alignItems: 'center' },
  backArrow:   { fontSize: 32, color: colors.white, lineHeight: 34, marginTop: -4 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: colors.white },
  headerRight: { width: 32 },

  scroll: { paddingHorizontal: 20, paddingBottom: 48 },

  fieldWrap:  { marginBottom: 20 },
  fieldLabel: {
    fontSize: 11, fontWeight: '700', color: colors.gray,
    letterSpacing: 1.1, textTransform: 'uppercase', marginBottom: 8,
  },

  input: {
    backgroundColor: INPUT_BG,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
  },
  inputText:        { color: colors.white, fontWeight: '400' },
  inputPlaceholder: { color: colors.gray,  fontWeight: '400' },

  // Dropdown
  dropdownTrigger: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  dropdownArrow: { fontSize: 11, color: colors.gray },
  dropdownList: {
    backgroundColor: CARD_BG,
    borderRadius: 12,
    marginTop: 6,
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingHorizontal: 16, paddingVertical: 14,
  },
  dropdownItemBorder: { borderBottomWidth: 1, borderBottomColor: SUBTLE },
  dropdownItemActive: { backgroundColor: 'rgba(168,35,90,0.15)' },
  dropdownItemText:       { fontSize: 15, fontWeight: '400', color: colors.white },
  dropdownItemTextActive: { fontWeight: '700', color: colors.primary },

  // Toggle
  toggleRow: { flexDirection: 'row', gap: 10 },
  toggleBtn: {
    flex: 1, paddingVertical: 13, borderRadius: 12,
    alignItems: 'center', backgroundColor: INPUT_BG,
  },
  toggleBtnActive: { backgroundColor: colors.primary },
  toggleText:       { fontSize: 14, fontWeight: '600', color: colors.gray },
  toggleTextActive: { color: colors.white },

  saveBtn: {
    height: 54, borderRadius: 14, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', marginTop: 12,
  },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: colors.white },
});
