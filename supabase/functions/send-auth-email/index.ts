
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AuthEmailRequest {
  to: string;
  type: 'confirmation' | 'recovery' | 'magic_link';
  token?: string;
  redirectTo?: string;
  userData?: {
    full_name?: string;
    business_name?: string;
  };
}

const getEmailTemplate = (type: string, token?: string, redirectTo?: string, userData?: any) => {
  const baseUrl = "https://vbowtpkisiabdwwgttry.supabase.co";
  
  switch (type) {
    case 'confirmation':
      return {
        subject: "Welcome to BanquetPro - Confirm your email",
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <title>Welcome to BanquetPro</title>
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { text-align: center; margin-bottom: 30px; }
                .logo { color: #2563eb; font-size: 32px; font-weight: bold; margin-bottom: 10px; }
                .button { display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; }
                .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; text-align: center; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <div class="logo">🏛️ BanquetPro</div>
                  <h1>Welcome to BanquetPro!</h1>
                </div>
                
                <p>Hi ${userData?.full_name || 'there'},</p>
                
                <p>Welcome to BanquetPro, the complete solution for managing your banqueting business! We're excited to have you on board.</p>
                
                <p>To get started, please confirm your email address by clicking the button below:</p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${baseUrl}/auth/v1/verify?token=${token}&type=signup&redirect_to=${redirectTo || window.location.origin}" class="button">
                    Confirm Email Address
                  </a>
                </div>
                
                <p>Once confirmed, you'll have access to your 14-day free trial and can start managing your events, leads, and customers.</p>
                
                <p>If you didn't create an account with BanquetPro, you can safely ignore this email.</p>
                
                <div class="footer">
                  <p>Best regards,<br>The BanquetPro Team</p>
                  <p>This email was sent to help you get started with your BanquetPro account.</p>
                </div>
              </div>
            </body>
          </html>
        `
      };
      
    case 'recovery':
      return {
        subject: "Reset your BanquetPro password",
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <title>Reset your BanquetPro password</title>
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { text-align: center; margin-bottom: 30px; }
                .logo { color: #2563eb; font-size: 32px; font-weight: bold; margin-bottom: 10px; }
                .button { display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; }
                .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; text-align: center; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <div class="logo">🏛️ BanquetPro</div>
                  <h1>Reset your password</h1>
                </div>
                
                <p>Hi there,</p>
                
                <p>We received a request to reset your BanquetPro account password.</p>
                
                <p>To reset your password, click the button below:</p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${baseUrl}/auth/v1/verify?token=${token}&type=recovery&redirect_to=${redirectTo || window.location.origin}" class="button">
                    Reset Password
                  </a>
                </div>
                
                <p>This link will expire in 1 hour for security reasons.</p>
                
                <p>If you didn't request a password reset, you can safely ignore this email - your password will remain unchanged.</p>
                
                <div class="footer">
                  <p>Best regards,<br>The BanquetPro Team</p>
                  <p>If you're having trouble, contact our support team.</p>
                </div>
              </div>
            </body>
          </html>
        `
      };
      
    default:
      return {
        subject: "BanquetPro Account",
        html: `<p>BanquetPro account notification</p>`
      };
  }
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, type, token, redirectTo, userData }: AuthEmailRequest = await req.json();
    
    console.log(`Sending ${type} email to ${to}`);
    
    const emailTemplate = getEmailTemplate(type, token, redirectTo, userData);
    
    const emailResponse = await resend.emails.send({
      from: "BanquetPro <onboarding@resend.dev>",
      to: [to],
      subject: emailTemplate.subject,
      html: emailTemplate.html,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error sending email:", error);
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
