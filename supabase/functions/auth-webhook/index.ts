
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rate limiting helper
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

const isRateLimited = (identifier: string, maxRequests = 10, windowMs = 60000): boolean => {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs });
    return false;
  }
  
  if (record.count >= maxRequests) {
    return true;
  }
  
  record.count++;
  return false;
};

// Input validation and security
const validateWebhookPayload = (payload: any): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!payload || typeof payload !== 'object') {
    errors.push('Invalid payload structure');
    return { isValid: false, errors };
  }
  
  if (!payload.type || typeof payload.type !== 'string') {
    errors.push('Missing or invalid event type');
  }
  
  if (!payload.record || typeof payload.record !== 'object') {
    errors.push('Missing or invalid record data');
  }
  
  // Check for suspicious patterns
  if (payload.record?.email && payload.record.email.length > 254) {
    errors.push('Email address too long');
  }
  
  return { isValid: errors.length === 0, errors };
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Rate limiting check
  const clientIP = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
  if (isRateLimited(clientIP)) {
    console.warn(`🚫 Rate limit exceeded for IP: ${clientIP}`);
    return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
      status: 429,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  try {
    // Validate request size
    const contentLength = req.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > 1048576) { // 1MB limit
      throw new Error("Request payload too large");
    }

    const payload = await req.json();
    console.log("🔥 Auth webhook received:", JSON.stringify(payload, null, 2));

    // Validate payload structure
    const validation = validateWebhookPayload(payload);
    if (!validation.isValid) {
      console.error("❌ Invalid webhook payload:", validation.errors);
      return new Response(JSON.stringify({ error: "Invalid payload", details: validation.errors }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { type, record } = payload;
    console.log("📧 Processing event:", type);

    // Handle user signup
    if (type === "INSERT" && payload.table === "users") {
      console.log("👤 New user signup detected:", record.email);
      
      const welcomeResult = await supabase.functions.invoke("send-auth-email", {
        body: {
          to: record.email,
          type: "confirmation",
          userData: {
            full_name: record.raw_user_meta_data?.full_name || "New User",
            business_name: record.raw_user_meta_data?.business_name || "Your Business",
          }
        }
      });
      
      console.log("📤 Welcome email result:", welcomeResult);
    }

    return new Response(JSON.stringify({ success: true, event: type }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("❌ Auth webhook error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
