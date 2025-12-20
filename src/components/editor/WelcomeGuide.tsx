'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Rocket, Edit, FileCode, Download } from 'lucide-react';

const WELCOME_DISMISSED_KEY = 'vitex-welcome-dismissed';

/**
 * WelcomeGuide component
 * Shows a welcome banner for first-time users with quick start guide
 */
export function WelcomeGuide() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has dismissed the welcome guide before
    const dismissed = localStorage.getItem(WELCOME_DISMISSED_KEY);
    if (!dismissed) {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(WELCOME_DISMISSED_KEY, 'true');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <Card className="relative mb-6 overflow-hidden border-2 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)] p-6">
      {/* Close Button */}
      <button
        onClick={handleDismiss}
        className="absolute right-4 top-4 rounded-lg p-1.5 border-2 border-black bg-white hover:bg-gray-100 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.9)] transition-all"
        aria-label="Dismiss welcome guide"
      >
        <X className="h-5 w-5 text-black" />
      </button>

      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#6C3CE9] border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,0.9)]">
          <Rocket className="h-6 w-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-black">
            Welcome to Vitex!
          </h2>
          <p className="text-sm text-muted-foreground font-medium">
            Create your professional LaTeX resume in minutes
          </p>
        </div>
      </div>

      {/* Quick Start Steps */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="flex gap-3 rounded-lg bg-gray-50 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,0.9)] p-4">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[#6C3CE9] border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,0.9)] text-sm font-black text-white">
            1
          </div>
          <div>
            <div className="mb-1 flex items-center gap-2">
              <Edit className="h-4 w-4 text-[#6C3CE9]" />
              <h3 className="font-bold">Edit Your Info</h3>
            </div>
            <p className="text-sm text-muted-foreground font-medium">
              Fill in your details using the form on the left
            </p>
          </div>
        </div>

        <div className="flex gap-3 rounded-lg bg-gray-50 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,0.9)] p-4">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[#00D4AA] border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,0.9)] text-sm font-black text-white">
            2
          </div>
          <div>
            <div className="mb-1 flex items-center gap-2">
              <FileCode className="h-4 w-4 text-[#00D4AA]" />
              <h3 className="font-bold">Preview Style</h3>
            </div>
            <p className="text-sm text-muted-foreground font-medium">
              See the template design on the right
            </p>
          </div>
        </div>

        <div className="flex gap-3 rounded-lg bg-gray-50 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,0.9)] p-4">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-green-600 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,0.9)] text-sm font-black text-white">
            3
          </div>
          <div>
            <div className="mb-1 flex items-center gap-2">
              <Download className="h-4 w-4 text-green-600" />
              <h3 className="font-bold">Export to PDF</h3>
            </div>
            <p className="text-sm text-muted-foreground font-medium">
              Click &quot;Open in Overleaf&quot; in the toolbar
            </p>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground font-medium">
          💡 <strong>Tip:</strong> Your data is auto-saved in your browser. Export as JSON to back up!
        </p>
        <Button 
          onClick={handleDismiss} 
          size="sm"
          className="border-2 border-black bg-white text-black font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.9)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:bg-gray-50 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.9)] active:translate-x-[2px] active:translate-y-[2px] transition-all duration-200"
        >
          Got it!
        </Button>
      </div>
    </Card>
  );
}
