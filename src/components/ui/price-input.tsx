import React, { useState, forwardRef } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface PriceInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export const PriceInput = forwardRef<HTMLInputElement, PriceInputProps>(
  ({ value, onChange, placeholder = "0.00", disabled, className, ...props }, ref) => {
    const [internalValue, setInternalValue] = useState<string>('');
    const [isFocused, setIsFocused] = useState(false);

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      // If the value is 0, clear it so user can type from scratch
      if (value === 0) {
        setInternalValue('');
      } else {
        setInternalValue(value.toString());
      }
      // Select all text for easy replacement
      e.target.select();
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      const inputValue = e.target.value.trim();
      
      // If empty or invalid, revert to original value
      if (!inputValue || isNaN(parseFloat(inputValue))) {
        setInternalValue('');
        return;
      }
      
      // Parse and save the value
      const numValue = parseFloat(inputValue);
      if (numValue !== value && numValue >= 0) {
        onChange(numValue);
      }
      setInternalValue('');
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (isFocused) {
        setInternalValue(e.target.value);
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.currentTarget.blur();
      }
    };

    // Show internal value when focused, otherwise show the actual value
    const displayValue = isFocused ? internalValue : (value === 0 ? '' : value.toString());

    return (
      <Input
        ref={ref}
        type="number"
        step="0.01"
        min="0"
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(className)}
        {...props}
      />
    );
  }
);

PriceInput.displayName = 'PriceInput';