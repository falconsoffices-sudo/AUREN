import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PlaidScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>

      {/* ── Back + Header ── */}
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Text style={styles.backArrow}>←</Text>
      </TouchableOpacity>

      <View style={styles.content}>

        {/* ── Bank icon ── */}
        <View style={styles.iconWrapper}>
          <View style={styles.iconRoof} />
          <View style={styles.iconBase}>
            <View style={styles.iconColumn} />
            <View style={styles.iconColumn} />
            <View style={styles.iconColumn} />
          </View>
          <View style={styles.iconFoundation} />
        </View>

        {/* ── Texts ── */}
        <Text style={styles.title}>Conectar Conta Bancária</Text>
        <Text style={styles.subtitle}>
          Conecte sua conta bancária para reconciliação automática de pagamentos e relatórios financeiros precisos.
        </Text>

        {/* ── Buttons ── */}
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() =>
            Alert.alert(
              'Em breve',
              'Integração Plaid em configuração. Disponível em breve.',
            )
          }
          activeOpacity={0.85}
        >
          <Text style={styles.primaryBtnText}>Conectar conta</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.skipBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Text style={styles.skipBtnText}>Pular por enquanto</Text>
        </TouchableOpacity>

      </View>

    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: '#0E0F11' },

  backBtn:   { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8, alignSelf: 'flex-start' },
  backArrow: { fontSize: 24, fontWeight: 'bold', color: '#A8235A' },

  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 48,
  },

  // Bank icon built from Views
  iconWrapper: { alignItems: 'center', marginBottom: 36 },
  iconRoof: {
    width: 0, height: 0,
    borderLeftWidth: 36, borderRightWidth: 36, borderBottomWidth: 22,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
    borderBottomColor: '#A8235A',
  },
  iconBase: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: '#1A1B1E',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 2,
  },
  iconColumn: {
    width: 10, height: 40,
    backgroundColor: '#A8235A',
    borderRadius: 2,
  },
  iconFoundation: {
    width: 80, height: 8,
    backgroundColor: '#A8235A',
    borderRadius: 2,
    marginTop: 4,
  },

  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 14,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '400',
    color: '#6B4A58',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },

  primaryBtn: {
    width: '100%',
    height: 52,
    borderRadius: 14,
    backgroundColor: '#A8235A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  primaryBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },

  skipBtn: { paddingVertical: 12 },
  skipBtnText: { fontSize: 14, fontWeight: '600', color: '#6B4A58' },
});
