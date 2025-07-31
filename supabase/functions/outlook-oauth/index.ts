import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Verify JWT token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Invalid authorization token');
    }

    const url = new URL(req.url);
    let action;
    
    if (req.method === 'GET') {
      action = url.searchParams.get('action');
    } else {
      const body = await req.json();
      action = body.action || url.searchParams.get('action');
    }

    if (action === 'authorize') {
      // Step 1: Generate OAuth URL
      const redirectUri = `${url.origin}/outlook-oauth?action=callback`;
      const scopes = 'https://graph.microsoft.com/calendars.readwrite offline_access';
      
      const microsoftAuthUrl = new URL('https://login.microsoftonline.com/common/oauth2/v2.0/authorize');
      microsoftAuthUrl.searchParams.set('client_id', Deno.env.get('MICROSOFT_CLIENT_ID') ?? '');
      microsoftAuthUrl.searchParams.set('redirect_uri', redirectUri);
      microsoftAuthUrl.searchParams.set('scope', scopes);
      microsoftAuthUrl.searchParams.set('response_type', 'code');
      microsoftAuthUrl.searchParams.set('response_mode', 'query');
      microsoftAuthUrl.searchParams.set('state', user.id); // Include user ID in state

      return new Response(
        JSON.stringify({ authUrl: microsoftAuthUrl.toString() }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );

    } else if (action === 'callback') {
      // Step 2: Handle OAuth callback
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      
      if (!code || !state) {
        throw new Error('Missing authorization code or state');
      }

      // Exchange code for tokens
      const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: Deno.env.get('MICROSOFT_CLIENT_ID') ?? '',
          client_secret: Deno.env.get('MICROSOFT_CLIENT_SECRET') ?? '',
          code,
          grant_type: 'authorization_code',
          redirect_uri: `${url.origin}/outlook-oauth?action=callback`,
        }),
      });

      if (!tokenResponse.ok) {
        throw new Error('Failed to exchange authorization code');
      }

      const tokenData = await tokenResponse.json();

      // Get user's default calendar
      const calendarResponse = await fetch('https://graph.microsoft.com/v1.0/me/calendar', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
        },
      });

      if (!calendarResponse.ok) {
        throw new Error('Failed to fetch calendar information');
      }

      const calendarData = await calendarResponse.json();

      // Get user's tenant ID
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('id', state)
        .single();

      if (userError || !userData) {
        throw new Error('Failed to fetch user data');
      }

      // Store calendar integration
      const { error: insertError } = await supabase
        .from('calendar_integrations')
        .insert({
          tenant_id: userData.tenant_id,
          user_id: state,
          provider: 'outlook',
          calendar_id: calendarData.id,
          calendar_name: calendarData.name,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          token_expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
        });

      if (insertError) {
        console.error('Failed to store calendar integration:', insertError);
        throw new Error('Failed to save calendar integration');
      }

      // Return success response
      return new Response(
        JSON.stringify({ 
          success: true, 
          calendar: {
            id: calendarData.id,
            name: calendarData.name
          }
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );

    } else if (action === 'refresh') {
      // Step 3: Refresh access token
      const { refresh_token } = await req.json();
      
      if (!refresh_token) {
        throw new Error('Missing refresh token');
      }

      const refreshResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: Deno.env.get('MICROSOFT_CLIENT_ID') ?? '',
          client_secret: Deno.env.get('MICROSOFT_CLIENT_SECRET') ?? '',
          refresh_token,
          grant_type: 'refresh_token',
        }),
      });

      if (!refreshResponse.ok) {
        throw new Error('Failed to refresh access token');
      }

      const refreshData = await refreshResponse.json();
      
      return new Response(
        JSON.stringify({
          access_token: refreshData.access_token,
          expires_in: refreshData.expires_in,
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );

    } else {
      throw new Error('Invalid action parameter');
    }

  } catch (error) {
    console.error('Outlook OAuth error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});