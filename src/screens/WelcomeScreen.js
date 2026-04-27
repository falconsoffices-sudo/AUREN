import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

export default function WelcomeScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>

      {/* ── Top: logo + copy ── */}
      <View style={styles.top}>
        <Image
          source={require('../../assets/images/logo.png')}
          style={styles.logo}
        />

        <Text style={styles.headline}>
          Sua agenda.{'\n'}Seu negócio.{'\n'}Seu futuro.
        </Text>

        <Text style={styles.subheadline}>
          Tu agenda. Tu negocio. Tu futuro.
        </Text>
      </View>

      {/* ── Spacer ── */}
      <View style={styles.spacer} />

      {/* ── Botões ── */}
      <View style={styles.buttons}>

        <LinearGradient
          colors={['#C4356E', '#A8235A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradientWrap}
        >
          <TouchableOpacity
            style={styles.btnInner}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('Auth')}
          >
            <Text style={styles.gradientBtnText}>Criar conta</Text>
          </TouchableOpacity>
        </LinearGradient>

        <TouchableOpacity
          style={styles.outlineBtn}
          activeOpacity={0.75}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.outlineBtnText}>Já tenho conta</Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#1A0A14',
  },

  top: {
    alignItems: 'center',
    paddingTop: 56,
    paddingHorizontal: 32,
  },
  logo: {
    width: 120,
    height: 80,
    resizeMode: 'contain',
    marginBottom: 40,
  },
  headline: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 36,
    marginBottom: 12,
  },
  subheadline: {
    fontSize: 14,
    fontWeight: '400',
    color: '#C9A8B6',
    textAlign: 'center',
    lineHeight: 20,
  },

  spacer: { flex: 1 },

  buttons: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    gap: 12,
  },

  gradientWrap: {
    height: 50,
    borderRadius: 14,
    overflow: 'hidden',
  },
  btnInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradientBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  outlineBtn: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#A8235A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#A8235A',
  },
});
