import React from 'react';
import { Button } from '@/components/ui/button';
import { Save, Loader2 } from 'lucide-react';

interface FormSaveButtonProps {
  hasUnsavedChanges: boolean;
  onSave: () => Promise<void>;
  isLoading?: boolean;
  disabled?: boolean;
}

export const FormSaveButton: React.FC<FormSaveButtonProps> = ({
  hasUnsavedChanges,
  onSave,
  isLoading = false,
  disabled = false
}) => {
  const handleSave = async () => {
    try {
      await onSave();
    } catch (error) {
      console.error('Save failed:', error);
    }
  };

  return (
    <Button
      onClick={handleSave}
      disabled={!hasUnsavedChanges || isLoading || disabled}
      size="sm"
      className="flex items-center gap-2"
      variant={hasUnsavedChanges ? "default" : "secondary"}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Save className="h-4 w-4" />
      )}
      {hasUnsavedChanges ? 'Save Changes' : 'Saved'}
    </Button>
  );
};