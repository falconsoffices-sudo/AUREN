import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const OPCOES = [
  { id: 1, plano: 'Básico', meses: 1, preco: '$59',  label: 'Básico · 1 mês',   economia: null },
  { id: 2, plano: 'Pro',    meses: 1, preco: '$89',  label: 'Pro · 1 mês',       economia: null },
  { id: 3, plano: 'Pro',    meses: 3, preco: '$240', label: 'Pro · 3 meses',     economia: 'Economize $27' },
  { id: 4, plano: 'Pro',    meses: 6, preco: '$450', label: 'Pro · 6 meses',     economia: 'Economize $84' },
];

export default function PresentearScreen({ navigation }) {
  const [opcaoSelecionada, setOpcaoSelecionada] = useState(null);
  const [emailDestinatario, setEmailDestinatario] = useState('');
  const [mensagem, setMensagem] = useState('');

  function handleEnviar() {
    if (!opcaoSelecionada) {
      Alert.alert('Selecione um plano', 'Escolha uma opção de presente antes de continuar.');
      return;
    }
    if (!emailDestinatario.trim() || !emailDestinatario.includes('@')) {
      Alert.alert('E-mail inválido', 'Digite um endereço de e-mail válido para o presente.');
      return;
    }
    Alert.alert(
      'Em breve!',
      'O envio de presentes estará disponível em breve. Obrigada pelo interesse!',
      [{ text: 'OK' }],
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Presentear com AUREN</Text>
        <View style={styles.headerRight} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

          <Text style={styles.intro}>
            Presenteie uma colega com acesso ao AUREN. Escolha o plano e período ideal.
          </Text>

          <Text style={styles.sectionLabel}>ESCOLHA O PRESENTE</Text>
          {OPCOES.map(op => {
            const ativo = opcaoSelecionada?.id === op.id;
            return (
              <TouchableOpacity
                key={op.id}
                style={[styles.opcaoCard, ativo && styles.opcaoCardAtiva]}
                onPress={() => setOpcaoSelecionada(op)}
                activeOpacity={0.8}
              >
                <View style={styles.opcaoLeft}>
                  <Text style={[styles.opcaoLabel, ativo && styles.opcaoLabelAtiva]}>{op.label}</Text>
                  {op.economia && (
                    <View style={styles.economiaBadge}>
                      <Text style={styles.economiaText}>{op.economia}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.opcaoRight}>
                  <Text style={[styles.opcaoPreco, ativo && styles.opcaoPrecoAtivo]}>{op.preco}</Text>
                  <Text style={styles.opcaoPeriodo}>/total</Text>
                </View>
                <View style={[styles.radio, ativo && styles.radioAtivo]}>
                  {ativo && <View style={styles.radioDot} />}
                </View>
              </TouchableOpacity>
            );
          })}

          <Text style={[styles.sectionLabel, { marginTop: 8 }]}>DESTINATÁRIO</Text>

          <Text style={styles.label}>E-mail *</Text>
          <TextInput
            style={styles.input}
            placeholder="colega@email.com"
            placeholderTextColor="#6B4A58"
            value={emailDestinatario}
            onChangeText={setEmailDestinatario}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
          />

          <Text style={styles.label}>Mensagem pessoal (opcional)</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            placeholder="Parabéns! Espero que o AUREN te ajude muito no seu negócio."
            placeholderTextColor="#6B4A58"
            value={mensagem}
            onChangeText={setMensagem}
            multiline
            numberOfLines={3}
            returnKeyType="done"
          />

          <TouchableOpacity
            style={styles.enviarBtn}
            onPress={handleEnviar}
            activeOpacity={0.85}
          >
            <Text style={styles.enviarBtnText}>Enviar presente</Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const INPUT_BG = '#2D1020';
const CARD_BG  = '#222222';

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#1A0A14' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 20, marginBottom: 8,
  },
  backBtn:     { width: 32, alignItems: 'center' },
  backArrow:   { fontSize: 32, color: '#FFFFFF', lineHeight: 34, marginTop: -4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  headerRight: { width: 32 },

  scroll: { paddingHorizontal: 20, paddingBottom: 48, paddingTop: 12 },

  intro: {
    fontSize: 14, fontWeight: '400', color: '#C9A8B6',
    lineHeight: 21, marginBottom: 28,
  },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: '#6B4A58',
    letterSpacing: 1.2, marginBottom: 12,
  },

  opcaoCard: {
    backgroundColor: CARD_BG, borderRadius: 14,
    padding: 16, marginBottom: 10,
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: 'transparent',
  },
  opcaoCardAtiva: { borderColor: '#A8235A', backgroundColor: 'rgba(168,35,90,0.08)' },
  opcaoLeft:   { flex: 1 },
  opcaoLabel:  { fontSize: 15, fontWeight: '600', color: '#C9A8B6', marginBottom: 4 },
  opcaoLabelAtiva: { color: '#FFFFFF' },
  economiaBadge: {
    backgroundColor: 'rgba(168,35,90,0.2)', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start',
  },
  economiaText: { fontSize: 11, fontWeight: '700', color: '#A8235A' },

  opcaoRight:      { alignItems: 'flex-end', marginRight: 14 },
  opcaoPreco:      { fontSize: 18, fontWeight: '800', color: '#C9A8B6' },
  opcaoPrecoAtivo: { color: '#FFFFFF' },
  opcaoPeriodo:    { fontSize: 11, color: '#6B4A58', marginTop: 1 },

  radio:     { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#3D1A2E', alignItems: 'center', justifyContent: 'center' },
  radioAtivo:{ borderColor: '#A8235A' },
  radioDot:  { width: 10, height: 10, borderRadius: 5, backgroundColor: '#A8235A' },

  label: { fontSize: 12, fontWeight: '600', color: '#C9A8B6', marginBottom: 8, letterSpacing: 0.4 },

  input: {
    backgroundColor: INPUT_BG, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, color: '#FFFFFF', marginBottom: 18,
  },
  textarea: { height: 90, textAlignVertical: 'top', paddingTop: 14 },

  enviarBtn: {
    height: 54, borderRadius: 14, backgroundColor: '#A8235A',
    alignItems: 'center', justifyContent: 'center', marginTop: 8,
  },
  enviarBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});
