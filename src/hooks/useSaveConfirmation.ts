import { useState, useCallback } from 'react';

interface UseSaveConfirmationProps {
  hasUnsavedChanges: boolean;
  onSave: () => Promise<void>;
  onDiscard: () => void;
}

export const useSaveConfirmation = ({ hasUnsavedChanges, onSave, onDiscard }: UseSaveConfirmationProps) => {
  const [showDialog, setShowDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const handleNavigationAttempt = useCallback((action: () => void) => {
    if (hasUnsavedChanges) {
      setPendingAction(() => action);
      setShowDialog(true);
    } else {
      action();
    }
  }, [hasUnsavedChanges]);

  const handleSaveAndContinue = useCallback(async () => {
    try {
      await onSave();
      setShowDialog(false);
      if (pendingAction) {
        pendingAction();
        setPendingAction(null);
      }
    } catch (error) {
      console.error('Save failed:', error);
    }
  }, [onSave, pendingAction]);

  const handleDiscardAndContinue = useCallback(() => {
    onDiscard();
    setShowDialog(false);
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
  }, [onDiscard, pendingAction]);

  const handleCancel = useCallback(() => {
    setShowDialog(false);
    setPendingAction(null);
  }, []);

  return {
    showDialog,
    handleNavigationAttempt,
    handleSaveAndContinue,
    handleDiscardAndContinue,
    handleCancel
  };
};