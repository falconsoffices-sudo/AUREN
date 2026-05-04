import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';

function getInitials(nome = '') {
  return nome.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function diasDesde(isoStr) {
  if (!isoStr) return 0;
  return Math.floor((Date.now() - new Date(isoStr).getTime()) / 86400000);
}

export default function ClientesArquivadasScreen({ navigation }) {
  const [clientes,    setClientes]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [userId,      setUserId]      = useState(null);
  const [restaurando, setRestaurando] = useState(null);

  const fetchArquivadas = useCallback(async (uid) => {
    const id = uid ?? userId;
    if (!id) return;
    const { data, error } = await supabase
      .from('clientes')
      .select('id, nome, telefone, arquivada_em')
      .eq('profissional_id', id)
      .eq('ativa', false)
      .order('arquivada_em', { ascending: false });
    if (!error && data) setClientes(data);
  }, [userId]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase.auth.getUser();
      const uid = data?.user?.id;
      if (uid) {
        setUserId(uid);
        await fetchArquivadas(uid);
      }
      setLoading(false);
    })();
  }, []);

  const handleRestaurar = (cliente) => {
    Alert.alert(
      'Restaurar cliente',
      `Deseja restaurar ${cliente.nome}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Restaurar',
          onPress: async () => {
            setRestaurando(cliente.id);
            try {
              const { error } = await supabase
                .from('clientes')
                .update({ ativa: true, arquivada_em: null })
                .eq('id', cliente.id);
              if (error) throw error;
              setClientes(prev => prev.filter(c => c.id !== cliente.id));
            } catch (err) {
              Alert.alert('Erro ao restaurar', err.message);
            } finally {
              setRestaurando(null);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color="#F5EDE8" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Clientes Arquivadas</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator color="#A8235A" style={{ marginTop: 40 }} />
        ) : clientes.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Nenhuma cliente arquivada.</Text>
          </View>
        ) : (
          clientes.map(c => {
            const dias      = diasDesde(c.arquivada_em);
            const restantes = 30 - dias;
            const urgente   = restantes <= 7;

            return (
              <View key={c.id} style={styles.card}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{getInitials(c.nome)}</Text>
                </View>
                <View style={styles.info}>
                  <Text style={styles.nome}>{c.nome}</Text>
                  {!!c.telefone && <Text style={styles.telefone}>{c.telefone}</Text>}
                  <Text style={styles.dataArq}>
                    Arquivada há {dias} dia{dias !== 1 ? 's' : ''}
                  </Text>
                  <View style={[styles.badge, urgente && styles.badgeUrgente]}>
                    <Text style={[styles.badgeText, urgente && styles.badgeTextUrgente]}>
                      {restantes > 0
                        ? `Exclusão permanente em ${restantes} dia${restantes !== 1 ? 's' : ''}`
                        : 'Exclusão permanente hoje'}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.restaurarBtn, restaurando === c.id && { opacity: 0.6 }]}
                  onPress={() => handleRestaurar(c)}
                  disabled={restaurando === c.id}
                  activeOpacity={0.8}
                >
                  {restaurando === c.id
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={styles.restaurarText}>Restaurar</Text>}
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:             { flex: 1, backgroundColor: '#0E0F11' },
  header:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16 },
  backBtn:          { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle:      { fontSize: 18, fontWeight: '700', color: '#F5EDE8' },
  scroll:           { paddingHorizontal: 16, paddingBottom: 40 },
  emptyState:       { alignItems: 'center', paddingTop: 60 },
  emptyText:        { fontSize: 14, color: '#8A8A8E' },
  card:             { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1B1E', borderRadius: 14, padding: 14, marginBottom: 10 },
  avatar:           { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(168,35,90,0.15)', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText:       { fontSize: 14, fontWeight: '700', color: '#A8235A' },
  info:             { flex: 1 },
  nome:             { fontSize: 15, fontWeight: '600', color: '#F5EDE8', marginBottom: 2 },
  telefone:         { fontSize: 12, color: '#8A8A8E', marginBottom: 2 },
  dataArq:          { fontSize: 11, color: '#8A8A8E', marginBottom: 4 },
  badge:            { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: 'rgba(245,158,11,0.15)' },
  badgeUrgente:     { backgroundColor: 'rgba(248,113,113,0.15)' },
  badgeText:        { fontSize: 10, fontWeight: '600', color: '#F59E0B' },
  badgeTextUrgente: { color: '#F87171' },
  restaurarBtn:     { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: '#A8235A', marginLeft: 10 },
  restaurarText:    { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
});
