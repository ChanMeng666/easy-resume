'use client';

import { useFieldArray, UseFormReturn } from 'react-hook-form';
import { ResumeData } from '@/lib/validation/schema';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, GraduationCap } from 'lucide-react';

interface EducationEditorProps {
  form: UseFormReturn<ResumeData>;
}

export function EducationEditor({ form }: EducationEditorProps) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'education',
  });

  const addEducation = () => {
    append({
      institution: '',
      area: '',
      studyType: '',
      startDate: '',
      endDate: '',
      location: '',
      gpa: '',
      note: '',
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5" />
          <span className="font-medium">
            Education ({fields.length})
          </span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addEducation}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Education
        </Button>
      </div>

      <div className="space-y-4">
        {fields.map((field, index) => (
          <div
            key={field.id}
            className="relative space-y-3 rounded-lg border p-4"
          >
            <div className="flex items-start justify-between">
              <h4 className="font-medium">Education #{index + 1}</h4>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => remove(index)}
              >
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Institution *</Label>
                <Input
                  {...form.register(`education.${index}.institution`)}
                  placeholder="University Name"
                />
                {form.formState.errors.education?.[index]?.institution && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.education[index]?.institution?.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Field of Study *</Label>
                <Input
                  {...form.register(`education.${index}.area`)}
                  placeholder="Computer Science"
                />
                {form.formState.errors.education?.[index]?.area && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.education[index]?.area?.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Degree Type *</Label>
                <Input
                  {...form.register(`education.${index}.studyType`)}
                  placeholder="Bachelor, Master, PhD..."
                />
                {form.formState.errors.education?.[index]?.studyType && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.education[index]?.studyType?.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Location *</Label>
                <Input
                  {...form.register(`education.${index}.location`)}
                  placeholder="New York, USA"
                />
                {form.formState.errors.education?.[index]?.location && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.education[index]?.location?.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Start Date *</Label>
                <Input
                  {...form.register(`education.${index}.startDate`)}
                  placeholder="Sep 2020"
                />
                {form.formState.errors.education?.[index]?.startDate && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.education[index]?.startDate?.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>End Date *</Label>
                <Input
                  {...form.register(`education.${index}.endDate`)}
                  placeholder="Jun 2024 or PRESENT"
                />
                {form.formState.errors.education?.[index]?.endDate && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.education[index]?.endDate?.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>GPA (optional)</Label>
                <Input
                  {...form.register(`education.${index}.gpa`)}
                  placeholder="3.8/4.0"
                />
              </div>

              <div className="space-y-2">
                <Label>Note (optional)</Label>
                <Input
                  {...form.register(`education.${index}.note`)}
                  placeholder="with Distinction, Honors..."
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {fields.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-8">
          No education entries yet. Click &quot;Add Education&quot; to add one.
        </p>
      )}
    </div>
  );
}
