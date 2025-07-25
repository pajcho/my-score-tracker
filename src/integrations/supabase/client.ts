// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://xdvlpceesghqhondevfg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkdmxwY2Vlc2docWhvbmRldmZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxMDUzNTksImV4cCI6MjA2ODY4MTM1OX0.56O5b4KtT-FFIESpQ3DsbKu54cH4UW4zmPpE4DZxHgo";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});