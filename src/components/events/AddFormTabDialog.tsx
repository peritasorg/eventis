import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';

interface AddFormTabDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (label: string) => void;
  existingForms: any[];
}

export const AddFormTabDialog: React.FC<AddFormTabDialogProps> = ({
  isOpen,
  onClose,
  onAdd,
  existingForms
}) => {
  const [label, setLabel] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (label.trim()) {
      onAdd(label.trim());
      setLabel('');
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Form Tab</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="label">Tab Label</Label>
            <Input
              id="label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Enter tab label"
              required
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              <Plus className="h-4 w-4 mr-2" />
              Add Tab
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};