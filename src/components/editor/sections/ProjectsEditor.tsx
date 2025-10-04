'use client';

import { useFieldArray, UseFormReturn } from 'react-hook-form';
import { ResumeData } from '@/lib/validation/schema';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, FolderGit2 } from 'lucide-react';

interface ProjectsEditorProps {
  form: UseFormReturn<ResumeData>;
}

export function ProjectsEditor({ form }: ProjectsEditorProps) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'projects',
  });

  const addProject = () => {
    append({
      name: '',
      description: '',
      url: '',
      highlights: [],
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FolderGit2 className="h-5 w-5" />
          <span className="font-medium">
            Projects ({fields.length})
          </span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addProject}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Project
        </Button>
      </div>

      <div className="space-y-4">
        {fields.map((field, index) => (
          <ProjectItem
            key={field.id}
            form={form}
            index={index}
            onRemove={() => remove(index)}
          />
        ))}
      </div>

      {fields.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-8">
          No projects yet. Click &quot;Add Project&quot; to add one.
        </p>
      )}
    </div>
  );
}

interface ProjectItemProps {
  form: UseFormReturn<ResumeData>;
  index: number;
  onRemove: () => void;
}

function ProjectItem({ form, index, onRemove }: ProjectItemProps) {
  const { fields: highlights, append: appendHighlight, remove: removeHighlight } = useFieldArray({
    control: form.control,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    name: `projects.${index}.highlights` as any,
  });

  return (
    <div className="relative space-y-3 rounded-lg border p-4">
      <div className="flex items-start justify-between">
        <h4 className="font-medium">Project #{index + 1}</h4>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRemove}
        >
          <Trash2 className="h-4 w-4 text-red-500" />
        </Button>
      </div>

      <div className="space-y-2">
        <Label>Project Name *</Label>
        <Input
          {...form.register(`projects.${index}.name`)}
          placeholder="Amazing Project"
        />
        {form.formState.errors.projects?.[index]?.name && (
          <p className="text-sm text-red-500">
            {form.formState.errors.projects[index]?.name?.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Description *</Label>
        <Textarea
          {...form.register(`projects.${index}.description`)}
          placeholder="Brief description of the project..."
          rows={2}
        />
        {form.formState.errors.projects?.[index]?.description && (
          <p className="text-sm text-red-500">
            {form.formState.errors.projects[index]?.description?.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Project URL (optional)</Label>
        <Input
          {...form.register(`projects.${index}.url`)}
          placeholder="https://github.com/..."
        />
        {form.formState.errors.projects?.[index]?.url && (
          <p className="text-sm text-red-500">
            {form.formState.errors.projects[index]?.url?.message}
          </p>
        )}
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
                {...form.register(`projects.${index}.highlights.${hIndex}` as const)}
                placeholder="Describe project achievement or feature..."
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
