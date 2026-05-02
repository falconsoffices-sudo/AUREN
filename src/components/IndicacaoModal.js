import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { supabase } from '../lib/supabase';

const EMPTY = () => ({ nome: '', fone: '', tipo: 'profissional' });

export default function IndicacaoModal({ visible, onClose, momento, title, subtitle }) {
  const [rows, setRows] = useState([EMPTY()]);
  const [saving, setSaving] = useState(false);

  function reset() { setRows([EMPTY()]); }
  function handleClose() { reset(); onClose(false); }

  function addRow() {
    if (rows.length >= 5) return;
    setRows(r => [...r, EMPTY()]);
  }

  function updateRow(i, field, val) {
    setRows(r => r.map((row, idx) => idx === i ? { ...row, [field]: val } : row));
  }

  async function enviar() {
    const validas = rows.filter(r => r.nome.trim() && r.fone.trim());
    if (validas.length === 0) {
      Alert.alert('Atenção', 'Preencha pelo menos um nome e telefone.');
      return;
    }
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData?.user?.id;
      if (!uid) return;

      const { error } = await supabase.from('indicacoes').insert(
        validas.map(r => ({
          profissional_id:  uid,
          indicado_nome:    r.nome.trim(),
          indicado_contato: r.fone.trim(),
          tipo:             r.tipo,
          momento,
          status:           'enviado',
        }))
      );
      if (error) throw error;

      for (const r of validas) {
        const msg = r.tipo === 'profissional'
          ? `Oi! Uma profissional te indicou o AUREN — app de gestão para nail pros. Saiba mais: auren.app`
          : `Oi! Te convidaram para agendar pelo AUREN, app das melhores nail pros. Acesse: auren.app`;
        console.log(`[SMS → ${r.fone}] ${msg}`);
      }

      reset();
      onClose(true);
    } catch (err) {
      Alert.alert('Erro', err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={s.backdrop}>
        <TouchableOpacity style={{ flex: 1 }} onPress={handleClose} activeOpacity={1} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={s.sheet}>
            <View style={s.handle} />
            <Text style={s.title}>{title}</Text>
            {subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {rows.map((row, i) => (
                <View key={i} style={s.rowBlock}>
                  {rows.length > 1 && (
                    <Text style={s.rowNum}>INDICAÇÃO {i + 1}</Text>
                  )}
                  <TextInput
                    style={s.input}
                    placeholder="Nome"
                    placeholderTextColor="#C9A8B6"
                    value={row.nome}
                    onChangeText={v => updateRow(i, 'nome', v)}
                    autoCapitalize="words"
                    returnKeyType="next"
                  />
                  <TextInput
                    style={s.input}
                    placeholder="Telefone"
                    placeholderTextColor="#C9A8B6"
                    value={row.fone}
                    onChangeText={v => updateRow(i, 'fone', v)}
                    keyboardType="phone-pad"
                    returnKeyType="done"
                  />
                  <View style={s.tipoRow}>
                    {[
                      { key: 'profissional', label: 'Profissional' },
                      { key: 'cliente',      label: 'Cliente' },
                    ].map(t => (
                      <TouchableOpacity
                        key={t.key}
                        style={[s.tipoBtn, row.tipo === t.key && s.tipoBtnActive]}
                        onPress={() => updateRow(i, 'tipo', t.key)}
                        activeOpacity={0.75}
                      >
                        <Text style={[s.tipoBtnText, row.tipo === t.key && s.tipoBtnTextActive]}>
                          {t.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ))}

              {rows.length < 5 && (
                <TouchableOpacity style={s.addBtn} onPress={addRow} activeOpacity={0.75}>
                  <Text style={s.addBtnText}>+ Indicar mais</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[s.sendBtn, saving && { opacity: 0.65 }]}
                onPress={enviar}
                disabled={saving}
                activeOpacity={0.85}
              >
                {saving
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={s.sendBtnText}>Enviar indicações</Text>}
              </TouchableOpacity>

              <TouchableOpacity style={s.skipBtn} onPress={handleClose} activeOpacity={0.7}>
                <Text style={s.skipBtnText}>Agora não</Text>
              </TouchableOpacity>

              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#0E0F11',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 22, paddingTop: 12, maxHeight: '90%',
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#2A2A2A', alignSelf: 'center', marginBottom: 18,
  },
  title:    { fontSize: 20, fontWeight: '700', color: '#F5EDE8', marginBottom: 6 },
  subtitle: { fontSize: 13, fontWeight: '400', color: '#C9A8B6', marginBottom: 18, lineHeight: 18 },

  rowBlock: { marginBottom: 18 },
  rowNum:   { fontSize: 10, fontWeight: '700', color: '#A8235A', letterSpacing: 1.2, marginBottom: 8 },

  input: {
    backgroundColor: '#1A1B1E', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 13,
    fontSize: 15, color: '#F5EDE8', marginBottom: 10,
  },

  tipoRow:           { flexDirection: 'row', gap: 10 },
  tipoBtn:           { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: '#1A1B1E', alignItems: 'center' },
  tipoBtnActive:     { backgroundColor: '#A8235A' },
  tipoBtnText:       { fontSize: 13, fontWeight: '600', color: '#C9A8B6' },
  tipoBtnTextActive: { color: '#FFFFFF' },

  addBtn:     { borderWidth: 1, borderColor: '#A8235A', borderRadius: 10, paddingVertical: 11, alignItems: 'center', marginBottom: 14 },
  addBtnText: { fontSize: 14, fontWeight: '600', color: '#A8235A' },

  sendBtn:     { backgroundColor: '#A8235A', borderRadius: 14, height: 52, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  sendBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },

  skipBtn:     { alignItems: 'center', paddingVertical: 12 },
  skipBtnText: { fontSize: 14, fontWeight: '500', color: '#8A8A8E' },
});
