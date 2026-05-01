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

// ─── Constants ────────────────────────────────────────────────────────────────

const US_STATES = [
  { sigla: 'AL', nome: 'Alabama' },       { sigla: 'AK', nome: 'Alaska' },
  { sigla: 'AZ', nome: 'Arizona' },       { sigla: 'AR', nome: 'Arkansas' },
  { sigla: 'CA', nome: 'California' },    { sigla: 'CO', nome: 'Colorado' },
  { sigla: 'CT', nome: 'Connecticut' },   { sigla: 'DE', nome: 'Delaware' },
  { sigla: 'FL', nome: 'Florida' },       { sigla: 'GA', nome: 'Georgia' },
  { sigla: 'HI', nome: 'Hawaii' },        { sigla: 'ID', nome: 'Idaho' },
  { sigla: 'IL', nome: 'Illinois' },      { sigla: 'IN', nome: 'Indiana' },
  { sigla: 'IA', nome: 'Iowa' },          { sigla: 'KS', nome: 'Kansas' },
  { sigla: 'KY', nome: 'Kentucky' },      { sigla: 'LA', nome: 'Louisiana' },
  { sigla: 'ME', nome: 'Maine' },         { sigla: 'MD', nome: 'Maryland' },
  { sigla: 'MA', nome: 'Massachusetts' }, { sigla: 'MI', nome: 'Michigan' },
  { sigla: 'MN', nome: 'Minnesota' },     { sigla: 'MS', nome: 'Mississippi' },
  { sigla: 'MO', nome: 'Missouri' },      { sigla: 'MT', nome: 'Montana' },
  { sigla: 'NE', nome: 'Nebraska' },      { sigla: 'NV', nome: 'Nevada' },
  { sigla: 'NH', nome: 'New Hampshire' }, { sigla: 'NJ', nome: 'New Jersey' },
  { sigla: 'NM', nome: 'New Mexico' },    { sigla: 'NY', nome: 'New York' },
  { sigla: 'NC', nome: 'North Carolina' },{ sigla: 'ND', nome: 'North Dakota' },
  { sigla: 'OH', nome: 'Ohio' },          { sigla: 'OK', nome: 'Oklahoma' },
  { sigla: 'OR', nome: 'Oregon' },        { sigla: 'PA', nome: 'Pennsylvania' },
  { sigla: 'RI', nome: 'Rhode Island' },  { sigla: 'SC', nome: 'South Carolina' },
  { sigla: 'SD', nome: 'South Dakota' },  { sigla: 'TN', nome: 'Tennessee' },
  { sigla: 'TX', nome: 'Texas' },         { sigla: 'UT', nome: 'Utah' },
  { sigla: 'VT', nome: 'Vermont' },       { sigla: 'VA', nome: 'Virginia' },
  { sigla: 'WA', nome: 'Washington' },    { sigla: 'WV', nome: 'West Virginia' },
  { sigla: 'WI', nome: 'Wisconsin' },     { sigla: 'WY', nome: 'Wyoming' },
];

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

function AddressFields({ value, onChange }) {
  const [pickerVisible, setPickerVisible] = useState(false);
  const set = (key) => (text) => onChange({ ...value, [key]: text });

  return (
    <>
      <TextInput
        style={styles.input}
        placeholder="Street Address *"
        placeholderTextColor={colors.gray}
        value={value.street}
        onChangeText={set('street')}
        autoCapitalize="words"
        returnKeyType="next"
      />
      <TextInput
        style={styles.input}
        placeholder="Apt / Suite / Unit (opcional)"
        placeholderTextColor={colors.gray}
        value={value.apt}
        onChangeText={set('apt')}
        autoCapitalize="words"
        returnKeyType="next"
      />
      <TextInput
        style={styles.input}
        placeholder="City"
        placeholderTextColor={colors.gray}
        value={value.city}
        onChangeText={set('city')}
        autoCapitalize="words"
        returnKeyType="next"
      />
      <TouchableOpacity
        style={[styles.input, styles.stateField]}
        onPress={() => setPickerVisible(true)}
        activeOpacity={0.8}
      >
        <Text style={value.state ? styles.inputText : styles.inputPlaceholder}>
          {value.state || 'State'}
        </Text>
        <Text style={styles.stateArrow}>▼</Text>
      </TouchableOpacity>
      <TextInput
        style={styles.input}
        placeholder="ZIP Code *"
        placeholderTextColor={colors.gray}
        value={value.zip}
        onChangeText={t => onChange({ ...value, zip: t.replace(/\D/g, '').slice(0, 5) })}
        keyboardType="numeric"
        maxLength={5}
        returnKeyType="done"
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
    </>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function EnderecosScreen({ navigation }) {
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [userId,       setUserId]       = useState(null);

  const [comercial,   setComercial]   = useState({ ...EMPTY_ADDRESS });
  const [residencial, setResidencial] = useState({ ...EMPTY_ADDRESS });
  const [taxa,        setTaxa]        = useState('');

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

        <SectionCard title="Residencial" accent="#3B5BA5">
          <AddressFields value={residencial} onChange={setResidencial} />
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

  saveBtn: {
    height: 54, borderRadius: 14, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', marginTop: 4,
  },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: colors.white },
});
