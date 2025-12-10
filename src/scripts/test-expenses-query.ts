
import 'dotenv/config';
import { supabase } from '../lib/supabaseClient';

async function testExpensesQuery() {
    console.log("🔍 Testing Expenses Query logic...");

    // Simulate the query from FinancialContext.tsx (current state)
    // .eq("type", "DESPESA").order("created_at", { ascending: false }).range(0, 19)

    const { data, error } = await supabase
        .from("financial_transactions")
        .select("id, description, cost_center_id, created_at, type")
        .eq("type", "DESPESA")
        .order("created_at", { ascending: false })
        .range(0, 49); // Fetch top 50 to see distribution

    if (error) {
        console.error("❌ Error fetching expenses:", error);
        return;
    }

    if (!data || data.length === 0) {
        console.log("⚠️ No expenses found. Cannot verify mixed content.");
        return;
    }

    console.log(`✅ Fetched ${data.length} expenses.`);

    // Analyze cost centers
    const centerCounts: Record<string, number> = {};
    data.forEach(item => {
        const center = item.cost_center_id || 'null';
        centerCounts[center] = (centerCounts[center] || 0) + 1;
    });

    console.log("\n📊 Cost Center Distribution (Top 50):");
    Object.entries(centerCounts).forEach(([center, count]) => {
        console.log(`   - ${center}: ${count}`);
    });

    const centersFound = Object.keys(centerCounts).length;
    if (centersFound > 1) {
        console.log(`\n🚨 ISSUE CONFIRMED: Found ${centersFound} different centers in a single page!`);
        console.log("   Pagination will likely hide data for specific centers.");
    } else {
        console.log(`\nℹ️ Only ${centersFound} center found. Issue might depend on specific data or RLS.`);
    }
}

testExpensesQuery();
