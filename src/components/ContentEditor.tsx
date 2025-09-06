'use client';

import { useState } from 'react';
import { validateResumeContent, generateOptimizationTips } from '@/utils/content-validator';

interface ContentEditorProps {
  resumeData: any;
  className?: string;
}

export function ContentEditor({ resumeData, className = '' }: ContentEditorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [validationResult, setValidationResult] = useState(() => 
    validateResumeContent(resumeData)
  );

  const tips = generateOptimizationTips(validationResult);

  if (!isOpen) {
    return (
        <button
          onClick={() => setIsOpen(true)}
          className={`inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors ${className}`}
        >
          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <span className="text-sm font-medium text-gray-700">Edit Guide</span>
        </button>
    );
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Content Editing Guide</h3>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content status */}
        <div className="mb-6 p-3 bg-blue-50 rounded-lg">
          <h4 className="text-sm font-medium text-blue-900 mb-2">Current Status</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-blue-700">Pages:</span>
              <span className={`ml-2 font-medium ${
                validationResult.pageCount === 1 ? 'text-green-600' : 'text-orange-600'
              }`}>
                {validationResult.pageCount} page{validationResult.pageCount > 1 ? 's' : ''}
              </span>
            </div>
            <div>
              <span className="text-blue-700">Status:</span>
              <span className={`ml-2 font-medium ${
                validationResult.isValid ? 'text-green-600' : 'text-red-600'
              }`}>
                {validationResult.isValid ? '✓ Good' : '⚠ Needs optimization'}
              </span>
            </div>
          </div>
        </div>

        {/* Optimization tips */}
        {tips.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Optimization Tips</h4>
            <div className="space-y-2">
              {tips.map((tip, index) => (
                <div key={index} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-blue-500 mt-0.5">•</span>
                  <span>{tip}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Warning information */}
        {validationResult.warnings.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-orange-800 mb-2">⚠️ Warnings</h4>
            <div className="space-y-2">
              {validationResult.warnings.map((warning, index) => (
                <div key={index} className="text-sm text-orange-700 bg-orange-50 p-2 rounded">
                  {warning}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Editing recommendations */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-900 mb-3">📝 Editing Guidelines</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-600">
            <div className="space-y-2">
              <div>• Summary: ≤500 characters</div>
              <div>• Work highlights: ≤5 per position</div>
              <div>• Projects: Show ≤3 projects</div>
            </div>
            <div className="space-y-2">
              <div>• Achievements: ≤8 items</div>
              <div>• Skills: ≤6 categories</div>
              <div>• Certifications: ≤10 items</div>
            </div>
          </div>
        </div>

        {/* Editing instructions */}
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">🔧 How to Edit Content</h4>
          <div className="text-xs text-gray-600 space-y-1">
            <div>1. Edit the <code className="bg-gray-100 px-1 rounded">src/data/resume.ts</code> file</div>
            <div>2. Page updates automatically after saving</div>
            <div>3. Check effects in A4 preview mode</div>
            <div>4. Exported PDF matches A4 preview exactly</div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="mt-4 pt-4 border-t">
          <div className="flex gap-2">
            <button
              onClick={() => {
                const newResult = validateResumeContent(resumeData);
                setValidationResult(newResult);
              }}
              className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Re-check
            </button>
            
            <button
              onClick={() => {
                // Copy file path to clipboard
                if (navigator.clipboard) {
                  navigator.clipboard.writeText('src/data/resume.ts');
                }
              }}
              className="px-3 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
            >
              Copy Path
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
