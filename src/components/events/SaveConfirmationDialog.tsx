import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface SaveConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaveAndContinue: () => void;
  onDiscardAndContinue: () => void;
  title?: string;
  description?: string;
}

export const SaveConfirmationDialog: React.FC<SaveConfirmationDialogProps> = ({
  open,
  onOpenChange,
  onSaveAndContinue,
  onDiscardAndContinue,
  title = "Unsaved Changes",
  description = "You have unsaved changes in this form. What would you like to do?"
}) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel onClick={() => onOpenChange(false)}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onDiscardAndContinue}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/80"
          >
            Discard Changes
          </AlertDialogAction>
          <AlertDialogAction onClick={onSaveAndContinue}>
            Save & Continue
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};