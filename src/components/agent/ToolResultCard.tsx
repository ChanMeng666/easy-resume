'use client';

import { CheckCircle, AlertCircle, FileText, Target, BarChart3, Mail, Pencil } from 'lucide-react';

interface ToolResultCardProps {
  toolName: string;
  result?: Record<string, unknown>;
  state: string;
}

/**
 * Renders rich cards for AI tool call results.
 * Displays contextual information based on tool type.
 */
export function ToolResultCard({ toolName, result, state }: ToolResultCardProps) {
  // Show loading state for in-progress tools
  if (state !== 'result' || !result) {
    return (
      <div className="mt-2 p-3 rounded-lg bg-purple-50 border border-purple-200 animate-pulse">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded-full bg-purple-300" />
          <span className="text-xs font-bold text-purple-600">{getToolLabel(toolName)}...</span>
        </div>
      </div>
    );
  }

  const success = result.success as boolean;
  const Icon = getToolIcon(toolName);

  return (
    <div className={`mt-2 p-3 rounded-lg border ${
      success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
    }`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`h-4 w-4 ${success ? 'text-green-600' : 'text-red-600'}`} />
        <span className={`text-xs font-black ${success ? 'text-green-700' : 'text-red-700'}`}>
          {getToolLabel(toolName)}
        </span>
        {success ? (
          <CheckCircle className="h-3 w-3 text-green-600 ml-auto" />
        ) : (
          <AlertCircle className="h-3 w-3 text-red-600 ml-auto" />
        )}
      </div>

      {/* Tool-specific content */}
      {toolName === 'updateResume' && success && (
        <p className="text-xs text-green-700 font-medium">
          {(result.changeDescription as string) || 'Resume updated'}
        </p>
      )}

      {toolName === 'parseJobDescription' && success && (
        <div className="text-xs space-y-1">
          <p className="font-bold text-green-700">
            {(result.parsed as Record<string, unknown>)?.title as string} at{' '}
            {(result.parsed as Record<string, unknown>)?.company as string}
          </p>
          <p className="text-green-600 font-medium">
            {((result.parsed as Record<string, unknown>)?.requiredSkills as string[] || []).length} required skills,{' '}
            {((result.parsed as Record<string, unknown>)?.keywords as string[] || []).length} keywords extracted
          </p>
        </div>
      )}

      {toolName === 'analyzeJobMatch' && success && (
        <div className="text-xs space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-green-700">Match Score:</span>
            <span className="font-black text-green-800">
              {(result.analysis as Record<string, unknown>)?.overallScore as number || 0}/100
            </span>
          </div>
        </div>
      )}

      {toolName === 'scoreATSCompatibility' && success && (
        <div className="text-xs space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-green-700">ATS Score:</span>
            <span className="font-black text-green-800">
              {(result.report as Record<string, unknown>)?.overallScore as number || 0}/100
            </span>
          </div>
        </div>
      )}

      {toolName === 'generateCoverLetterTool' && success && (
        <p className="text-xs text-green-700 font-medium">Cover letter generated successfully</p>
      )}

      {toolName === 'tailorResumeToJob' && success && (
        <p className="text-xs text-green-700 font-medium">Resume tailored for the target role</p>
      )}

      {!success && (
        <p className="text-xs text-red-700 font-medium">
          {(result.error as string) || 'Operation failed'}
        </p>
      )}
    </div>
  );
}

/** Returns a human-readable label for tool names. */
function getToolLabel(toolName: string): string {
  const labels: Record<string, string> = {
    updateResume: 'Resume Updated',
    parseJobDescription: 'Job Description Parsed',
    analyzeJobMatch: 'Match Analysis',
    tailorResumeToJob: 'Resume Tailored',
    scoreATSCompatibility: 'ATS Score',
    generateCoverLetterTool: 'Cover Letter Generated',
  };
  return labels[toolName] || toolName;
}

/** Returns the appropriate icon for each tool type. */
function getToolIcon(toolName: string) {
  const icons: Record<string, typeof FileText> = {
    updateResume: Pencil,
    parseJobDescription: FileText,
    analyzeJobMatch: Target,
    tailorResumeToJob: Target,
    scoreATSCompatibility: BarChart3,
    generateCoverLetterTool: Mail,
  };
  return icons[toolName] || FileText;
}
