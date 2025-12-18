'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { ResumeData } from '@/lib/validation/schema';
import { resumeData as defaultResumeData } from '@/data/resume';

const STORAGE_KEY = 'vitex-resume-data';

export function useResumeData() {
  const searchParams = useSearchParams();
  const resumeId = searchParams.get('id');

  const [data, setData] = useState<ResumeData>(defaultResumeData);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track if we're using database mode
  const isDbMode = !!resumeId;

  // Debounce timer ref for auto-save
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      if (resumeId) {
        // Load from database
        try {
          const response = await fetch(`/api/resumes/${resumeId}`);
          if (response.ok) {
            const resume = await response.json();
            if (resume.data) {
              setData(resume.data);
            }
          } else if (response.status === 404) {
            setError('Resume not found');
          } else {
            setError('Failed to load resume');
          }
        } catch (err) {
          console.error('Failed to load resume from database:', err);
          setError('Failed to load resume');
        } finally {
          setIsLoaded(true);
        }
      } else {
        // Load from localStorage
        if (typeof window !== 'undefined') {
          try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
              const parsed = JSON.parse(stored);
              setData(parsed);
            }
          } catch (err) {
            console.error('Failed to load resume data from localStorage:', err);
          } finally {
            setIsLoaded(true);
          }
        }
      }
    };

    loadData();
  }, [resumeId]);

  // Save to database (debounced)
  const saveToDatabase = useCallback(async (newData: ResumeData) => {
    if (!resumeId) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/resumes/${resumeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: newData }),
      });

      if (!response.ok) {
        console.error('Failed to save resume to database');
      }
    } catch (err) {
      console.error('Failed to save resume:', err);
    } finally {
      setIsSaving(false);
    }
  }, [resumeId]);

  // Save data whenever it changes
  useEffect(() => {
    if (!isLoaded) return;

    if (isDbMode) {
      // Debounced save to database
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        saveToDatabase(data);
      }, 1000); // Save after 1 second of inactivity
    } else {
      // Save to localStorage immediately
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (err) {
          console.error('Failed to save resume data to localStorage:', err);
        }
      }
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [data, isLoaded, isDbMode, saveToDatabase]);

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
    isSaving,
    error,
    resumeId,
    isDbMode,
    updateData,
    resetToDefault,
    exportData,
    importData,
    clearData,
  };
}
