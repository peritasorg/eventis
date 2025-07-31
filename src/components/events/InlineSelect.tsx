import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Check, X, Edit } from 'lucide-react';

interface InlineSelectProps {
  value: string;
  options: Array<{ value: string; label: string }>;
  onSave: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const InlineSelect: React.FC<InlineSelectProps> = ({ 
  value, 
  options,
  onSave, 
  placeholder,
  className = ""
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [selectValue, setSelectValue] = useState(value);

  const handleSave = () => {
    onSave(selectValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setSelectValue(value);
    setIsEditing(false);
  };

  const selectedOption = options.find(opt => opt.value === value);
  const displayValue = selectedOption?.label || placeholder || 'Click to select';

  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        <Select value={selectValue} onValueChange={setSelectValue}>
          <SelectTrigger className={`h-8 text-sm ${className}`}>
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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

  return (
    <div 
      className="group flex items-center justify-between cursor-pointer hover:bg-muted/50 rounded px-2 py-1 -mx-2 -my-1"
      onClick={() => setIsEditing(true)}
    >
      <span className={`text-sm ${value ? 'text-foreground' : 'text-muted-foreground italic'}`}>
        {displayValue}
      </span>
      <Edit className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
};