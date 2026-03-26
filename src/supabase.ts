import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://rnmfwxnqlooicsfraqvo.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJubWZ3eG5xbG9vaWNzZnJhcXZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1MDQ4NjIsImV4cCI6MjA5MDA4MDg2Mn0.TtwyVLhoLjWk7SXdsMQTD1fV5ttbUJvlJzYo0tuBdb0';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL or Anon Key is missing. Please check your .env file.');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');
