
import React from 'react';
import { IntegratedFormBuilder } from './IntegratedFormBuilderNew';

interface FormEditorProps {
  form: any;
  onBack: () => void;
}

export const FormEditor: React.FC<FormEditorProps> = ({ form, onBack }) => {
  return <IntegratedFormBuilder form={form} onBack={onBack} />;
};
