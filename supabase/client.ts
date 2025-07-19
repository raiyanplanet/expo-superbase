import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wjrrglremnyittdwkowl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqcnJnbHJlbW55aXR0ZHdrb3dsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4MDg2OTksImV4cCI6MjA2ODM4NDY5OX0.d2cGZurM_pIF5IC1XnASJ9iLJnyyO6dJWcbd7zy41l8';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: AsyncStorage as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
