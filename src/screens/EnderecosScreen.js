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
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import colors from '../constants/colors';
import US_STATES from '../constants/usStates';

// ─── Constants ────────────────────────────────────────────────────────────────

// ─── Helpers ─────────────────────────────────────────────────────────────────

const EMPTY_ADDRESS = { street: '', apt: '', city: '', state: '', zip: '' };

function parseAddress(jsonStr) {
  if (!jsonStr) return { ...EMPTY_ADDRESS };
  try {
    const raw = JSON.parse(jsonStr);
    return {
      street: raw.street ?? raw.rua    ?? '',
      apt:    raw.apt    ?? raw.numero  ?? '',
      city:   raw.city   ?? raw.cidade  ?? '',
      state:  raw.state  ?? raw.estado  ?? '',
      zip:    raw.zip    ?? '',
    };
  } catch { return { ...EMPTY_ADDRESS }; }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionCard({ title, accent, children }) {
  return (
    <View style={styles.card}>
      <View style={[styles.cardAccent, { backgroundColor: accent }]} />
      <Text style={styles.cardTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Field({ label, children }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function AddressFields({ value, onChange, disabled = false }) {
  const [pickerVisible, setPickerVisible] = useState(false);
  const set = (key) => (text) => { if (!disabled) onChange({ ...value, [key]: text }); };

  return (
    <View style={disabled && styles.disabledBlock}>
      <TextInput
        style={styles.input}
        placeholder="Street Address *"
        placeholderTextColor={colors.gray}
        value={value.street}
        onChangeText={set('street')}
        autoCapitalize="words"
        returnKeyType="next"
        editable={!disabled}
      />
      <TextInput
        style={styles.input}
        placeholder="Apt / Suite / Unit (opcional)"
        placeholderTextColor={colors.gray}
        value={value.apt}
        onChangeText={set('apt')}
        autoCapitalize="words"
        returnKeyType="next"
        editable={!disabled}
      />
      <TextInput
        style={styles.input}
        placeholder="City"
        placeholderTextColor={colors.gray}
        value={value.city}
        onChangeText={set('city')}
        autoCapitalize="words"
        returnKeyType="next"
        editable={!disabled}
      />
      <TouchableOpacity
        style={[styles.input, styles.stateField]}
        onPress={() => !disabled && setPickerVisible(true)}
        activeOpacity={disabled ? 1 : 0.8}
      >
        <Text style={value.state ? styles.inputText : styles.inputPlaceholder}>
          {value.state || 'State'}
        </Text>
        {!disabled && <Text style={styles.stateArrow}>▼</Text>}
      </TouchableOpacity>
      <TextInput
        style={styles.input}
        placeholder="ZIP Code *"
        placeholderTextColor={colors.gray}
        value={value.zip}
        onChangeText={t => { if (!disabled) onChange({ ...value, zip: t.replace(/\D/g, '').slice(0, 5) }); }}
        keyboardType="numeric"
        maxLength={5}
        returnKeyType="done"
        editable={!disabled}
      />

      <Modal
        visible={pickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerVisible(false)}
      >
        <View style={styles.pickerBackdrop}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setPickerVisible(false)} activeOpacity={1} />
          <View style={styles.pickerSheet}>
            <View style={styles.pickerHandle} />
            <Text style={styles.pickerTitle}>Selecionar Estado</Text>
            <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
              {US_STATES.map((st, idx) => (
                <TouchableOpacity
                  key={st.sigla}
                  style={[
                    styles.pickerItem,
                    idx < US_STATES.length - 1 && styles.pickerItemBorder,
                    value.state === st.sigla && styles.pickerItemActive,
                  ]}
                  onPress={() => { onChange({ ...value, state: st.sigla }); setPickerVisible(false); }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.pickerItemText, value.state === st.sigla && styles.pickerItemTextActive]}>
                    {st.sigla} — {st.nome}
                  </Text>
                </TouchableOpacity>
              ))}
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function EnderecosScreen({ navigation }) {
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [userId,       setUserId]       = useState(null);

  const [comercial,     setComercial]     = useState({ ...EMPTY_ADDRESS });
  const [residencial,   setResidencial]   = useState({ ...EMPTY_ADDRESS });
  const [taxa,          setTaxa]          = useState('');
  const [mesmoEndereco, setMesmoEndereco] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData?.user?.id;
      if (!uid) { setLoading(false); return; }
      setUserId(uid);

      const { data, error } = await supabase
        .from('profiles')
        .select('endereco_comercial, endereco_residencial, taxa_deslocamento')
        .eq('id', uid)
        .single();

      if (data) {
        setComercial(parseAddress(data.endereco_comercial));
        setResidencial(parseAddress(data.endereco_residencial));
        setTaxa(data.taxa_deslocamento != null ? String(data.taxa_deslocamento) : '');
      } else if (error && error.code !== 'PGRST116') {
        Alert.alert('Erro ao carregar', error.message);
      }
      setLoading(false);
    })();
  }, []);

  const handleSave = async () => {
    if (!comercial.street.trim()) {
      Alert.alert('Campo obrigatório', 'Informe o Street Address do endereço comercial.');
      return;
    }
    if (!comercial.zip || !/^\d{5}$/.test(comercial.zip)) {
      Alert.alert('ZIP Code inválido', 'O ZIP Code comercial deve ter 5 dígitos.');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id:                   userId,
          endereco_comercial:   JSON.stringify(comercial),
          endereco_residencial: JSON.stringify(residencial),
          taxa_deslocamento:    taxa ? parseFloat(taxa.replace(/[^0-9.]/g, '')) : null,
        });
      if (error) throw error;
      Alert.alert('Salvo!', 'Endereços atualizados.');
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
        <Text style={styles.headerTitle}>Endereços</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        <SectionCard title="Comercial" accent="#A8235A">
          <AddressFields value={comercial} onChange={setComercial} />
        </SectionCard>

        <TouchableOpacity
          style={styles.checkboxRow}
          onPress={() => {
            if (!mesmoEndereco) {
              setResidencial({ ...comercial });
            } else {
              setResidencial({ ...EMPTY_ADDRESS });
            }
            setMesmoEndereco(v => !v);
          }}
          activeOpacity={0.75}
        >
          <View style={[styles.checkbox, mesmoEndereco && styles.checkboxChecked]}>
            {mesmoEndereco && <Text style={styles.checkboxMark}>✓</Text>}
          </View>
          <Text style={styles.checkboxLabel}>
            Meu endereço residencial é o mesmo que o comercial
          </Text>
        </TouchableOpacity>

        <SectionCard title="Residencial" accent="#3B5BA5">
          <AddressFields
            value={residencial}
            onChange={setResidencial}
            disabled={mesmoEndereco}
          />
        </SectionCard>

        <SectionCard title="A domicílio" accent="#2A7A4B">
          <Field label="Taxa de deslocamento ($)">
            <TextInput
              style={styles.input}
              placeholder="Ex: 15.00"
              placeholderTextColor={colors.gray}
              value={taxa}
              onChangeText={setTaxa}
              keyboardType="decimal-pad"
              returnKeyType="done"
            />
          </Field>
        </SectionCard>

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
const INPUT_BG = '#2A2A2A';

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

  card: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  cardAccent: {
    position: 'absolute', left: 0, top: 0, bottom: 0, width: 4,
  },
  cardTitle: {
    fontSize: 13, fontWeight: '700', color: colors.white,
    letterSpacing: 0.5, marginBottom: 16, marginLeft: 8,
  },

  fieldWrap:  { marginBottom: 12 },
  fieldLabel: {
    fontSize: 11, fontWeight: '700', color: colors.gray,
    letterSpacing: 1.1, textTransform: 'uppercase', marginBottom: 6,
  },

  input: {
    backgroundColor: INPUT_BG, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, fontWeight: '400', color: colors.white,
    marginBottom: 10,
  },
  inputText:        { color: colors.white },
  inputPlaceholder: { color: colors.gray },

  stateField: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  stateArrow: { fontSize: 11, color: colors.gray, marginLeft: 8 },

  pickerBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 24, paddingTop: 12, maxHeight: '75%',
  },
  pickerHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#2A2A2A', alignSelf: 'center', marginBottom: 20,
  },
  pickerTitle:         { fontSize: 18, fontWeight: '700', color: colors.white, marginBottom: 16 },
  pickerItem:          { paddingVertical: 14 },
  pickerItemBorder:    { borderBottomWidth: 1, borderBottomColor: '#2A2A2A' },
  pickerItemActive:    { backgroundColor: 'rgba(168,35,90,0.08)' },
  pickerItemText:      { fontSize: 15, fontWeight: '400', color: colors.white },
  pickerItemTextActive:{ fontWeight: '700', color: colors.primary },

  checkboxRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginBottom: 14, paddingHorizontal: 2,
  },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2,
    borderColor: colors.primary, alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  checkboxChecked: { backgroundColor: colors.primary },
  checkboxMark:    { fontSize: 13, fontWeight: '800', color: colors.white, lineHeight: 15 },
  checkboxLabel:   { fontSize: 13, fontWeight: '500', color: colors.white, flex: 1, lineHeight: 18 },

  disabledBlock: { opacity: 0.45 },

  saveBtn: {
    height: 54, borderRadius: 14, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', marginTop: 4,
  },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: colors.white },
});
