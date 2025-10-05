'use client';

import { useEffect, useRef, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ResumeData, resumeDataSchema } from '@/lib/validation/schema';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { BasicsEditor } from './sections/BasicsEditor';
import { EducationEditor } from './sections/EducationEditor';
import { WorkEditor } from './sections/WorkEditor';
import { ProjectsEditor } from './sections/ProjectsEditor';
import { SkillsEditor } from './sections/SkillsEditor';
import { ListEditor } from './sections/ListEditor';
import { ProgressIndicator } from './ProgressIndicator';
import { calculateSectionCompletions } from '@/lib/utils/completeness';
import {
  RotateCcw,
  Trash2,
  Trophy,
  Award,
  CheckCircle2,
  AlertCircle,
  Circle,
} from 'lucide-react';

interface ResumeEditorProps {
  data: ResumeData;
  onDataChange: (data: ResumeData) => void;
  onReset: () => void;
  onExport?: () => void; // Optional, kept for backwards compatibility but not used in UI
  onImport: (file: File) => Promise<void>;
  onClear: () => void;
}

export function ResumeEditor({
  data,
  onDataChange,
  onReset,
  onImport,
  onClear,
}: ResumeEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dataRef = useRef(data);
  const isResettingRef = useRef(false);

  // Update ref when data changes
  dataRef.current = data;

  const form = useForm<ResumeData>({
    resolver: zodResolver(resumeDataSchema),
    defaultValues: data,
    mode: 'onChange',
  });

  // Watch for form changes and update parent
  useEffect(() => {
    const subscription = form.watch((value) => {
      // Skip updates during form reset to avoid unnecessary callbacks
      if (value && !isResettingRef.current) {
        onDataChange(value as ResumeData);
      }
    });
    return () => subscription.unsubscribe();
  }, [form, onDataChange]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        await onImport(file);
        // Wait for parent to update, then reset form
        setTimeout(() => {
          isResettingRef.current = true;
          form.reset(dataRef.current);
          setTimeout(() => {
            isResettingRef.current = false;
          }, 0);
        }, 50);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } catch (error) {
        console.error('Import failed:', error);
        alert('Failed to import file. Please check the file format.');
      }
    }
  };

  const handleClear = () => {
    if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
      onClear();
      // Wait for parent to update, then reset form
      setTimeout(() => {
        isResettingRef.current = true;
        form.reset(dataRef.current);
        setTimeout(() => {
          isResettingRef.current = false;
        }, 0);
      }, 50);
    }
  };

  const handleReset = () => {
    if (confirm('Reset to example data? Your current changes will be lost.')) {
      onReset();
      // Wait for parent to update, then reset form
      setTimeout(() => {
        isResettingRef.current = true;
        form.reset(dataRef.current);
        setTimeout(() => {
          isResettingRef.current = false;
        }, 0);
      }, 50);
    }
  };

  // Calculate section completions
  const sectionCompletions = useMemo(() => {
    return calculateSectionCompletions(data);
  }, [data]);

  // Helper function to get completion badge
  const getCompletionBadge = (sectionId: string) => {
    const section = sectionCompletions.find(s => s.id === sectionId);
    if (!section) return null;

    if (section.status === 'complete') {
      return <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />;
    } else if (section.status === 'partial') {
      return (
        <div className="flex items-center gap-1">
          <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
          <span className="text-xs text-yellow-600 dark:text-yellow-400">{section.completion}%</span>
        </div>
      );
    } else {
      return <Circle className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Progress Indicator */}
      <ProgressIndicator data={data} />

      {/* Form Sections */}
      <form className="space-y-4">
        <Accordion type="multiple" defaultValue={['basics']} className="w-full">
          <AccordionItem value="basics">
            <AccordionTrigger className="text-base font-semibold">
              <div className="flex items-center justify-between w-full pr-2">
                <span>👤 Personal Information</span>
                {getCompletionBadge('basics')}
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <BasicsEditor form={form} />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="education">
            <AccordionTrigger className="text-base font-semibold">
              <div className="flex items-center justify-between w-full pr-2">
                <span>🎓 Education</span>
                {getCompletionBadge('education')}
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <EducationEditor form={form} />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="work">
            <AccordionTrigger className="text-base font-semibold">
              <div className="flex items-center justify-between w-full pr-2">
                <span>💼 Work Experience</span>
                {getCompletionBadge('work')}
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <WorkEditor form={form} />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="projects">
            <AccordionTrigger className="text-base font-semibold">
              <div className="flex items-center justify-between w-full pr-2">
                <span>🚀 Projects</span>
                {getCompletionBadge('projects')}
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <ProjectsEditor form={form} />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="skills">
            <AccordionTrigger className="text-base font-semibold">
              <div className="flex items-center justify-between w-full pr-2">
                <span>💻 Skills</span>
                {getCompletionBadge('skills')}
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <SkillsEditor form={form} />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="achievements">
            <AccordionTrigger className="text-base font-semibold">
              <div className="flex items-center justify-between w-full pr-2">
                <span>🏆 Achievements</span>
                {getCompletionBadge('achievements')}
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <ListEditor
                form={form}
                name="achievements"
                title="Achievements"
                icon={Trophy}
                placeholder="Award or recognition..."
                multiline
              />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="certifications">
            <AccordionTrigger className="text-base font-semibold">
              <div className="flex items-center justify-between w-full pr-2">
                <span>📜 Certifications</span>
                {getCompletionBadge('certifications')}
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <ListEditor
                form={form}
                name="certifications"
                title="Certifications"
                icon={Award}
                placeholder="Certification name..."
              />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </form>

      {/* Info Note */}
      <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-950/20">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          💡 <strong>Tip:</strong> Your changes are automatically saved to your browser.
          Use the Export menu in the toolbar to back up your data.
        </p>
      </div>

      {/* Bottom Action Buttons */}
      <div className="flex flex-wrap gap-2 border-t pt-4">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleReset}
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset to Example
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleClear}
          className="text-red-500 hover:text-red-600"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Clear All Data
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
