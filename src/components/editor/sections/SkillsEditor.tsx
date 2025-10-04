'use client';

import { useFieldArray, UseFormReturn } from 'react-hook-form';
import { ResumeData } from '@/lib/validation/schema';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Code } from 'lucide-react';
import { useState } from 'react';

interface SkillsEditorProps {
  form: UseFormReturn<ResumeData>;
}

export function SkillsEditor({ form }: SkillsEditorProps) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'skills',
  });

  const addSkillCategory = () => {
    append({
      name: '',
      keywords: [],
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Code className="h-5 w-5" />
          <span className="font-medium">
            Skills ({fields.length} categories)
          </span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addSkillCategory}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Category
        </Button>
      </div>

      <div className="space-y-4">
        {fields.map((field, index) => (
          <SkillCategoryItem
            key={field.id}
            form={form}
            index={index}
            onRemove={() => remove(index)}
          />
        ))}
      </div>

      {fields.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-8">
          No skill categories yet. Click &quot;Add Category&quot; to add one.
        </p>
      )}
    </div>
  );
}

interface SkillCategoryItemProps {
  form: UseFormReturn<ResumeData>;
  index: number;
  onRemove: () => void;
}

function SkillCategoryItem({ form, index, onRemove }: SkillCategoryItemProps) {
  const { fields: keywords, append: appendKeyword, remove: removeKeyword } = useFieldArray({
    control: form.control,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    name: `skills.${index}.keywords` as any,
  });

  const [newKeyword, setNewKeyword] = useState('');

  const handleAddKeyword = () => {
    if (newKeyword.trim()) {
      appendKeyword(newKeyword.trim());
      setNewKeyword('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddKeyword();
    }
  };

  return (
    <div className="relative space-y-3 rounded-lg border p-4">
      <div className="flex items-start justify-between">
        <h4 className="font-medium">Category #{index + 1}</h4>
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
        <Label>Category Name *</Label>
        <Input
          {...form.register(`skills.${index}.name`)}
          placeholder="Programming Languages, Frameworks..."
        />
        {form.formState.errors.skills?.[index]?.name && (
          <p className="text-sm text-red-500">
            {form.formState.errors.skills[index]?.name?.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Skills</Label>
        <div className="flex gap-2">
          <Input
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a skill and press Enter"
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddKeyword}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {keywords.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {keywords.map((keyword, kIndex) => (
              <div
                key={keyword.id}
                className="flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-sm"
              >
                <input
                  type="hidden"
                  {...form.register(`skills.${index}.keywords.${kIndex}` as const)}
                />
                <span>{form.watch(`skills.${index}.keywords.${kIndex}`)}</span>
                <button
                  type="button"
                  onClick={() => removeKeyword(kIndex)}
                  className="ml-1 text-red-500 hover:text-red-700"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {keywords.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No skills added yet.
          </p>
        )}

        {form.formState.errors.skills?.[index]?.keywords && (
          <p className="text-sm text-red-500">
            {form.formState.errors.skills[index]?.keywords?.message}
          </p>
        )}
      </div>
    </div>
  );
}
