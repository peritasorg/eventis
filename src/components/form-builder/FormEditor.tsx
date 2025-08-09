
import React from 'react';
import { EnhancedFormBuilder } from './EnhancedFormBuilder';

interface FormEditorProps {
  form: any;
  onBack: () => void;
}

export const FormEditor: React.FC<FormEditorProps> = ({ form, onBack }) => {
  return <EnhancedFormBuilder form={form} onBack={onBack} />;
};
