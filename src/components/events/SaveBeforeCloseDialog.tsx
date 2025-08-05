import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Save, Trash2, X } from 'lucide-react';

interface SaveBeforeCloseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaveAndClose: () => void;
  onDiscardChanges: () => void;
  formLabel: string;
  hasUnsavedChanges?: boolean;
}

export const SaveBeforeCloseDialog: React.FC<SaveBeforeCloseDialogProps> = ({
  open,
  onOpenChange,
  onSaveAndClose,
  onDiscardChanges,
  formLabel,
  hasUnsavedChanges = false
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <X className="h-5 w-5" />
            Close Form Tab
          </DialogTitle>
          <DialogDescription>
            What would you like to do with the "{formLabel}" form tab?
            {hasUnsavedChanges && (
              <span className="block mt-2 text-amber-600 font-medium">
                ⚠️ You have unsaved changes that will be lost if you discard.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        
        <DialogFooter className="flex-col sm:flex-col gap-2">
          <Button 
            onClick={onSaveAndClose}
            className="w-full"
            variant="default"
          >
            <Save className="h-4 w-4 mr-2" />
            Save and Close
            <span className="ml-2 text-xs opacity-70">(Can reopen later)</span>
          </Button>
          
          <Button 
            onClick={onDiscardChanges}
            variant="destructive"
            className="w-full"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Discard and Delete
            <span className="ml-2 text-xs opacity-70">(Permanent)</span>
          </Button>
          
          <Button 
            onClick={() => onOpenChange(false)}
            variant="outline"
            className="w-full"
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};