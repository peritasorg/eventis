import React from 'react';
import { FieldLibrary } from '@/components/form-builder/FieldLibrary';

export const FieldLibraryPage = () => {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Field Library</h1>
        <p className="text-muted-foreground">Create and manage reusable form fields</p>
      </div>
      <div className="h-[calc(100vh-200px)]">
        <FieldLibrary showCreateButton={true} />
      </div>
    </div>
  );
};