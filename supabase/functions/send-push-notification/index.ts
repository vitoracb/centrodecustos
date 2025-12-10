/**
 * Supabase Edge Function: send-push-notification
 * 
 * Envia push notifications para usuários admin/editor via Expo Push API
 * 
 * Uso:
 * POST /functions/v1/send-push-notification
 * {
 *   "type": "new_expense" | "budget_approved" | "budget_rejected" | "new_order",
 *   "title": "Título da notificação",
 *   "body": "Corpo da notificação",
 *   "targetRoles": ["admin", "editor"],
 *   "data": {} // dados extras para deep linking
 * }
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

interface PushRequest {
    type: string;
    title: string;
    body: string;
    targetRoles?: string[];
    data?: Record<string, any>;
}

serve(async (req) => {
    // CORS
    if (req.method === "OPTIONS") {
        return new Response("ok", {
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization",
            },
        });
    }

    try {
        const { type, title, body, targetRoles = ["admin", "editor"], data = {} } =
            (await req.json()) as PushRequest;

        if (!title || !body) {
            return new Response(
                JSON.stringify({ error: "title and body are required" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        // Inicializa Supabase client com service role
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Busca tokens de push dos usuários com as roles especificadas
        const { data: profiles, error: profilesError } = await supabase
            .from("user_profiles")
            .select("id, role")
            .in("role", targetRoles)
            .eq("is_active", true);

        if (profilesError) {
            console.error("Erro ao buscar perfis:", profilesError);
            return new Response(
                JSON.stringify({ error: "Failed to fetch user profiles" }),
                { status: 500, headers: { "Content-Type": "application/json" } }
            );
        }

        if (!profiles || profiles.length === 0) {
            return new Response(
                JSON.stringify({ message: "No target users found", sent: 0 }),
                { status: 200, headers: { "Content-Type": "application/json" } }
            );
        }

        const userIds = profiles.map((p) => p.id);

        // Busca tokens de push desses usuários
        const { data: tokens, error: tokensError } = await supabase
            .from("user_push_tokens")
            .select("push_token")
            .in("user_id", userIds);

        if (tokensError) {
            console.error("Erro ao buscar tokens:", tokensError);
            return new Response(
                JSON.stringify({ error: "Failed to fetch push tokens" }),
                { status: 500, headers: { "Content-Type": "application/json" } }
            );
        }

        if (!tokens || tokens.length === 0) {
            return new Response(
                JSON.stringify({ message: "No push tokens found", sent: 0 }),
                { status: 200, headers: { "Content-Type": "application/json" } }
            );
        }

        // Prepara mensagens para Expo Push API
        const messages = tokens.map((t) => ({
            to: t.push_token,
            sound: "default",
            title,
            body,
            data: {
                ...data,
                type,
            },
        }));

        // Envia para Expo Push API
        const response = await fetch(EXPO_PUSH_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            body: JSON.stringify(messages),
        });

        const result = await response.json();

        console.log(`Push enviado para ${tokens.length} dispositivos:`, result);

        return new Response(
            JSON.stringify({
                success: true,
                sent: tokens.length,
                result,
            }),
            {
                status: 200,
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                },
            }
        );
    } catch (error) {
        console.error("Erro na Edge Function:", error);
        return new Response(
            JSON.stringify({ error: error.message || "Internal server error" }),
            {
                status: 500,
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                },
            }
        );
    }
});
