import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lsttnpynhwtpkzfbfntf.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzdHRucHluaHd0cGt6ZmJmbnRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY2Mzg4NzgsImV4cCI6MjA2MjIxNDg3OH0.S6t81i8x_9tIcf9Vj90y6lqA5416F6Z6Hn9w46hJ2U4';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

export default supabase;
