import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ─── Data ─────────────────────────────────────────────────────────────────────

const CATEGORIAS = [
  {
    label: 'Primeiros Passos',
    videos: [
      { id: 1,  titulo: 'Como configurar seu perfil',        duracao: '3:45', url: 'https://www.youtube.com/@auren.app' },
      { id: 2,  titulo: 'Cadastrando seus serviços',         duracao: '2:30', url: 'https://www.youtube.com/@auren.app' },
      { id: 3,  titulo: 'Adicionando sua primeira cliente',  duracao: '4:10', url: 'https://www.youtube.com/@auren.app' },
    ],
  },
  {
    label: 'Agenda',
    videos: [
      { id: 4,  titulo: 'Como criar agendamentos',           duracao: '3:20', url: 'https://www.youtube.com/@auren.app' },
      { id: 5,  titulo: 'Gerenciando horários e conflitos',  duracao: '5:00', url: 'https://www.youtube.com/@auren.app' },
    ],
  },
  {
    label: 'Financeiro',
    videos: [
      { id: 6,  titulo: 'Entendendo o Caixa',                duracao: '4:30', url: 'https://www.youtube.com/@auren.app' },
      { id: 7,  titulo: 'Registrando despesas',              duracao: '2:50', url: 'https://www.youtube.com/@auren.app' },
      { id: 8,  titulo: 'Definindo metas financeiras',       duracao: '6:15', url: 'https://www.youtube.com/@auren.app' },
    ],
  },
  {
    label: 'Crescimento',
    videos: [
      { id: 9,  titulo: 'Sistema de gamificação e níveis',   duracao: '3:45', url: 'https://www.youtube.com/@auren.app' },
      { id: 10, titulo: 'Usando os Insights do Dashboard',   duracao: '5:30', url: 'https://www.youtube.com/@auren.app' },
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function abrirVideo(url) {
  const ok = await Linking.canOpenURL(url);
  if (ok) {
    Linking.openURL(url);
  } else {
    Alert.alert('Vídeo indisponível', 'Acesse youtube.com/@auren.app pelo navegador.');
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function VideoCard({ titulo, duracao, url, isLast }) {
  return (
    <>
      <TouchableOpacity
        style={styles.videoCard}
        onPress={() => abrirVideo(url)}
        activeOpacity={0.75}
      >
        <View style={styles.thumbnail}>
          <View style={styles.playCircle}>
            <Text style={styles.playIcon}>▶</Text>
          </View>
          <View style={styles.durationBadge}>
            <Text style={styles.durationText}>{duracao}</Text>
          </View>
        </View>

        <View style={styles.videoInfo}>
          <Text style={styles.videoTitle} numberOfLines={2}>{titulo}</Text>
          <Text style={styles.videoChannel}>AUREN</Text>
        </View>

        <Text style={styles.videoArrow}>›</Text>
      </TouchableOpacity>
      {!isLast && <View style={styles.divider} />}
    </>
  );
}

function CategoriaSection({ label, videos }) {
  return (
    <View style={styles.categoria}>
      <Text style={styles.categoriaLabel}>{label.toUpperCase()}</Text>
      <View style={styles.categoriaCard}>
        {videos.map((v, idx) => (
          <VideoCard
            key={v.id}
            titulo={v.titulo}
            duracao={v.duracao}
            url={v.url}
            isLast={idx === videos.length - 1}
          />
        ))}
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function TutoriaisScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Tutoriais AUREN</Text>
          <Text style={styles.headerSub}>Aprenda a usar o app</Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {CATEGORIAS.map(cat => (
          <CategoriaSection key={cat.label} label={cat.label} videos={cat.videos} />
        ))}

        <TouchableOpacity
          style={styles.youtubeBtn}
          onPress={() => abrirVideo('https://www.youtube.com/@auren.app')}
          activeOpacity={0.8}
        >
          <Text style={styles.youtubeBtnText}>Ver canal completo no YouTube</Text>
        </TouchableOpacity>

        <View style={{ height: 48 }} />
      </ScrollView>

    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const CARD_BG  = '#1A1B1E';
const SUBTLE   = '#2A2A2A';
const THUMB_BG = '#252528';

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0E0F11' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 20, paddingBottom: 16,
  },
  backBtn:      { width: 32, alignItems: 'center' },
  backArrow:    { fontSize: 32, color: '#FFFFFF', lineHeight: 34, marginTop: -4 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle:  { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  headerSub:    { fontSize: 12, fontWeight: '400', color: '#8A8A8E', marginTop: 2 },
  headerRight:  { width: 32 },

  scroll: { paddingHorizontal: 20, paddingTop: 8 },

  categoria:      { marginBottom: 24 },
  categoriaLabel: {
    fontSize: 11, fontWeight: '700', color: '#8A8A8E',
    letterSpacing: 1.2, marginBottom: 10,
  },
  categoriaCard: {
    backgroundColor: CARD_BG, borderRadius: 16, overflow: 'hidden',
  },

  videoCard: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 12,
  },
  thumbnail: {
    width: 88, height: 56, borderRadius: 8,
    backgroundColor: THUMB_BG,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 14, flexShrink: 0,
    overflow: 'hidden',
  },
  playCircle: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(168,35,90,0.85)',
    alignItems: 'center', justifyContent: 'center',
  },
  playIcon: { fontSize: 10, color: '#FFFFFF', marginLeft: 2 },
  durationBadge: {
    position: 'absolute', bottom: 4, right: 5,
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderRadius: 3, paddingHorizontal: 4, paddingVertical: 1,
  },
  durationText: { fontSize: 9, fontWeight: '700', color: '#FFFFFF' },

  videoInfo:   { flex: 1 },
  videoTitle:  { fontSize: 14, fontWeight: '600', color: '#FFFFFF', lineHeight: 20, marginBottom: 4 },
  videoChannel:{ fontSize: 11, fontWeight: '400', color: '#8A8A8E' },

  videoArrow: { fontSize: 20, color: '#555560', marginLeft: 8, lineHeight: 22 },

  // divider alinhado ao texto (thumbnail 88 + marginRight 14 + paddingLeft 14 = 116)
  divider: { height: 1, backgroundColor: SUBTLE, marginLeft: 116 },

  youtubeBtn: {
    borderWidth: 1, borderColor: '#A8235A', borderRadius: 14,
    height: 48, alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
  },
  youtubeBtnText: { fontSize: 14, fontWeight: '600', color: '#A8235A' },
});
