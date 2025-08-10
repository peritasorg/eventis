import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface FormEditorProps {
  form: any;
  onBack: () => void;
}

export const FormEditor: React.FC<FormEditorProps> = ({ form, onBack }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Form Editor - {form?.name || 'Untitled'}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Form editing functionality is being rebuilt with the new architecture.
        </p>
      </CardContent>
    </Card>
  );
};