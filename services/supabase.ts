
import { createClient } from '@supabase/supabase-js';

// IMPORTANT: Replace these with your actual Supabase project credentials
// You can find these in your Supabase Dashboard -> Project Settings -> API
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://kjzdhytubtcgesrpncvg.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_1OyQXFm7BwHCHI9jphXtyw_6-DmrcrY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
