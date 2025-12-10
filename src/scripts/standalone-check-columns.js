
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Missing environment variables");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
    console.log("🔍 Checking columns for 'financial_transactions'...");

    // Try to insert a dummy filter on the column to see if it errors
    // OR just select it and see if it returns null or error

    const { data, error } = await supabase
        .from('financial_transactions')
        .select('deleted_at')
        .limit(1);

    if (error) {
        console.log("❌ Error accessing 'deleted_at':", error.message);
        if (error.message.includes("does not exist")) {
            console.log("🚨 CONFIRMED: 'deleted_at' column DOES NOT EXIST.");
        }
    } else {
        console.log("✅ 'deleted_at' column exists.");
    }
}

checkColumns();
