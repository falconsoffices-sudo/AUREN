import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function WelcomeScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>

      <View style={styles.top}>
        <Image
          source={require('../../assets/images/logo.png')}
          style={styles.logo}
        />
        <Text style={styles.headline}>
          {'Sua agenda.\nSeu negócio.\nSeu futuro.'}
        </Text>
      </View>

      <View style={styles.spacer} />

      <View style={styles.buttons}>
        <TouchableOpacity
          style={styles.primaryBtn}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('Auth')}
        >
          <Text style={styles.primaryBtnText}>Criar conta</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.outlineBtn}
          activeOpacity={0.75}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.outlineBtnText}>Já tenho conta</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.saibaMaisBtn}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('SaibaMais')}
        >
          <Text style={styles.saibaMaisBtnText}>Saiba mais sobre o AUREN</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.termsLink}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('Politicas')}
        >
          <Text style={styles.termsLinkText}>Termos de Uso e Política de Privacidade</Text>
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0E0F11',
    justifyContent: 'space-between',
  },

  top: {
    alignItems: 'center',
    paddingTop: 48,
    paddingHorizontal: 32,
  },

  logo: {
    width: 560,
    height: 224,
    resizeMode: 'contain',
    marginBottom: 32,
  },

  headline: {
    fontSize: 30,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 40,
  },

  spacer: { flex: 1 },

  buttons: {
    paddingHorizontal: 24,
    paddingBottom: 48,
    gap: 12,
  },

  primaryBtn: {
    height: 56,
    borderRadius: 14,
    backgroundColor: '#A8235A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },

  outlineBtn: {
    height: 56,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#A8235A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineBtnText: { fontSize: 17, fontWeight: '700', color: '#A8235A' },

  saibaMaisBtn:     { alignItems: 'center', paddingVertical: 8 },
  saibaMaisBtnText: { fontSize: 13, fontWeight: '600', color: '#6B4A58' },

  termsLink:     { alignItems: 'center', paddingVertical: 6 },
  termsLinkText: { fontSize: 11, fontWeight: '400', color: '#555560', textDecorationLine: 'underline' },
});
