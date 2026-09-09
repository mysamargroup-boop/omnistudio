import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lsttnpynhwtpkzfbfntf.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzdHRucHluaHd0cGt6ZmJmbnRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4NTg3NTgsImV4cCI6MjEwNDQzNDc1OH0.BltQVtk0-IKKKZAVdD6grkiFcT6_ikXUsHr9BHpZUqM';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

export default supabase;
