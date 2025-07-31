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
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    // Handle OAuth errors
    if (error) {
      const errorDescription = url.searchParams.get('error_description') || error;
      console.error('OAuth error:', error, errorDescription);
      
      return new Response(
        `<!DOCTYPE html>
        <html>
        <head>
          <title>Outlook OAuth Error</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; padding: 40px; text-align: center; }
            .error { color: #dc3545; background: #f8d7da; padding: 20px; border-radius: 8px; }
          </style>
        </head>
        <body>
          <div class="error">
            <h2>OAuth Error</h2>
            <p>Error: ${errorDescription}</p>
            <p>Please close this window and try again.</p>
          </div>
        </body>
        </html>`,
        { 
          headers: { ...corsHeaders, 'Content-Type': 'text/html' },
          status: 400 
        }
      );
    }

    // Validate required parameters
    if (!code || !state) {
      return new Response(
        `<!DOCTYPE html>
        <html>
        <head>
          <title>Outlook OAuth Error</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; padding: 40px; text-align: center; }
            .error { color: #dc3545; background: #f8d7da; padding: 20px; border-radius: 8px; }
          </style>
        </head>
        <body>
          <div class="error">
            <h2>OAuth Error</h2>
            <p>Missing authorization code or state parameter.</p>
            <p>Please close this window and try again.</p>
          </div>
        </body>
        </html>`,
        { 
          headers: { ...corsHeaders, 'Content-Type': 'text/html' },
          status: 400 
        }
      );
    }

    console.log('Processing OAuth callback for user:', state);

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
        redirect_uri: `${url.origin}/outlook-oauth-callback`,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed:', errorText);
      throw new Error('Failed to exchange authorization code');
    }

    const tokenData = await tokenResponse.json();
    console.log('Token exchange successful');

    // Get user's default calendar
    const calendarResponse = await fetch('https://graph.microsoft.com/v1.0/me/calendar', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
      },
    });

    if (!calendarResponse.ok) {
      const errorText = await calendarResponse.text();
      console.error('Calendar fetch failed:', errorText);
      throw new Error('Failed to fetch calendar information');
    }

    const calendarData = await calendarResponse.json();
    console.log('Calendar info retrieved:', calendarData.name);

    // Get user's tenant ID
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('id', state)
      .single();

    if (userError || !userData) {
      console.error('User data fetch failed:', userError);
      throw new Error('Failed to fetch user data');
    }

    console.log('User tenant ID:', userData.tenant_id);

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

    console.log('Calendar integration stored successfully');

    // Return success page
    return new Response(
      `<!DOCTYPE html>
      <html>
      <head>
        <title>Outlook Calendar Connected</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; padding: 40px; text-align: center; }
          .success { color: #155724; background: #d4edda; padding: 20px; border-radius: 8px; }
          .calendar-info { margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px; }
        </style>
      </head>
      <body>
        <div class="success">
          <h2>✅ Outlook Calendar Connected Successfully!</h2>
          <div class="calendar-info">
            <h3>Connected Calendar:</h3>
            <p><strong>${calendarData.name}</strong></p>
            <p>Your events will now sync with this Outlook calendar.</p>
          </div>
          <p style="margin-top: 20px;">You can now close this window and return to your application.</p>
        </div>
        <script>
          // Auto-close the window after 3 seconds
          setTimeout(() => {
            window.close();
          }, 3000);
        </script>
      </body>
      </html>`,
      { 
        headers: { ...corsHeaders, 'Content-Type': 'text/html' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Outlook OAuth callback error:', error);
    
    return new Response(
      `<!DOCTYPE html>
      <html>
      <head>
        <title>Outlook OAuth Error</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; padding: 40px; text-align: center; }
          .error { color: #dc3545; background: #f8d7da; padding: 20px; border-radius: 8px; }
        </style>
      </head>
      <body>
        <div class="error">
          <h2>Connection Failed</h2>
          <p>There was an error connecting your Outlook calendar:</p>
          <p><em>${error.message}</em></p>
          <p>Please close this window and try again.</p>
        </div>
      </body>
      </html>`,
      { 
        headers: { ...corsHeaders, 'Content-Type': 'text/html' },
        status: 500 
      }
    );
  }
});