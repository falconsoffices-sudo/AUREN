import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { createLinkToken } from '../lib/plaid';

export default function PlaidScreen({ navigation }) {
  const [loading,    setLoading]    = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [userId,     setUserId]     = useState(null);
  const [connected,  setConnected]  = useState(false);

  useEffect(() => {
    (async () => {
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData?.user?.id;
      if (!uid) { setLoading(false); return; }
      setUserId(uid);

      const { data: profile } = await supabase
        .from('profiles')
        .select('plaid_access_token')
        .eq('id', uid)
        .single();

      if (profile?.plaid_access_token) setConnected(true);
      setLoading(false);
    })();
  }, []);

  async function handleConnect() {
    if (!userId) return;
    setConnecting(true);
    try {
      const token = await createLinkToken(userId);
      Alert.alert(
        'Link Token gerado',
        `Plaid Link funciona apenas em build EAS.\n\nToken: ${token}`,
        [{ text: 'OK' }],
      );
    } catch (err) {
      Alert.alert('Erro', err.message ?? 'Não foi possível gerar o token.');
    } finally {
      setConnecting(false);
    }
  }

  // ── Already connected ─────────────────────────────────────────────────────
  if (connected) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <View style={styles.content}>
          <View style={styles.iconWrapper}>
            <View style={styles.iconRoof} />
            <View style={styles.iconBase}>
              <View style={styles.iconColumn} />
              <View style={styles.iconColumn} />
              <View style={styles.iconColumn} />
            </View>
            <View style={styles.iconFoundation} />
          </View>
          <Text style={styles.title}>Conta conectada</Text>
          <Text style={styles.subtitle}>
            Sua conta bancária está vinculada. A reconciliação automática de pagamentos está ativa.
          </Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.goBack()} activeOpacity={0.85}>
            <Text style={styles.primaryBtnText}>Voltar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Loading / connecting ──────────────────────────────────────────────────
  if (loading || connecting) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.centered}>
          <ActivityIndicator color="#A8235A" size="large" />
          <Text style={styles.loadingText}>{connecting ? 'Salvando conexão…' : 'Preparando…'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Main ──────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Text style={styles.backArrow}>←</Text>
      </TouchableOpacity>

      <View style={styles.content}>
        <View style={styles.iconWrapper}>
          <View style={styles.iconRoof} />
          <View style={styles.iconBase}>
            <View style={styles.iconColumn} />
            <View style={styles.iconColumn} />
            <View style={styles.iconColumn} />
          </View>
          <View style={styles.iconFoundation} />
        </View>

        <Text style={styles.title}>Conectar Conta Bancária</Text>
        <Text style={styles.subtitle}>
          Conecte sua conta bancária para reconciliação automática de pagamentos e relatórios financeiros precisos.
        </Text>

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={handleConnect}
          activeOpacity={0.85}
          disabled={connecting}
        >
          <Text style={styles.primaryBtnText}>
            {connecting ? 'Aguarde…' : 'Conectar conta'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={styles.skipBtnText}>Pular por enquanto</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: '#0E0F11' },
  centered:{ flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 16, fontSize: 14, color: '#6B4A58' },

  backBtn:   { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8, alignSelf: 'flex-start' },
  backArrow: { fontSize: 24, fontWeight: 'bold', color: '#A8235A' },

  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 48,
  },

  iconWrapper:    { alignItems: 'center', marginBottom: 36 },
  iconRoof: {
    width: 0, height: 0,
    borderLeftWidth: 36, borderRightWidth: 36, borderBottomWidth: 22,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
    borderBottomColor: '#A8235A',
  },
  iconBase: {
    flexDirection: 'row', gap: 6,
    backgroundColor: '#1A1B1E',
    paddingHorizontal: 10, paddingVertical: 8,
    borderRadius: 2,
  },
  iconColumn:     { width: 10, height: 40, backgroundColor: '#A8235A', borderRadius: 2 },
  iconFoundation: { width: 80, height: 8, backgroundColor: '#A8235A', borderRadius: 2, marginTop: 4 },

  title: {
    fontSize: 24, fontWeight: '800', color: '#FFFFFF',
    textAlign: 'center', marginBottom: 14,
  },
  subtitle: {
    fontSize: 15, fontWeight: '400', color: '#6B4A58',
    textAlign: 'center', lineHeight: 24, marginBottom: 40,
  },

  primaryBtn: {
    width: '100%', height: 52, borderRadius: 14,
    backgroundColor: '#A8235A',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
  },
  primaryBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },

  skipBtn:     { paddingVertical: 12 },
  skipBtnText: { fontSize: 14, fontWeight: '600', color: '#6B4A58' },
});
