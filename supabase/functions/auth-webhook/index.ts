
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    console.log("🔥 Auth webhook received payload:", JSON.stringify(payload, null, 2));

    const { type, user, old_record } = payload;
    console.log("📧 Processing auth event:", type, "for user:", user?.email);

    // Handle different auth events
    switch (type) {
      case "user.created":
        console.log("👤 New user created, sending welcome email to:", user.email);
        
        // Send welcome/confirmation email
        const welcomeResult = await supabase.functions.invoke("send-auth-email", {
          body: {
            to: user.email,
            type: "confirmation",
            token: user.email_confirm_token,
            redirectTo: `${Deno.env.get("SITE_URL") || "https://vbowtpkisiabdwwgttry.supabase.co"}/`,
            userData: {
              full_name: user.user_metadata?.full_name,
              business_name: user.user_metadata?.business_name,
            }
          }
        });
        
        console.log("📤 Welcome email result:", welcomeResult);
        break;

      case "user.recovery_requested":
        console.log("🔐 Password recovery requested for:", user.email);
        
        // Send password reset email
        const recoveryResult = await supabase.functions.invoke("send-auth-email", {
          body: {
            to: user.email,
            type: "recovery",
            token: user.recovery_token,
            redirectTo: `${Deno.env.get("SITE_URL") || "https://vbowtpkisiabdwwgttry.supabase.co"}/auth`,
          }
        });
        
        console.log("📤 Recovery email result:", recoveryResult);
        break;

      default:
        console.log(`❓ Unhandled auth event: ${type}`);
    }

    return new Response(JSON.stringify({ success: true, event: type }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("❌ Auth webhook error:", error);
    console.error("❌ Error stack:", error.stack);
    return new Response(
      JSON.stringify({ error: error.message, stack: error.stack }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
