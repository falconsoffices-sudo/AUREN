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

// ─── Helpers ─────────────────────────────────────────────────────────────────

const EMPTY_ADDRESS = { rua: '', numero: '', cidade: '', estado: '', zip: '' };

function parseAddress(jsonStr) {
  if (!jsonStr) return { ...EMPTY_ADDRESS };
  try { return { ...EMPTY_ADDRESS, ...JSON.parse(jsonStr) }; }
  catch { return { ...EMPTY_ADDRESS }; }
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
  const set = (key) => (text) => onChange({ ...value, [key]: text });
  return (
    <>
      <View style={styles.row}>
        <TextInput
          style={[styles.input, { flex: 1, marginRight: 8 }]}
          placeholder="Rua / Avenida"
          placeholderTextColor={colors.gray}
          value={value.rua}
          onChangeText={set('rua')}
          autoCapitalize="words"
          returnKeyType="next"
        />
        <TextInput
          style={[styles.input, { width: 72 }]}
          placeholder="Nº"
          placeholderTextColor={colors.gray}
          value={value.numero}
          onChangeText={set('numero')}
          returnKeyType="next"
        />
      </View>
      <View style={styles.row}>
        <TextInput
          style={[styles.input, { flex: 1, marginRight: 8 }]}
          placeholder="Cidade"
          placeholderTextColor={colors.gray}
          value={value.cidade}
          onChangeText={set('cidade')}
          autoCapitalize="words"
          returnKeyType="next"
        />
        <TextInput
          style={[styles.input, { width: 52 }]}
          placeholder="UF"
          placeholderTextColor={colors.gray}
          value={value.estado}
          onChangeText={set('estado')}
          autoCapitalize="characters"
          maxLength={2}
          returnKeyType="next"
        />
      </View>
      <TextInput
        style={styles.input}
        placeholder="ZIP Code"
        placeholderTextColor={colors.gray}
        value={value.zip}
        onChangeText={set('zip')}
        keyboardType="numeric"
        maxLength={10}
        returnKeyType="done"
      />
    </>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function EnderecosScreen({ navigation }) {
  const [loading,       setLoading]       = useState(true);
  const [saving,        setSaving]        = useState(false);
  const [userId,        setUserId]        = useState(null);

  const [comercial,    setComercial]    = useState({ ...EMPTY_ADDRESS });
  const [residencial,  setResidencial]  = useState({ ...EMPTY_ADDRESS });
  const [taxa,         setTaxa]         = useState('');

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

  row: { flexDirection: 'row', marginBottom: 0 },

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

  saveBtn: {
    height: 54, borderRadius: 14, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', marginTop: 4,
  },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: colors.white },
});
