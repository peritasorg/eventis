import React from 'react';
import { Button } from '@/components/ui/button';
import { Save, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FormSaveButtonProps {
  hasUnsavedChanges: boolean;
  onSave: () => void;
  isSaving: boolean;
  className?: string;
}

export const FormSaveButton: React.FC<FormSaveButtonProps> = ({
  hasUnsavedChanges,
  onSave,
  isSaving,
  className
}) => {
  return (
    <Button
      onClick={onSave}
      disabled={!hasUnsavedChanges || isSaving}
      variant={hasUnsavedChanges ? "default" : "outline"}
      size="sm"
      className={cn(
        "transition-all duration-200",
        hasUnsavedChanges && "bg-orange-600 hover:bg-orange-700 text-white",
        className
      )}
    >
      {isSaving ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Saving...
        </>
      ) : (
        <>
          <Save className="h-4 w-4 mr-2" />
          {hasUnsavedChanges ? 'Save Changes' : 'Saved'}
        </>
      )}
    </Button>
  );
};