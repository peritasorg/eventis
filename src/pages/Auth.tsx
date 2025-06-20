
import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { validateEmail, validatePassword, validateBusinessName, sanitizeInput } from '@/utils/securityUtils';

export const Auth = () => {
  const { user, signIn, signUp, loading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});

  // Redirect if already authenticated
  if (user && !loading) {
    return <Navigate to="/" replace />;
  }

  const validateSignInForm = (email: string, password: string): boolean => {
    const errors: { [key: string]: string } = {};
    
    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!validateEmail(email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    if (!password) {
      errors.password = 'Password is required';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateSignUpForm = (email: string, password: string, businessName: string, fullName: string): boolean => {
    const errors: { [key: string]: string } = {};
    
    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!validateEmail(email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      errors.password = passwordValidation.errors[0]; // Show first error
    }
    
    if (!businessName.trim()) {
      errors.businessName = 'Business name is required';
    } else if (!validateBusinessName(businessName)) {
      errors.businessName = 'Business name contains invalid characters';
    }
    
    if (!fullName.trim()) {
      errors.fullName = 'Full name is required';
    } else if (fullName.trim().length < 2) {
      errors.fullName = 'Full name must be at least 2 characters';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setValidationErrors({});
    
    const formData = new FormData(e.currentTarget);
    const email = sanitizeInput(formData.get('email') as string || '');
    const password = formData.get('password') as string || '';
    
    if (!validateSignInForm(email, password)) {
      setIsSubmitting(false);
      return;
    }
    
    const { error } = await signIn(email, password);
    
    if (error) {
      setError('Invalid email or password. Please try again.');
    }
    
    setIsSubmitting(false);
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setValidationErrors({});
    
    const formData = new FormData(e.currentTarget);
    const email = sanitizeInput(formData.get('email') as string || '');
    const password = formData.get('password') as string || '';
    const businessName = sanitizeInput(formData.get('businessName') as string || '');
    const fullName = sanitizeInput(formData.get('fullName') as string || '');
    
    if (!validateSignUpForm(email, password, businessName, fullName)) {
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
      if (error.message.includes('already registered')) {
        setError('An account with this email already exists. Please sign in instead.');
      } else if (error.message.includes('rate limit')) {
        setError('Too many attempts. Please wait before trying again.');
      } else {
        setError('Failed to create account. Please try again.');
      }
    }
    
    setIsSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center mb-8">
          <Building2 className="h-10 w-10 text-blue-600 mr-3" />
          <h1 className="text-3xl font-bold text-gray-900">BanquetPro</h1>
        </div>
        
        <Card>
          <CardHeader className="text-center">
            <CardTitle>Welcome to BanquetPro</CardTitle>
            <CardDescription>
              The complete solution for managing your banqueting business
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-700">
                <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}
            
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input
                      id="signin-email"
                      name="email"
                      type="email"
                      placeholder="Enter your email"
                      required
                      disabled={isSubmitting}
                      className={validationErrors.email ? 'border-red-500' : ''}
                    />
                    {validationErrors.email && (
                      <p className="text-sm text-red-600">{validationErrors.email}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="signin-password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter your password"
                        required
                        disabled={isSubmitting}
                        className={validationErrors.password ? 'border-red-500 pr-10' : 'pr-10'}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700"
                        disabled={isSubmitting}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {validationErrors.password && (
                      <p className="text-sm text-red-600">{validationErrors.password}</p>
                    )}
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full" 
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
              
              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Full Name</Label>
                    <Input
                      id="signup-name"
                      name="fullName"
                      type="text"
                      placeholder="Enter your full name"
                      required
                      disabled={isSubmitting}
                      className={validationErrors.fullName ? 'border-red-500' : ''}
                    />
                    {validationErrors.fullName && (
                      <p className="text-sm text-red-600">{validationErrors.fullName}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-business">Business Name</Label>
                    <Input
                      id="signup-business"
                      name="businessName"
                      type="text"
                      placeholder="Enter your business name"
                      required
                      disabled={isSubmitting}
                      className={validationErrors.businessName ? 'border-red-500' : ''}
                    />
                    {validationErrors.businessName && (
                      <p className="text-sm text-red-600">{validationErrors.businessName}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      name="email"
                      type="email"
                      placeholder="Enter your email"
                      required
                      disabled={isSubmitting}
                      className={validationErrors.email ? 'border-red-500' : ''}
                    />
                    {validationErrors.email && (
                      <p className="text-sm text-red-600">{validationErrors.email}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="signup-password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Create a password"
                        required
                        disabled={isSubmitting}
                        className={validationErrors.password ? 'border-red-500 pr-10' : 'pr-10'}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700"
                        disabled={isSubmitting}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {validationErrors.password && (
                      <p className="text-sm text-red-600">{validationErrors.password}</p>
                    )}
                    <p className="text-xs text-gray-500">
                      Password must be at least 8 characters with uppercase, lowercase, and numbers
                    </p>
                  </div>
                  <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                    🎉 <strong>14-day free trial</strong> - No credit card required
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full" 
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
            </Tabs>
          </CardContent>
        </Card>
        
        <div className="mt-6 text-center text-sm text-gray-600">
          <p>By signing up, you agree to our Terms of Service and Privacy Policy</p>
        </div>
      </div>
    </div>
  );
};
