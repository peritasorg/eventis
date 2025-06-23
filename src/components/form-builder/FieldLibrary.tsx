
import React from 'react';
import { FieldLibraryPopup } from './FieldLibraryPopup';

interface FieldLibraryProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const FieldLibrary: React.FC<FieldLibraryProps> = ({ 
  isOpen = true, 
  onClose = () => {} 
}) => {
  return <FieldLibraryPopup isOpen={isOpen} onClose={onClose} />;
};
