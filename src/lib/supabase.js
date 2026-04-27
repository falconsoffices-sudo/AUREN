import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_URL = 'https://qvfbrrxdfvavmucwssql.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2ZmJycnhkZnZhdm11Y3dzc3FsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyMzk2MTgsImV4cCI6MjA5MjgxNTYxOH0.0uRULioUPt4QgHGQsoVHF2wEV_sa6lnMPzBCoktbXlc';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
