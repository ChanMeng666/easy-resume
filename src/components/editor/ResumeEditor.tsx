'use client';

import { useEffect, useRef } from 'react';
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
import {
  Download,
  Upload,
  RotateCcw,
  Trash2,
  Trophy,
  Award,
} from 'lucide-react';

interface ResumeEditorProps {
  data: ResumeData;
  onDataChange: (data: ResumeData) => void;
  onReset: () => void;
  onExport: () => void;
  onImport: (file: File) => Promise<void>;
  onClear: () => void;
}

export function ResumeEditor({
  data,
  onDataChange,
  onReset,
  onExport,
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

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

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

  return (
    <div className="space-y-4">
      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onExport}
        >
          <Download className="mr-2 h-4 w-4" />
          Export JSON
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleImportClick}
        >
          <Upload className="mr-2 h-4 w-4" />
          Import JSON
        </Button>

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
          Clear All
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Form Sections */}
      <form className="space-y-4">
        <Accordion type="multiple" defaultValue={['basics']} className="w-full">
          <AccordionItem value="basics">
            <AccordionTrigger className="text-base font-semibold">
              👤 Personal Information
            </AccordionTrigger>
            <AccordionContent>
              <BasicsEditor form={form} />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="education">
            <AccordionTrigger className="text-base font-semibold">
              🎓 Education
            </AccordionTrigger>
            <AccordionContent>
              <EducationEditor form={form} />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="work">
            <AccordionTrigger className="text-base font-semibold">
              💼 Work Experience
            </AccordionTrigger>
            <AccordionContent>
              <WorkEditor form={form} />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="projects">
            <AccordionTrigger className="text-base font-semibold">
              🚀 Projects
            </AccordionTrigger>
            <AccordionContent>
              <ProjectsEditor form={form} />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="skills">
            <AccordionTrigger className="text-base font-semibold">
              💻 Skills
            </AccordionTrigger>
            <AccordionContent>
              <SkillsEditor form={form} />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="achievements">
            <AccordionTrigger className="text-base font-semibold">
              🏆 Achievements
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
              📜 Certifications
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
          Export your data as JSON to back it up or share it.
        </p>
      </div>
    </div>
  );
}
