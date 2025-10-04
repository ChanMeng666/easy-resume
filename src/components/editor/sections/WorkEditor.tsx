'use client';

import { useFieldArray, UseFormReturn } from 'react-hook-form';
import { ResumeData } from '@/lib/validation/schema';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Briefcase } from 'lucide-react';

interface WorkEditorProps {
  form: UseFormReturn<ResumeData>;
}

export function WorkEditor({ form }: WorkEditorProps) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'work',
  });

  const addWork = () => {
    append({
      company: '',
      position: '',
      startDate: '',
      endDate: '',
      location: '',
      type: '',
      highlights: [],
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Briefcase className="h-5 w-5" />
          <span className="font-medium">
            Work Experience ({fields.length})
          </span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addWork}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Work
        </Button>
      </div>

      <div className="space-y-4">
        {fields.map((field, index) => (
          <WorkItem
            key={field.id}
            form={form}
            index={index}
            onRemove={() => remove(index)}
          />
        ))}
      </div>

      {fields.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-8">
          No work experience yet. Click &quot;Add Work&quot; to add one.
        </p>
      )}
    </div>
  );
}

interface WorkItemProps {
  form: UseFormReturn<ResumeData>;
  index: number;
  onRemove: () => void;
}

function WorkItem({ form, index, onRemove }: WorkItemProps) {
  const { fields: highlights, append: appendHighlight, remove: removeHighlight } = useFieldArray({
    control: form.control,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    name: `work.${index}.highlights` as any,
  });

  return (
    <div className="relative space-y-3 rounded-lg border p-4">
      <div className="flex items-start justify-between">
        <h4 className="font-medium">Experience #{index + 1}</h4>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRemove}
        >
          <Trash2 className="h-4 w-4 text-red-500" />
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Company *</Label>
          <Input
            {...form.register(`work.${index}.company`)}
            placeholder="Company Name"
          />
          {form.formState.errors.work?.[index]?.company && (
            <p className="text-sm text-red-500">
              {form.formState.errors.work[index]?.company?.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Position *</Label>
          <Input
            {...form.register(`work.${index}.position`)}
            placeholder="Software Engineer"
          />
          {form.formState.errors.work?.[index]?.position && (
            <p className="text-sm text-red-500">
              {form.formState.errors.work[index]?.position?.message}
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-2">
          <Label>Location *</Label>
          <Input
            {...form.register(`work.${index}.location`)}
            placeholder="Remote, New York..."
          />
          {form.formState.errors.work?.[index]?.location && (
            <p className="text-sm text-red-500">
              {form.formState.errors.work[index]?.location?.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Type *</Label>
          <Input
            {...form.register(`work.${index}.type`)}
            placeholder="Full-time, Internship..."
          />
          {form.formState.errors.work?.[index]?.type && (
            <p className="text-sm text-red-500">
              {form.formState.errors.work[index]?.type?.message}
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Start Date *</Label>
          <Input
            {...form.register(`work.${index}.startDate`)}
            placeholder="Jan 2023"
          />
          {form.formState.errors.work?.[index]?.startDate && (
            <p className="text-sm text-red-500">
              {form.formState.errors.work[index]?.startDate?.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label>End Date *</Label>
          <Input
            {...form.register(`work.${index}.endDate`)}
            placeholder="PRESENT or Dec 2024"
          />
          {form.formState.errors.work?.[index]?.endDate && (
            <p className="text-sm text-red-500">
              {form.formState.errors.work[index]?.endDate?.message}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Key Highlights</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => appendHighlight('')}
          >
            <Plus className="mr-2 h-3 w-3" />
            Add Highlight
          </Button>
        </div>

        <div className="space-y-2">
          {highlights.map((highlight, hIndex) => (
            <div key={highlight.id} className="flex gap-2">
              <Textarea
                {...form.register(`work.${index}.highlights.${hIndex}` as const)}
                placeholder="Describe your achievement or responsibility..."
                rows={2}
                className="flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeHighlight(hIndex)}
                className="flex-shrink-0"
              >
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </div>
          ))}
        </div>

        {highlights.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No highlights added yet.
          </p>
        )}
      </div>
    </div>
  );
}
