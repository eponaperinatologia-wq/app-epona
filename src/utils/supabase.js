import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseKey = process.env.REACT_APP_SUPABASE_KEY

// A sessão (login) fica guardada no aparelho e é renovada sozinha; toda
// chamada ao banco vai com o token da conta logada, e as regras do banco
// (RLS) decidem o que essa conta pode ver.
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
})
