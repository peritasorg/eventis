
import React from 'react';
import { DragDropFormBuilder } from './DragDropFormBuilder';

interface FormEditorProps {
  form: any;
  onBack: () => void;
}

export const FormEditor: React.FC<FormEditorProps> = ({ form, onBack }) => {
  return <DragDropFormBuilder form={form} onBack={onBack} />;
};
