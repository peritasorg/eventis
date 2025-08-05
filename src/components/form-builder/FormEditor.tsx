
import React from 'react';
import { EnhancedDragDropFormBuilder } from './EnhancedDragDropFormBuilder';

interface FormEditorProps {
  form: any;
  onBack: () => void;
}

export const FormEditor: React.FC<FormEditorProps> = ({ form, onBack }) => {
  return <EnhancedDragDropFormBuilder form={form} onBack={onBack} />;
};
