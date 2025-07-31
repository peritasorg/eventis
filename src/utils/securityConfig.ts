// Content Security Policy configuration
export const CSP_POLICY = {
  "default-src": ["'self'"],
  "script-src": [
    "'self'",
    "'unsafe-inline'", // Required for React inline scripts
    "'unsafe-eval'", // Required for React dev tools
    "https://js.stripe.com",
    "https://checkout.stripe.com"
  ],
  "style-src": [
    "'self'",
    "'unsafe-inline'", // Required for styled-components and CSS-in-JS
    "https://fonts.googleapis.com"
  ],
  "img-src": [
    "'self'",
    "data:",
    "https:",
    "blob:"
  ],
  "font-src": [
    "'self'",
    "https://fonts.gstatic.com"
  ],
  "connect-src": [
    "'self'",
    "https://*.supabase.co",
    "https://api.stripe.com",
    "https://checkout.stripe.com",
    "wss://*.supabase.co"
  ],
  "frame-src": [
    "https://js.stripe.com",
    "https://checkout.stripe.com"
  ],
  "object-src": ["'none'"],
  "base-uri": ["'self'"],
  "form-action": ["'self'"],
  "upgrade-insecure-requests": []
};

// Convert CSP policy object to string
export const getCSPString = (): string => {
  return Object.entries(CSP_POLICY)
    .map(([directive, sources]) => {
      if (sources.length === 0) {
        return directive;
      }
      return `${directive} ${sources.join(' ')}`;
    })
    .join('; ');
};

// Security headers configuration
export const SECURITY_HEADERS = {
  'Content-Security-Policy': getCSPString(),
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()'
};

// Input validation patterns
export const VALIDATION_PATTERNS = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^[\+]?[1-9][\d]{0,15}$/,
  name: /^[a-zA-Z\s\-'\.]{1,50}$/,
  businessName: /^[a-zA-Z0-9\s\-'\.&,]{1,100}$/,
  slug: /^[a-z0-9-]+$/,
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
};

// XSS prevention patterns
export const XSS_PATTERNS = [
  /<script[^>]*>.*?<\/script>/gi,
  /<iframe[^>]*>.*?<\/iframe>/gi,
  /javascript:/gi,
  /vbscript:/gi,
  /on\w+\s*=/gi,
  /<embed[^>]*>/gi,
  /<object[^>]*>/gi,
  /<link[^>]*>/gi,
  /<meta[^>]*>/gi
];

// Rate limiting configuration
export const RATE_LIMITS = {
  default: { requests: 100, window: 60000 }, // 100 requests per minute
  auth: { requests: 5, window: 60000 }, // 5 auth attempts per minute
  api: { requests: 50, window: 60000 }, // 50 API calls per minute
  upload: { requests: 10, window: 60000 } // 10 uploads per minute
};

// Security event risk levels
export const RISK_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
} as const;

export type RiskLevel = typeof RISK_LEVELS[keyof typeof RISK_LEVELS];