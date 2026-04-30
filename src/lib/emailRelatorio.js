import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

/**
 * Chama a Edge Function 'enviar-relatorio' para o mês/ano fornecidos.
 * Retorna { ok: true } em sucesso ou { error } em falha.
 */
export async function dispararRelatorio(userId, mes, ano) {
  try {
    const { data, error } = await supabase.functions.invoke('enviar-relatorio', {
      body: { userId, mes, ano },
    });
    if (error) return { error };
    return { ok: true, data };
  } catch (e) {
    return { error: e };
  }
}

/**
 * Verifica se hoje é dia 28 e se o relatório deste mês já foi enviado.
 * Se não foi, dispara e salva a flag no AsyncStorage.
 * Chamada fire-and-forget: engole erros silenciosamente.
 */
export async function verificarEnvioRelatorio() {
  try {
    const hoje = new Date();
    if (hoje.getDate() !== 28) return;

    const mes = hoje.getMonth() + 1; // 1-12
    const ano = hoje.getFullYear();
    const key = `relatorio_enviado_${mes}_${ano}`;

    const jaEnviado = await AsyncStorage.getItem(key);
    if (jaEnviado) return;

    const { data: authData } = await supabase.auth.getUser();
    const uid = authData?.user?.id;
    if (!uid) return;

    const { ok } = await dispararRelatorio(uid, mes, ano);
    if (ok) await AsyncStorage.setItem(key, '1');
  } catch (_) {}
}
