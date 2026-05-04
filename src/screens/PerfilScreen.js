import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';
import colors from '../constants/colors';
import VendaModal from '../components/VendaModal';

// ─── Data ────────────────────────────────────────────────────────────────────

const PLANS = [
  {
    id: 'pro',
    name: 'AUREN PRO',
    price: '$89',
    popular: false,
    items: ['Agenda ilimitada', 'SMS automático', 'Relatório mensal', 'Inteligência de clientela', 'Conexões', 'Gamificação'],
  },
  {
    id: 'business',
    name: 'AUREN BUSINESS',
    price: '$149',
    popular: true,
    items: ['Tudo do PRO', '5 profissionais inclusos + $25/mês por profissional adicional', 'Dashboard consolidado', 'Faturamento unificado', 'Suporte prioritário'],
  },
];

const MENU_SECTIONS = [
  {
    title: 'Meu Negócio',
    items: [
      { label: 'Meus Dados' },
      { label: 'Endereços' },
      { label: 'Meus Serviços' },
      { label: 'Licença Profissional' },
      { label: 'EIN' },
      { label: 'Clientes Arquivadas' },
    ],
  },
  {
    title: 'Financeiro',
    items: [
      { label: 'Pagamentos' },
      { label: 'Despesas' },
      { label: 'Relatório Mensal' },
      { label: 'Metas e Objetivos' },
    ],
  },
  {
    title: 'Clientes & Agenda',
    items: [
      { label: 'Templates de SMS' },
      { label: 'Inteligência de Clientela' },
      { label: 'Minhas Conexões' },
    ],
  },
  {
    title: 'Equipe',
    items: [
      { label: 'Minha Equipe' },
    ],
  },
  {
    title: 'AUREN',
    items: [
      { label: 'Gamificação' },
      { label: 'Presentear com AUREN' },
      { label: 'Auren Community' },
    ],
  },
  {
    title: 'Conta',
    items: [
      { label: 'Ver Planos' },
      { label: 'Configurações' },
      { label: 'Sair', danger: true },
    ],
  },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function PlanCard({ id, name, price, popular, items, onEscolher, selectedPlan, onSelect }) {
  const { isDark } = useTheme();
  const styles = useMemo(() => makeStyles(isDark), [isDark]);
  const isSelected = id === selectedPlan;
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => onSelect(id)}
      style={[
        styles.planCard,
        popular && styles.planCardPro,
        isSelected
          ? { borderWidth: 2, borderColor: '#A8235A' }
          : { borderWidth: 1, borderColor: '#2A2A2A' },
      ]}
    >
      <View>
        {popular && (
          <View style={styles.popularBadge}>
            <Text style={styles.popularBadgeText}>MAIS POPULAR</Text>
          </View>
        )}
        <Text style={styles.planName}>{name}</Text>
        <View style={styles.planPriceRow}>
          <Text style={styles.planPrice}>{price}</Text>
          <Text style={styles.planPeriod}>/mês</Text>
        </View>
        <View style={styles.planDivider} />
        {items.map((item, i) => (
          <View key={i} style={styles.planItem}>
            <Text style={[styles.planCheck, popular && styles.planCheckPro]}>✓</Text>
            <Text style={styles.planItemText}>{item}</Text>
          </View>
        ))}
      </View>
      <TouchableOpacity
        style={[styles.planBtn, popular && styles.planBtnPro]}
        onPress={onEscolher}
        activeOpacity={0.8}
      >
        <Text style={[styles.planBtnText, popular && styles.planBtnTextPro]}>
          Escolher
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

function MenuItem({ label, danger, last, onPress }) {
  const { isDark } = useTheme();
  const styles = useMemo(() => makeStyles(isDark), [isDark]);
  return (
    <TouchableOpacity
      style={[styles.menuItem, !last && styles.menuItemBorder]}
      activeOpacity={0.65}
      onPress={onPress}
    >
      <Text style={[styles.menuLabel, danger && styles.menuLabelDanger]}>
        {label}
      </Text>
      {!danger && <Text style={styles.menuArrow}>›</Text>}
    </TouchableOpacity>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function PerfilScreen({ navigation }) {
  const { isDark } = useTheme();
  const styles = useMemo(() => makeStyles(isDark), [isDark]);

  const [planModal,       setPlanModal]       = useState(null);
  const [vendaModal,      setVendaModal]      = useState(false);
  const [planVendido,     setPlanVendido]     = useState('');
  const [photoModal,      setPhotoModal]      = useState(false);
  const [expandedSection, setExpandedSection] = useState(null);
  const [selectedPlan,    setSelectedPlan]    = useState('business');
  const [userId,          setUserId]          = useState(null);
  const [nome,            setNome]            = useState('');
  const [fotoUrl,         setFotoUrl]         = useState(null);
  const [uploadingPhoto,  setUploadingPhoto]  = useState(false);
  const [plano,           setPlano]           = useState(null);
  const [diasConta,       setDiasConta]       = useState(null);
  const [cidadeEstado,    setCidadeEstado]    = useState('');

  useEffect(() => {
    (async () => {
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData?.user?.id;
      if (!uid) return;
      setUserId(uid);
      const { data } = await supabase
        .from('profiles')
        .select('nome, foto_url, plano, created_at, endereco_comercial, cidade, estado')
        .eq('id', uid)
        .single();
      if (data) {
        setNome(data.nome ?? '');
        setFotoUrl(data.foto_url ?? null);
        setPlano(data.plano ?? 'trial');
        if (data.created_at) {
          const dias = Math.floor((Date.now() - new Date(data.created_at).getTime()) / 86400000);
          setDiasConta(dias);
        }
        // Derive city/state from endereco_comercial, fallback to profile columns
        let city  = data.cidade  ?? '';
        let state = data.estado  ?? '';
        if (data.endereco_comercial) {
          try {
            const ec = JSON.parse(data.endereco_comercial);
            city  = ec.city  ?? ec.cidade  ?? city;
            state = ec.state ?? ec.estado  ?? state;
          } catch (_) {}
        }
        if (city || state) setCidadeEstado([city, state].filter(Boolean).join(', '));
      }
    })();
  }, []);

  // ── Photo upload ────────────────────────────────────────────────────────────

  async function pickAndUpload(source) {
    setPhotoModal(false);
    if (!userId) return;

    const options = {
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    };

    let result;
    if (source === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão necessária', 'Permita o acesso à câmera nas configurações do dispositivo.');
        return;
      }
      result = await ImagePicker.launchCameraAsync(options);
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão necessária', 'Permita o acesso à galeria nas configurações do dispositivo.');
        return;
      }
      result = await ImagePicker.launchImageLibraryAsync(options);
    }

    if (result.canceled) return;
    const uri = result.assets[0].uri;

    setUploadingPhoto(true);
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const path = `${userId}/avatar.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('avatares')
        .upload(path, blob, { contentType: 'image/jpeg', upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('avatares')
        .getPublicUrl(path);

      if (!urlData?.publicUrl) throw new Error('Não foi possível obter a URL da foto.');
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ foto_url: publicUrl })
        .eq('id', userId);

      if (profileError) throw profileError;

      setFotoUrl(publicUrl);
    } catch (err) {
      Alert.alert('Erro ao enviar foto', err.message);
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function removerFoto() {
    setPhotoModal(false);
    if (!userId) return;
    try {
      await supabase.storage.from('avatares').remove([`${userId}/avatar.jpg`]);
      await supabase.from('profiles').update({ foto_url: null }).eq('id', userId);
      setFotoUrl(null);
    } catch (err) {
      Alert.alert('Erro ao remover foto', err.message);
    }
  }

  // ── Menu navigation ─────────────────────────────────────────────────────────

  function menuPress(label) {
    switch (label) {
      case 'Pagamentos':                return () => navigation.navigate('Pagamentos');
      case 'Meus Serviços':            return () => navigation.navigate('Servicos');
      case 'Meus Dados':               return () => navigation.navigate('MeusDados');
      case 'Endereços':                return () => navigation.navigate('Enderecos');
      case 'Despesas':                 return () => navigation.navigate('Despesas');
      case 'Configurações':            return () => navigation.navigate('Configuracoes');
      case 'Templates de SMS':         return () => navigation.navigate('TemplatesSMS');
      case 'Metas e Objetivos':        return () => navigation.navigate('Metas');
      case 'Relatório Mensal':         return () => navigation.navigate('Relatorio');
      case 'Inteligência de Clientela':return () => navigation.navigate('IntelClientela');
      case 'Minhas Conexões':          return () => navigation.navigate('Conexoes');
      case 'Minha Equipe':             return () => navigation.navigate('Equipe');
      case 'Auren Community':          return () => navigation.navigate('Community');
      case 'Gamificação':              return () => navigation.navigate('Gamificacao');
      case 'Presentear com AUREN':     return () => navigation.navigate('Presentear');
      case 'Licença Profissional':     return () => navigation.navigate('Licenca');
      case 'EIN':                      return () => navigation.navigate('MeusDados');
      case 'Clientes Arquivadas':      return () => navigation.navigate('ClientesArquivadas');
      case 'Ver Planos':               return () => navigation.navigate('Plans');
      case 'Sair': return () => Alert.alert(
        'Sair',
        'Tem certeza que deseja sair?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Sair',
            style: 'destructive',
            onPress: async () => {
              await supabase.auth.signOut();
              navigation.getParent()?.getParent()?.reset({
                index: 0,
                routes: [{ name: 'Welcome' }],
              });
            },
          },
        ],
      );
      default: return undefined;
    }
  }

  // ── Avatar display ──────────────────────────────────────────────────────────

  const initials = nome
    ? nome.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()
    : '?';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Profile card ── */}
        <View style={styles.profileCard}>
          <TouchableOpacity
            style={styles.gearBtn}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onPress={() => navigation.navigate('Configuracoes')}
          >
            <GearIcon />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.avatarWrap}
            onPress={() => setPhotoModal(true)}
            activeOpacity={0.8}
          >
            {uploadingPhoto ? (
              <View style={styles.avatar}>
                <ActivityIndicator color={colors.white} />
              </View>
            ) : fotoUrl ? (
              <Image source={{ uri: fotoUrl }} style={styles.avatarImg} />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            )}
            <View style={styles.avatarEditBadge}>
              <Text style={styles.avatarEditIcon}>✎</Text>
            </View>
          </TouchableOpacity>

          <Text style={styles.profileName}>{nome || '—'}</Text>
          <Text style={styles.profileSub}>{cidadeEstado || ''}</Text>

          <View style={styles.levelRow}>
            <View style={styles.levelBadge}>
              <Text style={styles.levelBadgeText}>NÍVEL 3</Text>
            </View>
            <Text style={styles.agendaStatus}>Agenda Cheia</Text>
          </View>
        </View>

        {/* ── Plans — só no trial com menos de 30 dias ── */}
        {plano === 'trial' && diasConta !== null && diasConta < 30 && (
          <>
            <Text style={[styles.sectionTitle, { color: isDark ? '#C9A8B6' : '#6B4A58' }]}>SEU PLANO</Text>
            <View style={styles.plansRow}>
              {PLANS.map(p => (
                <PlanCard
                  key={p.id}
                  {...p}
                  onEscolher={() => Alert.alert(
                    'Confirmar assinatura',
                    `Deseja assinar o ${p.name} por ${p.price}/mês?`,
                    [
                      { text: 'Cancelar', style: 'cancel' },
                      { text: 'Confirmar', onPress: () => { setPlanVendido(p.name); setVendaModal(true); } },
                    ]
                  )}
                  selectedPlan={selectedPlan}
                  onSelect={setSelectedPlan}
                />
              ))}
            </View>
          </>
        )}

        {/* ── Menu sections (accordion) ── */}
        {MENU_SECTIONS.map((section, si) => {
          const isOpen = expandedSection === section.title;
          return (
            <View key={si}>
              <TouchableOpacity
                style={styles.sectionHeaderRow}
                onPress={() => setExpandedSection(isOpen ? null : section.title)}
                activeOpacity={0.7}
              >
                <Text style={styles.menuSectionTitle}>{section.title}</Text>
                <Text style={styles.sectionArrow}>{isOpen ? '▲' : '▼'}</Text>
                <View style={styles.sectionHeaderLine} />
              </TouchableOpacity>
              {isOpen && (
                <View style={styles.menuCard}>
                  {section.items.map((item, i) => (
                    <MenuItem
                      key={item.label}
                      label={item.label}
                      danger={item.danger}
                      last={i === section.items.length - 1}
                      onPress={menuPress(item.label)}
                    />
                  ))}
                </View>
              )}
            </View>
          );
        })}

        <Text style={styles.version}>AUREN v1.0.0</Text>

      </ScrollView>

      {/* ── Photo ActionSheet ── */}
      <Modal
        visible={photoModal}
        transparent
        animationType="slide"
        onRequestClose={() => setPhotoModal(false)}
      >
        <View style={actionSt.backdrop}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setPhotoModal(false)} activeOpacity={1} />
          <View style={actionSt.sheet}>
            <View style={actionSt.handle} />
            <Text style={actionSt.title}>Foto de perfil</Text>

            <TouchableOpacity style={actionSt.option} onPress={() => pickAndUpload('camera')} activeOpacity={0.75}>
              <Text style={actionSt.optionText}>Tirar foto</Text>
            </TouchableOpacity>
            <View style={actionSt.sep} />
            <TouchableOpacity style={actionSt.option} onPress={() => pickAndUpload('gallery')} activeOpacity={0.75}>
              <Text style={actionSt.optionText}>Escolher da galeria</Text>
            </TouchableOpacity>
            {fotoUrl && (
              <>
                <View style={actionSt.sep} />
                <TouchableOpacity style={actionSt.option} onPress={removerFoto} activeOpacity={0.75}>
                  <Text style={[actionSt.optionText, actionSt.optionDanger]}>Remover foto</Text>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity style={actionSt.cancelBtn} onPress={() => setPhotoModal(false)} activeOpacity={0.75}>
              <Text style={actionSt.cancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <VendaModal
        visible={vendaModal}
        planName={planVendido}
        onClose={enviou => {
          setVendaModal(false);
          if (enviou) Alert.alert('Obrigada!', 'Suas indicações foram enviadas. Você está ajudando o AUREN a crescer!');
        }}
      />

      {/* ── Plan confirmation modal ── */}
      <Modal
        visible={planModal !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setPlanModal(null)}
      >
        <View style={modalStyles.backdrop}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setPlanModal(null)} activeOpacity={1} />
          {planModal && (
            <View style={modalStyles.sheet}>
              <View style={modalStyles.handle} />
              <Text style={modalStyles.title}>Plano {planModal.name}</Text>
              <Text style={modalStyles.price}>
                {planModal.price}<Text style={modalStyles.pricePer}>/mês</Text>
              </Text>
              <View style={modalStyles.divider} />
              {planModal.items.map((item, i) => (
                <View key={i} style={modalStyles.item}>
                  <Text style={modalStyles.check}>✓</Text>
                  <Text style={modalStyles.itemText}>{item}</Text>
                </View>
              ))}
              <TouchableOpacity
                style={modalStyles.btn}
                activeOpacity={0.85}
                onPress={() => {
                  setPlanModal(null);
                  setTimeout(() => Alert.alert('Em breve!', 'Pagamento via Stripe em breve. Obrigada pelo interesse!'), 300);
                }}
              >
                <Text style={modalStyles.btnText}>Assinar agora</Text>
              </TouchableOpacity>
              <TouchableOpacity style={modalStyles.cancel} onPress={() => setPlanModal(null)}>
                <Text style={modalStyles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>

    </SafeAreaView>
  );
}

// ─── Gear Icon ────────────────────────────────────────────────────────────────

function GearIcon() {
  return (
    <View style={gearSt.outer}>
      <View style={gearSt.inner} />
      <View style={[gearSt.spoke, gearSt.spokeV]} />
      <View style={[gearSt.spoke, gearSt.spokeH]} />
      <View style={[gearSt.spoke, gearSt.spokeDL]} />
      <View style={[gearSt.spoke, gearSt.spokeDR]} />
    </View>
  );
}

const GEAR = '#555555';
const gearSt = StyleSheet.create({
  outer:   { width: 22, height: 22, borderRadius: 11, borderWidth: 3, borderColor: GEAR, alignItems: 'center', justifyContent: 'center' },
  inner:   { width: 8, height: 8, borderRadius: 4, backgroundColor: GEAR },
  spoke:   { position: 'absolute', width: 3, height: 22, backgroundColor: GEAR, borderRadius: 1 },
  spokeV:  { transform: [{ rotate: '0deg'   }] },
  spokeH:  { transform: [{ rotate: '90deg'  }] },
  spokeDL: { transform: [{ rotate: '45deg'  }] },
  spokeDR: { transform: [{ rotate: '-45deg' }] },
});

// ─── Styles ───────────────────────────────────────────────────────────────────

function makeStyles(isDark) {
  const bg   = isDark ? '#0E0F11' : '#F5EDE8';
  const card = isDark ? '#1A1B1E' : '#FFFFFF';
  const text = isDark ? '#F5EDE8' : '#1A0A14';
  const sub  = isDark ? '#C9A8B6' : '#6B4A58';

  return StyleSheet.create({
    safe:   { flex: 1, backgroundColor: bg },
    scroll: { paddingHorizontal: 20, paddingBottom: 48 },

    profileCard: {
      backgroundColor: card, borderRadius: 20,
      paddingTop: 48, paddingBottom: 28, paddingHorizontal: 20,
      alignItems: 'center', marginTop: 20, marginBottom: 28, position: 'relative',
    },
    gearBtn: { position: 'absolute', top: 18, right: 18 },

    avatarWrap: { marginBottom: 14, position: 'relative' },
    avatar: {
      width: 80, height: 80, borderRadius: 40,
      backgroundColor: colors.primary,
      alignItems: 'center', justifyContent: 'center',
    },
    avatarImg: {
      width: 80, height: 80, borderRadius: 40,
    },
    avatarText: { fontSize: 28, fontWeight: '800', color: colors.white, letterSpacing: 1 },
    avatarEditBadge: {
      position: 'absolute', bottom: 0, right: -2,
      width: 24, height: 24, borderRadius: 12,
      backgroundColor: colors.primary,
      alignItems: 'center', justifyContent: 'center',
      borderWidth: 2, borderColor: card,
    },
    avatarEditIcon: { fontSize: 11, color: colors.white, lineHeight: 13 },

    profileName:  { fontSize: 22, fontWeight: '700', color: text, marginBottom: 5 },
    profileSub:   { fontSize: 13, fontWeight: '400', color: sub, marginBottom: 16 },
    levelRow:     { flexDirection: 'row', alignItems: 'center', gap: 10 },
    levelBadge: {
      backgroundColor: 'rgba(232,196,160,0.14)', borderWidth: 1,
      borderColor: 'rgba(232,196,160,0.30)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
    },
    levelBadgeText: { fontSize: 10, fontWeight: '800', color: colors.cream, letterSpacing: 1 },
    agendaStatus:   { fontSize: 13, fontWeight: '600', color: colors.cream },

    sectionTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 1.3, marginBottom: 14 },

    plansRow: { flexDirection: 'row', gap: 12, marginBottom: 28, alignItems: 'stretch' },
    planCard: { flex: 1, backgroundColor: card, borderRadius: 16, padding: 16, justifyContent: 'space-between' },
    planCardPro: { borderWidth: 1.5, borderColor: colors.primary },
    popularBadge: {
      backgroundColor: colors.primary, borderRadius: 6,
      paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginBottom: 10,
    },
    popularBadgeText: { fontSize: 8, fontWeight: '800', color: colors.white, letterSpacing: 0.8 },
    planName:         { fontSize: 16, fontWeight: '700', color: sub, marginBottom: 4 },
    planPriceRow:     { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 2 },
    planPrice:        { fontSize: 26, fontWeight: '800', color: text, lineHeight: 28 },
    planPeriod:       { fontSize: 12, fontWeight: '400', color: sub, marginBottom: 3, marginLeft: 2 },
    planDivider:      { height: 1, backgroundColor: isDark ? '#3D1020' : '#E6D8CF', marginVertical: 12 },
    planItem:         { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 7, gap: 6 },
    planCheck:        { fontSize: 11, fontWeight: '400', color: sub, marginTop: 1 },
    planCheckPro:     { color: colors.primary },
    planItemText:     { fontSize: 11, fontWeight: '400', color: sub, flex: 1, lineHeight: 16 },
    planBtn:          { marginTop: 16, borderRadius: 10, paddingVertical: 11, alignItems: 'center', borderWidth: 1, borderColor: colors.primary },
    planBtnPro:       { backgroundColor: colors.primary },
    planBtnText:      { fontSize: 13, fontWeight: '700', color: colors.primary },
    planBtnTextPro:   { color: colors.white },

    sectionHeaderRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: 10,
      marginTop: 20, marginBottom: 8,
    },
    sectionHeaderLine: {
      flex: 1, height: 1,
      backgroundColor: isDark ? '#2A2A2A' : '#E6D8CF',
    },
    menuSectionTitle: {
      fontSize: 16, fontWeight: '800', color: '#D4D4D4',
    },
    sectionArrow: { fontSize: 11, fontWeight: '800', color: '#A8235A' },

    menuCard: { backgroundColor: card, borderRadius: 16, overflow: 'hidden', marginBottom: 4 },
    menuItem: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingVertical: 16, paddingHorizontal: 18,
    },
    menuItemBorder:  { borderBottomWidth: 1, borderBottomColor: isDark ? '#3D1020' : '#E6D8CF' },
    menuLabel:       { fontSize: 15, fontWeight: '500', color: text },
    menuLabelDanger: { color: '#F87171' },
    menuArrow:       { fontSize: 20, fontWeight: '400', color: isDark ? '#555555' : '#B09AA8', lineHeight: 22 },

    version: { textAlign: 'center', fontSize: 11, fontWeight: '400', color: sub, letterSpacing: 1, marginTop: 20, marginBottom: 8 },
  });
}

// ─── Action Sheet styles (static dark) ───────────────────────────────────────

const actionSt = StyleSheet.create({
  backdrop:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  sheet:       { backgroundColor: '#1A1B1E', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 36 },
  handle:      { width: 40, height: 4, borderRadius: 2, backgroundColor: '#2A2A2A', alignSelf: 'center', marginBottom: 20 },
  title:       { fontSize: 14, fontWeight: '700', color: '#8A8A8E', textAlign: 'center', marginBottom: 16, letterSpacing: 0.4 },
  option:      { paddingVertical: 16, alignItems: 'center' },
  optionText:  { fontSize: 17, fontWeight: '400', color: '#F5EDE8' },
  optionDanger:{ color: '#F87171' },
  sep:         { height: 1, backgroundColor: '#2A2A2A' },
  cancelBtn:   { marginTop: 12, paddingVertical: 14, alignItems: 'center', backgroundColor: '#0E0F11', borderRadius: 14 },
  cancelText:  { fontSize: 16, fontWeight: '600', color: '#8A8A8E' },
});

// ─── Plan modal styles (static dark) ─────────────────────────────────────────

const modalStyles = StyleSheet.create({
  backdrop:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  sheet:          { backgroundColor: '#0E0F11', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 40 },
  handle:         { width: 40, height: 4, borderRadius: 2, backgroundColor: '#3D1020', alignSelf: 'center', marginBottom: 24 },
  title:          { fontSize: 22, fontWeight: '800', color: '#FFFFFF', marginBottom: 6 },
  price:          { fontSize: 32, fontWeight: '800', color: '#A8235A' },
  pricePer:       { fontSize: 14, fontWeight: '400', color: '#C9A8B6' },
  divider:        { height: 1, backgroundColor: '#1A1B1E', marginVertical: 16 },
  item:           { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10, gap: 10 },
  check:          { fontSize: 13, color: '#A8235A', fontWeight: '700', marginTop: 1 },
  itemText:       { fontSize: 14, color: '#C9A8B6', flex: 1 },
  btn:            { height: 54, borderRadius: 14, backgroundColor: '#A8235A', alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  btnText:        { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  cancel:         { alignItems: 'center', paddingVertical: 14 },
  cancelText:     { fontSize: 14, fontWeight: '600', color: '#6B4A58' },
});
