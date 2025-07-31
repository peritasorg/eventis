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

    const url = new URL(req.url);
    let action;
    
    if (req.method === 'GET') {
      action = url.searchParams.get('action');
    } else {
      const body = await req.json();
      action = body.action || url.searchParams.get('action');
    }

    // Skip authorization for callback action (comes from Google redirect)
    let user = null;
    if (action !== 'callback') {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        throw new Error('Missing authorization header');
      }

      // Verify JWT token
      const token = authHeader.replace('Bearer ', '');
      const { data: userData, error: authError } = await supabase.auth.getUser(token);
      
      if (authError || !userData.user) {
        throw new Error('Invalid authorization token');
      }
      
      user = userData.user;
    }

    if (action === 'authorize') {
      // Step 1: Generate OAuth URL
      const redirectUri = 'https://vbowtpkisiabdwwgttry.supabase.co/functions/v1/google-oauth?action=callback';
      const scopes = 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events';
      
      const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/auth');
      googleAuthUrl.searchParams.set('client_id', Deno.env.get('GOOGLE_CLIENT_ID') ?? '');
      googleAuthUrl.searchParams.set('redirect_uri', redirectUri);
      googleAuthUrl.searchParams.set('scope', scopes);
      googleAuthUrl.searchParams.set('response_type', 'code');
      googleAuthUrl.searchParams.set('access_type', 'offline');
      googleAuthUrl.searchParams.set('prompt', 'consent');
      googleAuthUrl.searchParams.set('state', user.id); // Include user ID in state

      return new Response(
        JSON.stringify({ authUrl: googleAuthUrl.toString() }),
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

      // Validate state parameter is a valid UUID (security check)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(state)) {
        throw new Error('Invalid state parameter');
      }

      // Exchange code for tokens
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: Deno.env.get('GOOGLE_CLIENT_ID') ?? '',
          client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET') ?? '',
          code,
          grant_type: 'authorization_code',
          redirect_uri: 'https://vbowtpkisiabdwwgttry.supabase.co/functions/v1/google-oauth?action=callback',
        }),
      });

      if (!tokenResponse.ok) {
        throw new Error('Failed to exchange authorization code');
      }

      const tokenData = await tokenResponse.json();

      // Get user's calendar list (all calendars, not just primary)
      const calendarListResponse = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
        },
      });

      if (!calendarListResponse.ok) {
        throw new Error('Failed to fetch calendar list');
      }

      const calendarListData = await calendarListResponse.json();
      
      // Use primary calendar by default, but we'll store info about all calendars
      const primaryCalendar = calendarListData.items?.find((cal: any) => cal.primary) || calendarListData.items?.[0];
      
      if (!primaryCalendar) {
        throw new Error('No calendars found');
      }

      // Get user's tenant ID
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('id', state)
        .single();

      if (userError || !userData) {
        throw new Error('Failed to fetch user data');
      }

      // Store calendar integration for the primary calendar
      const { error: insertError } = await supabase
        .from('calendar_integrations')
        .insert({
          tenant_id: userData.tenant_id,
          user_id: state,
          provider: 'google',
          calendar_id: primaryCalendar.id,
          calendar_name: primaryCalendar.summary,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          token_expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
        });

      if (insertError) {
        console.error('Failed to store calendar integration:', insertError);
        throw new Error('Failed to save calendar integration');
      }

      // Store all available calendars as metadata for future use
      const availableCalendars = calendarListData.items?.map((cal: any) => ({
        id: cal.id,
        name: cal.summary,
        primary: cal.primary || false,
        accessRole: cal.accessRole,
        backgroundColor: cal.backgroundColor,
      })) || [];

      // Return success response with calendar info
      return new Response(
        JSON.stringify({ 
          success: true, 
          calendar: {
            id: primaryCalendar.id,
            name: primaryCalendar.summary
          },
          availableCalendars
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

      const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: Deno.env.get('GOOGLE_CLIENT_ID') ?? '',
          client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET') ?? '',
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

    } else if (action === 'list-calendars') {
      // Get user's calendar integrations to find access token
      const { data: integration, error: integrationError } = await supabase
        .from('calendar_integrations')
        .select('access_token, refresh_token, token_expires_at')
        .eq('user_id', user.id)
        .eq('provider', 'google')
        .eq('is_active', true)
        .single();

      if (integrationError || !integration) {
        throw new Error('No active Google calendar integration found');
      }

      // Check if token needs refresh
      let accessToken = integration.access_token;
      const expiresAt = new Date(integration.token_expires_at);
      const now = new Date();
      
      if (expiresAt <= now) {
        // Refresh token
        const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            client_id: Deno.env.get('GOOGLE_CLIENT_ID') ?? '',
            client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET') ?? '',
            refresh_token: integration.refresh_token,
            grant_type: 'refresh_token',
          }),
        });

        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          accessToken = refreshData.access_token;
          
          // Update token in database
          await supabase
            .from('calendar_integrations')
            .update({
              access_token: accessToken,
              token_expires_at: new Date(Date.now() + refreshData.expires_in * 1000).toISOString(),
            })
            .eq('user_id', user.id)
            .eq('provider', 'google');
        }
      }

      // Get user's calendar list
      const calendarListResponse = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!calendarListResponse.ok) {
        throw new Error('Failed to fetch calendar list');
      }

      const calendarListData = await calendarListResponse.json();
      
      const availableCalendars = calendarListData.items?.map((cal: any) => ({
        id: cal.id,
        name: cal.summary,
        primary: cal.primary || false,
        accessRole: cal.accessRole,
        backgroundColor: cal.backgroundColor,
      })) || [];

      return new Response(
        JSON.stringify({ calendars: availableCalendars }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );

    } else {
      throw new Error('Invalid action parameter');
    }

  } catch (error) {
    console.error('Google OAuth error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});