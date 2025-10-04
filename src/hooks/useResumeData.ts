'use client';

import { useState, useEffect } from 'react';
import { ResumeData } from '@/lib/validation/schema';
import { resumeData as defaultResumeData } from '@/data/resume';

const STORAGE_KEY = 'easy-resume-data';

export function useResumeData() {
  const [data, setData] = useState<ResumeData>(defaultResumeData);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load data from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          setData(parsed);
        }
      } catch (error) {
        console.error('Failed to load resume data from localStorage:', error);
      } finally {
        setIsLoaded(true);
      }
    }
  }, []);

  // Save data to localStorage whenever it changes
  useEffect(() => {
    if (isLoaded && typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch (error) {
        console.error('Failed to save resume data to localStorage:', error);
      }
    }
  }, [data, isLoaded]);

  // Update resume data
  const updateData = (newData: ResumeData) => {
    setData(newData);
  };

  // Reset to default data
  const resetToDefault = () => {
    setData(defaultResumeData);
  };

  // Export data as JSON
  const exportData = () => {
    const dataStr = JSON.stringify(data, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `resume-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Import data from JSON
  const importData = (file: File) => {
    return new Promise<void>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const imported = JSON.parse(e.target?.result as string);
          setData(imported);
          resolve();
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  };

  // Clear all data
  const clearData = () => {
    const emptyData: ResumeData = {
      basics: {
        name: '',
        label: '',
        email: '',
        phone: '',
        location: '',
        summary: '',
        profiles: [],
      },
      education: [],
      skills: [],
      work: [],
      projects: [],
      achievements: [],
      certifications: [],
    };
    setData(emptyData);
  };

  return {
    data,
    isLoaded,
    updateData,
    resetToDefault,
    exportData,
    importData,
    clearData,
  };
}
