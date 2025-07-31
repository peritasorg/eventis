import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Check, X, Edit } from 'lucide-react';

interface InlineNumberProps {
  value: number;
  onSave: (value: number) => void;
  placeholder?: string;
  step?: number;
  min?: number;
  max?: number;
  className?: string;
}

export const InlineNumber: React.FC<InlineNumberProps> = ({ 
  value, 
  onSave, 
  placeholder,
  step = 1,
  min,
  max,
  className = ""
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(value.toString());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInputValue(value.toString());
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    const numValue = parseFloat(inputValue) || 0;
    onSave(numValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setInputValue(value.toString());
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        <Input
          ref={inputRef}
          type="number"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          step={step}
          min={min}
          max={max}
          className={`h-8 text-sm ${className}`}
        />
        <Button
          size="sm"
          variant="ghost"
          onClick={handleSave}
          className="h-6 w-6 p-0"
        >
          <Check className="h-3 w-3 text-green-600" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleCancel}
          className="h-6 w-6 p-0"
        >
          <X className="h-3 w-3 text-red-600" />
        </Button>
      </div>
    );
  }

  const displayValue = step === 0.01 ? value.toFixed(2) : value.toString();

  return (
    <div 
      className="group flex items-center justify-between cursor-pointer hover:bg-muted/50 rounded px-2 py-1 -mx-2 -my-1"
      onClick={() => setIsEditing(true)}
    >
      <span className="text-sm text-foreground font-medium">
        {displayValue}
      </span>
      <Edit className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
};