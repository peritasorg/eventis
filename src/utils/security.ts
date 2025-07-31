import DOMPurify from 'dompurify';

// Input sanitization utilities
export const sanitizeInput = (input: string | null | undefined): string => {
  if (!input) return '';
  
  // Basic XSS prevention
  return DOMPurify.sanitize(input, { 
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: []
  }).trim();
};

export const sanitizeHtml = (html: string | null | undefined): string => {
  if (!html) return '';
  
  // Allow safe HTML tags only
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: []
  });
};

// Validation functions
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
};

export const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
};

export const validateTextLength = (text: string, maxLength: number = 1000): boolean => {
  return text.length <= maxLength;
};

// Security headers helper
export const getSecurityHeaders = () => ({
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin'
});

// Enhanced safe navigation helper
export const safeNavigate = (navigate: (path: string) => void, path: string) => {
  // Prevent XSS through navigation
  if (!path || typeof path !== 'string') {
    console.warn('Invalid navigation path provided');
    return;
  }
  
  // Sanitize the path
  const sanitizedPath = path.trim();
  
  // Only allow relative paths starting with / and no suspicious content
  if (sanitizedPath.startsWith('/') && 
      !sanitizedPath.includes('javascript:') && 
      !sanitizedPath.includes('data:') &&
      !sanitizedPath.includes('<script') &&
      !sanitizedPath.includes('vbscript:') &&
      !/on\w+\s*=/i.test(sanitizedPath)) {
    navigate(sanitizedPath);
  } else {
    console.warn('Potentially unsafe navigation blocked:', path);
    // Fallback to safe default
    navigate('/');
  }
};

// CSRF token generation (for future use)
export const generateCSRFToken = (): string => {
  return crypto.getRandomValues(new Uint8Array(32)).reduce(
    (str, byte) => str + byte.toString(16).padStart(2, '0'), 
    ''
  );
};