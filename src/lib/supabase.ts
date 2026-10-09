
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://lfhgtowhaamdpnsiuqwt.supabase.co'
const supabaseAnonKey = 'sb_publishable_RIjZq-AO2U9EVKn6iJsHkg_Qr2Bt6jY'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
