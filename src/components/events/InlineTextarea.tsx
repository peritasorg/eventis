import React, { useState, useRef, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Check, X, Edit } from 'lucide-react';

interface InlineTextareaProps {
  value: string;
  onSave: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
}

export const InlineTextarea: React.FC<InlineTextareaProps> = ({ 
  value, 
  onSave, 
  placeholder,
  rows = 3,
  className = ""
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing]);

  const handleSave = () => {
    onSave(inputValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setInputValue(value);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleCancel();
    } else if (e.key === 'Enter' && e.ctrlKey) {
      handleSave();
    }
  };

  if (isEditing) {
    return (
      <div className="space-y-2">
        <Textarea
          ref={textareaRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={rows}
          className={`text-sm resize-none ${className}`}
        />
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            onClick={handleSave}
            className="h-7 text-xs"
          >
            <Check className="h-3 w-3 mr-1" />
            Save
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleCancel}
            className="h-7 text-xs"
          >
            <X className="h-3 w-3 mr-1" />
            Cancel
          </Button>
          <span className="text-xs text-muted-foreground ml-2">
            Ctrl+Enter to save, Esc to cancel
          </span>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="group cursor-pointer hover:bg-muted/50 rounded px-2 py-1 -mx-2 -my-1"
      onClick={() => setIsEditing(true)}
    >
      <div className="flex items-start justify-between">
        <div className={`text-sm leading-relaxed flex-1 ${value ? 'text-foreground' : 'text-muted-foreground italic'}`}>
          {value ? (
            <div className="whitespace-pre-wrap">{value}</div>
          ) : (
            placeholder || 'Click to edit'
          )}
        </div>
        <Edit className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-0.5 ml-2 flex-shrink-0" />
      </div>
    </div>
  );
};