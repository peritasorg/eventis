
import React, { useState, useEffect } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, AlertCircle, Mail, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const FloatingEmoji = ({ emoji, delay }: { emoji: string; delay: number }) => {
  const randomX = Math.random() * 100;
  const randomY = Math.random() * 100;
  const randomDuration = 12 + Math.random() * 8; // 12-20 seconds for slower movement
  const randomDirection = Math.random() > 0.5 ? 1 : -1;
  const randomRotation = Math.random() * 360;
  
  return (
    <div 
      className="absolute text-5xl pointer-events-none select-none"
      style={{
        left: `${randomX}%`,
        top: `${randomY}%`,
        animation: `floatAround ${randomDuration}s ease-in-out infinite`,
        animationDelay: `${delay}s`,
        transform: `scale(${0.6 + Math.random() * 0.8}) rotate(${randomRotation}deg)`,
        filter: 'brightness(0) saturate(100%) invert(100%) sepia(100%) saturate(0%) hue-rotate(93deg) brightness(103%) contrast(103%)',
        textShadow: '0 0 20px rgba(255, 255, 255, 0.3), 0 0 40px rgba(255, 255, 255, 0.2)',
        opacity: 0.15 + Math.random() * 0.1, // Slight opacity variation
      }}
    >
      <style>{`
        @keyframes floatAround {
          0% {
            transform: translate(0, 0) rotate(${randomRotation}deg) scale(${0.6 + Math.random() * 0.8});
          }
          25% {
            transform: translate(${30 * randomDirection}px, -40px) rotate(${randomRotation + 90}deg) scale(${0.8 + Math.random() * 0.4});
          }
          50% {
            transform: translate(${60 * randomDirection}px, 20px) rotate(${randomRotation + 180}deg) scale(${0.6 + Math.random() * 0.6});
          }
          75% {
            transform: translate(${-20 * randomDirection}px, -30px) rotate(${randomRotation + 270}deg) scale(${0.7 + Math.random() * 0.5});
          }
          100% {
            transform: translate(0, 0) rotate(${randomRotation + 360}deg) scale(${0.6 + Math.random() * 0.8});
          }
        }
      `}</style>
      {emoji}
    </div>
  );
};

export const Auth = () => {
  const { user, signIn, signUp, loading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const [searchParams] = useSearchParams();
  const verified = searchParams.get('verified') === 'true';

  const eventEmojis = ['☁️', '🏛️', '🎈', '🎉', '🎊', '🥂', '💐', '🎪', '🏰', '⛪', '🕌', '🏢', '🍾', '🎭', '🎨'];

  // Show verification success message
  useEffect(() => {
    if (verified) {
      toast.success('Email verified successfully! You can now sign in.');
    }
  }, [verified]);

  // Redirect if already authenticated
  if (user && !loading) {
    return <Navigate to="/" replace />;
  }

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    
    if (!email || !password) {
      setError('Please fill in all fields');
      setIsSubmitting(false);
      return;
    }
    
    const { error } = await signIn(email, password);
    
    if (error) {
      setError(error.message || 'Failed to sign in');
    }
    
    setIsSubmitting(false);
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const businessName = formData.get('businessName') as string;
    const fullName = formData.get('fullName') as string;
    
    if (!email || !password || !businessName || !fullName) {
      setError('Please fill in all fields');
      setIsSubmitting(false);
      return;
    }
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setIsSubmitting(false);
      return;
    }
    
    const { error } = await signUp(email, password, {
      business_name: businessName,
      full_name: fullName,
      first_name: fullName.split(' ')[0] || '',
      last_name: fullName.split(' ').slice(1).join(' ') || ''
    });
    
    if (error) {
      setError(error.message || 'Failed to create account');
    }
    
    setIsSubmitting(false);
  };

  const handlePasswordReset = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    const formData = new FormData(e.currentTarget);
    const email = formData.get('resetEmail') as string;
    
    if (!email) {
      setError('Please enter your email address');
      setIsSubmitting(false);
      return;
    }
    
    try {
      // Use dynamic domain detection
      const currentOrigin = window.location.origin;
      const redirectUrl = `${currentOrigin}/auth?tab=reset-password`;
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });
      
      if (error) {
        setError(error.message);
      } else {
        setResetSent(true);
        toast.success('Password reset email sent! Check your inbox.');
      }
    } catch (error: any) {
      setError('Failed to send reset email');
    }
    
    setIsSubmitting(false);
  };

  if (loading) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center relative overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, hsl(218, 100%, 66%) 0%, hsl(220, 100%, 70%) 30%, hsl(222, 95%, 75%) 70%, rgba(255, 255, 255, 1) 100%)'
        }}
      >
        <div className="text-center relative z-10">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-white" />
          <p className="text-white/80">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, hsl(218, 100%, 66%) 0%, hsl(220, 100%, 70%) 30%, hsl(222, 95%, 75%) 70%, rgba(255, 255, 255, 1) 100%)'
      }}
    >
      {/* Floating Emojis */}
      {eventEmojis.map((emoji, index) => (
        <FloatingEmoji key={index} emoji={emoji} delay={index * 0.8} />
      ))}
      
      <div className="w-full max-w-md relative z-10">
        <div className="flex items-center justify-center mb-8">
          <img 
            src="/lovable-uploads/a1e4246b-792c-4cc3-a040-31c53413af0d.png" 
            alt="Eventis" 
            className="h-24 w-auto filter brightness-0 invert drop-shadow-lg"
          />
        </div>
        
        <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-2xl overflow-hidden">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-2xl font-bold text-slate-900">Welcome to Eventis</CardTitle>
            <CardDescription className="text-slate-600">
              The complete solution for managing your banqueting business
            </CardDescription>
          </CardHeader>
          <CardContent>
            {verified && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center text-emerald-700">
                <CheckCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                <span className="text-sm">Email verified successfully! You can now sign in.</span>
              </div>
            )}
            
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-700">
                <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}
            
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-slate-100">
                <TabsTrigger value="signin" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">Sign In</TabsTrigger>
                <TabsTrigger value="signup" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">Sign Up</TabsTrigger>
                <TabsTrigger value="reset" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">Reset</TabsTrigger>
              </TabsList>
              
              <div className="relative overflow-hidden">
                <TabsContent value="signin" className="data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:slide-in-from-right-2 data-[state=inactive]:animate-out data-[state=inactive]:fade-out-0 data-[state=inactive]:slide-out-to-left-2 transition-all duration-300">
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signin-email" className="text-slate-700">Email</Label>
                      <Input
                        id="signin-email"
                        name="email"
                        type="email"
                        placeholder="Enter your email"
                        required
                        disabled={isSubmitting}
                        className="border-slate-200 focus:border-emerald-400 focus:ring-emerald-400"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signin-password" className="text-slate-700">Password</Label>
                      <Input
                        id="signin-password"
                        name="password"
                        type="password"
                        placeholder="Enter your password"
                        required
                        disabled={isSubmitting}
                        className="border-slate-200 focus:border-emerald-400 focus:ring-emerald-400"
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" 
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Signing In...
                        </>
                      ) : (
                        'Sign In'
                      )}
                    </Button>
                  </form>
                </TabsContent>
                
                <TabsContent value="signup" className="data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:slide-in-from-right-2 data-[state=inactive]:animate-out data-[state=inactive]:fade-out-0 data-[state=inactive]:slide-out-to-left-2 transition-all duration-300">
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name" className="text-slate-700">Full Name</Label>
                      <Input
                        id="signup-name"
                        name="fullName"
                        type="text"
                        placeholder="Enter your full name"
                        required
                        disabled={isSubmitting}
                        className="border-slate-200 focus:border-emerald-400 focus:ring-emerald-400"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-business" className="text-slate-700">Business Name</Label>
                      <Input
                        id="signup-business"
                        name="businessName"
                        type="text"
                        placeholder="Enter your business name"
                        required
                        disabled={isSubmitting}
                        className="border-slate-200 focus:border-emerald-400 focus:ring-emerald-400"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email" className="text-slate-700">Email</Label>
                      <Input
                        id="signup-email"
                        name="email"
                        type="email"
                        placeholder="Enter your email"
                        required
                        disabled={isSubmitting}
                        className="border-slate-200 focus:border-emerald-400 focus:ring-emerald-400"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password" className="text-slate-700">Password</Label>
                      <Input
                        id="signup-password"
                        name="password"
                        type="password"
                        placeholder="Create a password"
                        required
                        minLength={6}
                        disabled={isSubmitting}
                        className="border-slate-200 focus:border-emerald-400 focus:ring-emerald-400"
                      />
                    </div>
                    <div className="text-sm text-slate-600 bg-emerald-50 p-3 rounded-lg border border-emerald-200">
                      🎉 <strong>14-day free trial</strong> - No credit card required
                      <br />
                      <small className="text-xs text-slate-500 mt-1 block">
                        You'll need to verify your email before accessing your account
                      </small>
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" 
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating Account...
                        </>
                      ) : (
                        'Start Free Trial'
                      )}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="reset" className="data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:slide-in-from-right-2 data-[state=inactive]:animate-out data-[state=inactive]:fade-out-0 data-[state=inactive]:slide-out-to-left-2 transition-all duration-300">
                  {resetSent ? (
                    <div className="text-center py-6">
                      <Mail className="h-12 w-12 text-emerald-600 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2 text-slate-900">Check your email</h3>
                      <p className="text-slate-600 text-sm">
                        We've sent a password reset link to your email address.
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={handlePasswordReset} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="reset-email" className="text-slate-700">Email Address</Label>
                        <Input
                          id="reset-email"
                          name="resetEmail"
                          type="email"
                          placeholder="Enter your email address"
                          required
                          disabled={isSubmitting}
                          className="border-slate-200 focus:border-emerald-400 focus:ring-emerald-400"
                        />
                      </div>
                      <p className="text-sm text-slate-600">
                        Enter your email address and we'll send you a link to reset your password.
                      </p>
                      <Button 
                        type="submit" 
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" 
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Sending Reset Link...
                          </>
                        ) : (
                          'Send Reset Link'
                        )}
                      </Button>
                    </form>
                  )}
                </TabsContent>
              </div>
            </Tabs>
          </CardContent>
        </Card>
        
        <div className="mt-6 text-center text-sm text-white/70">
          <p>By signing up, you agree to our Terms of Service and Privacy Policy</p>
        </div>
      </div>
    </div>
  );
};
