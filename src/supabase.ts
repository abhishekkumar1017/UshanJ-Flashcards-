import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://rvirjqlaffiflodseior.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2aXJqcWxhZmZpZmxvZHNlaW9yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1Njc4NDksImV4cCI6MjA5MzE0Mzg0OX0.9XL76rb6DsUbRDOvZx5jhsnGksHINn88ftyQpDxmva4';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL or Anon Key is missing. Please check your .env file.');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');
