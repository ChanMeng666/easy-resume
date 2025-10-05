'use client';

import { ResumeData } from '@/lib/validation/schema';
import { calculateOverallCompletion } from '@/lib/utils/completeness';
import { CheckCircle2, AlertCircle, Circle } from 'lucide-react';

interface ProgressIndicatorProps {
  data: ResumeData;
}

/**
 * ProgressIndicator component
 * Displays overall resume completion progress
 */
export function ProgressIndicator({ data }: ProgressIndicatorProps) {
  const completion = calculateOverallCompletion(data);

  // Determine status color and icon
  let statusColor = 'text-gray-400';
  let bgColor = 'bg-gray-200';
  let progressColor = 'bg-gray-400';
  let Icon = Circle;

  if (completion >= 80) {
    statusColor = 'text-green-600 dark:text-green-400';
    bgColor = 'bg-green-100 dark:bg-green-900/20';
    progressColor = 'bg-green-600';
    Icon = CheckCircle2;
  } else if (completion >= 40) {
    statusColor = 'text-yellow-600 dark:text-yellow-400';
    bgColor = 'bg-yellow-100 dark:bg-yellow-900/20';
    progressColor = 'bg-yellow-600';
    Icon = AlertCircle;
  }

  return (
    <div className={`rounded-lg border p-4 ${bgColor}`}>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={`h-5 w-5 ${statusColor}`} />
          <span className="font-semibold">Resume Completion</span>
        </div>
        <span className={`text-2xl font-bold ${statusColor}`}>{completion}%</span>
      </div>

      {/* Progress Bar */}
      <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
        <div
          className={`h-full ${progressColor} transition-all duration-500 ease-out`}
          style={{ width: `${completion}%` }}
        />
      </div>

      {/* Status Message */}
      <p className="mt-2 text-xs text-muted-foreground">
        {completion >= 80 && "Great! Your resume is nearly complete."}
        {completion >= 40 && completion < 80 && "Keep going! Fill in more details to improve your resume."}
        {completion < 40 && "Get started by filling in your basic information."}
      </p>
    </div>
  );
}
