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
import AsyncStorage from '@react-native-async-storage/async-storage';
import colors from '../constants/colors';

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'auren:sms_templates';

const PLACEHOLDERS = ['[nome]', '[horario]', '[servico]', '[nome_profissional]'];

const TEMPLATES_DEFAULT = {
  confirmacao: 'Olá [nome]! Seu agendamento de [servico] está confirmado para [horario]. Qualquer dúvida, entre em contato. — [nome_profissional]',
  lembrete24h: 'Oi [nome]! Lembrando que seu [servico] está agendado para amanhã às [horario]. Até lá! — [nome_profissional]',
  lembrete1h:  'Oi [nome]! Seu [servico] começa em 1 hora ([horario]). Precisando de rota, me manda mensagem. Até já! — [nome_profissional]',
  agradecimento: 'Obrigada pela sua visita, [nome]! Foi um prazer te atender. Qualquer dúvida, estou aqui. — [nome_profissional]',
};

const TEMPLATE_META = [
  {
    key:     'confirmacao',
    title:   'Confirmação de agendamento',
    accent:  '#2A7A4B',
  },
  {
    key:    'lembrete24h',
    title:  'Lembrete 24h antes',
    accent: '#3B5BA5',
  },
  {
    key:    'lembrete1h',
    title:  'Lembrete 1h antes com rota',
    accent: '#7A5A2A',
  },
  {
    key:    'agradecimento',
    title:  'Agradecimento pós atendimento',
    accent: colors.primary,
  },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function PlaceholderChips() {
  return (
    <View style={styles.chips}>
      {PLACEHOLDERS.map(p => (
        <View key={p} style={styles.chip}>
          <Text style={styles.chipText}>{p}</Text>
        </View>
      ))}
    </View>
  );
}

function TemplateCard({ title, accent, value, onChange }) {
  return (
    <View style={styles.card}>
      <View style={[styles.cardAccent, { backgroundColor: accent }]} />
      <Text style={styles.cardTitle}>{title}</Text>
      <TextInput
        style={styles.templateInput}
        value={value}
        onChangeText={onChange}
        multiline
        textAlignVertical="top"
        placeholderTextColor={colors.gray}
        placeholder="Digite o template..."
      />
      <PlaceholderChips />
    </View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function TemplatesSMSScreen({ navigation }) {
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [templates, setTemplates] = useState({ ...TEMPLATES_DEFAULT });

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          setTemplates({ ...TEMPLATES_DEFAULT, ...JSON.parse(stored) });
        }
      } catch {
        // usa defaults se falhar
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const setTemplate = (key) => (text) =>
    setTemplates(prev => ({ ...prev, [key]: text }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
      Alert.alert('Salvo!', 'Templates atualizados.');
    } catch {
      Alert.alert('Erro ao salvar', 'Não foi possível salvar os templates.');
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
        <Text style={styles.headerTitle}>Templates de SMS</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.intro}>
          Use os placeholders abaixo para personalizar as mensagens. Eles serão substituídos automaticamente ao enviar.
        </Text>

        {TEMPLATE_META.map(meta => (
          <TemplateCard
            key={meta.key}
            title={meta.title}
            accent={meta.accent}
            value={templates[meta.key]}
            onChange={setTemplate(meta.key)}
          />
        ))}

        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.saveBtnText}>Salvar templates</Text>
          }
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const CARD_BG  = '#222222';
const INPUT_BG = '#1A1A1A';

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

  intro: {
    fontSize: 13, fontWeight: '400', color: colors.gray,
    lineHeight: 19, marginBottom: 20,
  },

  card: {
    backgroundColor: CARD_BG, borderRadius: 16,
    padding: 16, marginBottom: 16, overflow: 'hidden',
  },
  cardAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  cardTitle: {
    fontSize: 13, fontWeight: '700', color: colors.white,
    marginLeft: 8, marginBottom: 12, letterSpacing: 0.3,
  },

  templateInput: {
    backgroundColor: INPUT_BG, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, fontWeight: '400', color: colors.white,
    lineHeight: 20, minHeight: 90, marginBottom: 10,
  },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    backgroundColor: '#2A2A2A', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  chipText: { fontSize: 11, fontWeight: '600', color: '#6B4A58' },

  saveBtn: {
    height: 54, borderRadius: 14, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', marginTop: 8,
  },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: colors.white },
});
