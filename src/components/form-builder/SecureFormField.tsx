import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { sanitizeInput, validateTextLength } from '@/utils/security';
import { toast } from 'sonner';

interface SecureFormFieldProps {
  type: 'text' | 'textarea' | 'number' | 'email';
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  maxLength?: number;
  minLength?: number;
  className?: string;
}

export const SecureFormField: React.FC<SecureFormFieldProps> = ({
  type,
  label,
  value,
  onChange,
  placeholder,
  required = false,
  maxLength = 1000,
  minLength = 0,
  className
}) => {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    let newValue = event.target.value;
    
    // Validate length
    if (!validateTextLength(newValue, maxLength)) {
      toast.error(`${label} must be less than ${maxLength} characters`);
      return;
    }
    
    if (required && newValue.length < minLength) {
      // Allow typing but don't validate until blur
    }
    
    // Sanitize input for text fields
    if (type === 'text' || type === 'textarea') {
      newValue = sanitizeInput(newValue);
    }
    
    onChange(newValue);
  };
  
  const handleBlur = () => {
    if (required && value.length < minLength) {
      toast.error(`${label} must be at least ${minLength} characters`);
    }
  };

  const commonProps = {
    value,
    onChange: handleChange,
    onBlur: handleBlur,
    placeholder,
    required,
    className,
    maxLength
  };

  return (
    <div className="space-y-2">
      <Label>{label} {required && <span className="text-destructive">*</span>}</Label>
      {type === 'textarea' ? (
        <Textarea {...commonProps} rows={3} />
      ) : (
        <Input 
          {...commonProps} 
          type={type === 'number' ? 'number' : type === 'email' ? 'email' : 'text'} 
        />
      )}
    </div>
  );
};