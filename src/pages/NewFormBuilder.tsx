import React from 'react';
import { NewFormBuilder } from '@/components/form-builder/NewFormBuilder';
import { useNavigate } from 'react-router-dom';

export const NewFormBuilderPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="h-full">
      <NewFormBuilder onSave={() => navigate('/forms')} />
    </div>
  );
};