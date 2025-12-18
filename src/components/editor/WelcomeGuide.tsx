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
    <Card className="relative mb-6 overflow-hidden border-2 border-purple-300 bg-gradient-to-r from-purple-50 to-cyan-50 p-6 dark:from-purple-950/30 dark:to-cyan-950/30">
      {/* Close Button */}
      <button
        onClick={handleDismiss}
        className="absolute right-4 top-4 rounded-full p-1 hover:bg-white/50 dark:hover:bg-gray-800/50"
        aria-label="Dismiss welcome guide"
      >
        <X className="h-5 w-5 text-gray-500" />
      </button>

      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-600">
          <Rocket className="h-6 w-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-purple-900 dark:text-purple-100">
            Welcome to Vitex!
          </h2>
          <p className="text-sm text-purple-700 dark:text-purple-300">
            Create your professional LaTeX resume in minutes
          </p>
        </div>
      </div>

      {/* Quick Start Steps */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="flex gap-3 rounded-lg bg-white/50 p-4 dark:bg-gray-900/50">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-purple-600 text-sm font-bold text-white">
            1
          </div>
          <div>
            <div className="mb-1 flex items-center gap-2">
              <Edit className="h-4 w-4 text-purple-600" />
              <h3 className="font-semibold">Edit Your Info</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Fill in your details using the form on the left
            </p>
          </div>
        </div>

        <div className="flex gap-3 rounded-lg bg-white/50 p-4 dark:bg-gray-900/50">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-cyan-600 text-sm font-bold text-white">
            2
          </div>
          <div>
            <div className="mb-1 flex items-center gap-2">
              <FileCode className="h-4 w-4 text-cyan-600" />
              <h3 className="font-semibold">Preview Style</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              See the template design on the right
            </p>
          </div>
        </div>

        <div className="flex gap-3 rounded-lg bg-white/50 p-4 dark:bg-gray-900/50">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-green-600 text-sm font-bold text-white">
            3
          </div>
          <div>
            <div className="mb-1 flex items-center gap-2">
              <Download className="h-4 w-4 text-green-600" />
              <h3 className="font-semibold">Export to PDF</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Click &quot;Open in Overleaf&quot; in the toolbar
            </p>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          💡 <strong>Tip:</strong> Your data is auto-saved in your browser. Export as JSON to back up!
        </p>
        <Button onClick={handleDismiss} variant="outline" size="sm">
          Got it!
        </Button>
      </div>
    </Card>
  );
}
