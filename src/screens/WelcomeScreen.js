import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

const IDIOMAS = [
  { key: 'pt', label: 'PT-BR' },
  { key: 'es', label: 'ES-419' },
  { key: 'en', label: 'EN-US' },
];

const COPY = {
  pt: {
    frase:        'Sua agenda.\nSeu negócio.\nSeu futuro.',
    criarProf:    'Criar conta — Sou profissional',
    criarCliente: 'Criar conta — Sou cliente',
    entrar:       'Já tenho conta',
  },
  es: {
    frase:        'Tu agenda.\nTu negocio.\nTu futuro.',
    criarProf:    'Crear cuenta — Soy profesional',
    criarCliente: 'Crear cuenta — Soy cliente',
    entrar:       'Ya tengo cuenta',
  },
  en: {
    frase:        'Your schedule.\nYour business.\nYour future.',
    criarProf:    'Create account — I\'m a professional',
    criarCliente: 'Create account — I\'m a client',
    entrar:       'I already have an account',
  },
};

export default function WelcomeScreen({ navigation }) {
  const [idioma, setIdioma] = useState('pt');

  useEffect(() => {
    AsyncStorage.getItem('idioma_preferido').then(val => {
      if (val && COPY[val]) setIdioma(val);
    });
  }, []);

  const selectIdioma = async (key) => {
    setIdioma(key);
    await AsyncStorage.setItem('idioma_preferido', key);
  };

  const t = COPY[idioma];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>

      <View style={styles.top}>
        <Image
          source={require('../../assets/images/logo.png')}
          style={styles.logo}
        />

        <View style={styles.chips}>
          {IDIOMAS.map(({ key, label }) => (
            <TouchableOpacity
              key={key}
              style={[styles.chip, idioma === key && styles.chipActive]}
              onPress={() => selectIdioma(key)}
              activeOpacity={0.8}
            >
              <Text style={[styles.chipText, idioma === key && styles.chipTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.headline}>{t.frase}</Text>
      </View>

      <View style={styles.spacer} />

      <View style={styles.buttons}>
        <TouchableOpacity
          style={styles.primaryBtn}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('Auth')}
        >
          <Text style={styles.primaryBtnText}>{t.criarProf}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.outlineBtn}
          activeOpacity={0.75}
          onPress={() => navigation.navigate('AuthCliente')}
        >
          <Text style={styles.outlineBtnText}>{t.criarCliente}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.loginLink}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.loginLinkText}>{t.entrar}</Text>
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
    marginBottom: 20,
  },

  chips: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#A8235A',
  },
  chipActive: {
    backgroundColor: '#A8235A',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#A8235A',
    letterSpacing: 0.4,
  },
  chipTextActive: {
    color: '#FFFFFF',
  },

  headline: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 38,
    marginTop: 24,
  },

  spacer: { flex: 1 },

  buttons: {
    paddingHorizontal: 24,
    paddingBottom: 48,
    gap: 12,
  },

  primaryBtn: {
    height: 52,
    borderRadius: 14,
    backgroundColor: '#A8235A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  outlineBtn: {
    height: 52,
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

  loginLink:     { alignItems: 'center', paddingVertical: 10 },
  loginLinkText: { fontSize: 15, fontWeight: '600', color: '#A8235A' },

  saibaMaisBtn: { alignItems: 'center', paddingVertical: 8 },
  saibaMaisBtnText: { fontSize: 13, fontWeight: '600', color: '#6B4A58' },

  termsLink:     { alignItems: 'center', paddingVertical: 6 },
  termsLinkText: { fontSize: 11, fontWeight: '400', color: '#555560', textDecorationLine: 'underline' },
});
