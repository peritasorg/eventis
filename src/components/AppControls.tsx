import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Maximize, Minimize, Moon, Sun } from 'lucide-react';
export const AppControls = () => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('darkMode') === 'true' || !localStorage.getItem('darkMode') && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
    localStorage.setItem('darkMode', isDarkMode.toString());

    // Force re-render of the entire app by updating body class
    document.body.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);
  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error('Fullscreen error:', error);
    }
  };
  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };
  return <div className="absolute top-4 right-4 z-50 flex gap-2">
      
      
      
    </div>;
};