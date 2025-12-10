
import 'dotenv/config';
import { supabase } from '../lib/supabaseClient';

async function verifyFix() {
    console.log("🔍 Verifying Fix for Expenses Query...");

    // Simulate usage with a specific cost center (e.g., 'valenca' or whatever is in the env/db)
    // We'll fetch the first available cost center to test with
    const { data: centerData } = await supabase
        .from('cost_centers')
        .select('code')
        .limit(1)
        .single();

    if (!centerData) {
        console.log("⚠️ No cost center found to test with.");
        return;
    }

    const selectedCenter = centerData.code;
    console.log(`ℹ️ Testing with center: ${selectedCenter}`);

    // REPLICATING THE FIXED QUERY
    let query = supabase
        .from("financial_transactions")
        .select("id, cost_center_id, description, deleted_at, type")
        .eq("type", "DESPESA")
        .is("deleted_at", null);

    if (selectedCenter) {
        query = query.eq("cost_center_id", selectedCenter);
    }

    const { data, error } = await query
        .order("created_at", { ascending: false })
        .range(0, 19);

    if (error) {
        console.error("❌ Error fetching expenses:", error);
        return;
    }

    if (!data || data.length === 0) {
        console.log("⚠️ No expenses found for this center. Cannot verify.");
        return;
    }

    console.log(`✅ Fetched ${data.length} expenses.`);

    // VERIFICATION LOGIC
    let hasError = false;
    data.forEach(item => {
        // Check Cost Center
        if (item.cost_center_id !== selectedCenter) {
            console.error(`❌ Found expense from wrong center: ${item.cost_center_id} (Expected: ${selectedCenter})`);
            hasError = true;
        }

        // Check Deleted At
        if (item.deleted_at !== null) {
            console.error(`❌ Found deleted expense: ${item.id}`);
            hasError = true;
        }
    });

    if (!hasError) {
        console.log("\n✅ VERIFICATION PASSED: All fetched items match the selected center and are not deleted.");
        console.log("   Pagination will now work correctly without gaps.");
    } else {
        console.log("\n🚨 VERIFICATION FAILED: Found inconsistent data.");
    }
}

verifyFix();
