import { supabase } from './supabase';

export async function createLinkToken(userId) {
  const { data, error } = await supabase.functions.invoke('criar-link-token', {
    body: { user_id: userId },
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data.link_token;
}

export async function exchangePublicToken(publicToken, userId) {
  const { data, error } = await supabase.functions.invoke('trocar-token-plaid', {
    body: { public_token: publicToken, user_id: userId },
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data.ok === true;
}
