
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
    console.log("🔍 Checking 'deleted_at' values for EXPENSES...");

    // Count total expenses
    const { count: total, error: err1 } = await supabase
        .from('financial_transactions')
        .select('id', { count: 'exact', head: true })
        .eq('type', 'DESPESA');

    if (err1) { console.error("Error counting:", err1); return; }
    console.log(`Total Expenses: ${total}`);

    // Count active (deleted_at IS NULL)
    const { count: active, error: err2 } = await supabase
        .from('financial_transactions')
        .select('id', { count: 'exact', head: true })
        .eq('type', 'DESPESA')
        .is('deleted_at', null);

    if (err2) { console.error("Error counting active:", err2); return; }
    console.log(`Active Expenses (deleted_at IS NULL): ${active}`);

    // Count deleted (deleted_at IS NOT NULL)
    const { count: deleted, error: err3 } = await supabase
        .from('financial_transactions')
        .select('id', { count: 'exact', head: true })
        .eq('type', 'DESPESA')
        .not('deleted_at', 'is', null);

    if (err3) { console.error("Error counting deleted:", err3); return; }
    console.log(`Deleted Expenses (deleted_at IS NOT NULL): ${deleted}`);

    if (active === 0 && total > 0) {
        console.log("🚨 ALARM: All expenses have deleted_at set! This explains why nothing shows.");
    }
}

checkData();
