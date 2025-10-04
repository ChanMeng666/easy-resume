'use client';

import { useFieldArray, UseFormReturn } from 'react-hook-form';
import { ResumeData } from '@/lib/validation/schema';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { LucideIcon } from 'lucide-react';

interface ListEditorProps {
  form: UseFormReturn<ResumeData>;
  name: 'achievements' | 'certifications';
  title: string;
  icon: LucideIcon;
  placeholder?: string;
  multiline?: boolean;
}

export function ListEditor({
  form,
  name,
  title,
  icon: Icon,
  placeholder = 'Add an item...',
  multiline = false
}: ListEditorProps) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    name: name as any,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5" />
          <span className="font-medium">
            {title} ({fields.length})
          </span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append('')}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add {title.endsWith('s') ? title.slice(0, -1) : title}
        </Button>
      </div>

      <div className="space-y-2">
        {fields.map((field, index) => (
          <div key={field.id} className="flex gap-2">
            {multiline ? (
              <Textarea
                {...form.register(`${name}.${index}` as const)}
                placeholder={placeholder}
                rows={2}
                className="flex-1"
              />
            ) : (
              <Input
                {...form.register(`${name}.${index}` as const)}
                placeholder={placeholder}
                className="flex-1"
              />
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => remove(index)}
              className="flex-shrink-0"
            >
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        ))}
      </div>

      {fields.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-8">
          No {title.toLowerCase()} yet. Click &quot;Add&quot; to add one.
        </p>
      )}
    </div>
  );
}
