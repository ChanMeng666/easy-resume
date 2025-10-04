'use client';

import { useFieldArray, UseFormReturn } from 'react-hook-form';
import { ResumeData } from '@/lib/validation/schema';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';

interface BasicsEditorProps {
  form: UseFormReturn<ResumeData>;
}

export function BasicsEditor({ form }: BasicsEditorProps) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'basics.profiles',
  });

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="basics.name">Full Name *</Label>
          <Input
            id="basics.name"
            {...form.register('basics.name')}
            placeholder="John Doe"
          />
          {form.formState.errors.basics?.name && (
            <p className="text-sm text-red-500">
              {form.formState.errors.basics.name.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="basics.label">Professional Title *</Label>
          <Input
            id="basics.label"
            {...form.register('basics.label')}
            placeholder="Software Engineer"
          />
          {form.formState.errors.basics?.label && (
            <p className="text-sm text-red-500">
              {form.formState.errors.basics.label.message}
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="basics.email">Email *</Label>
          <Input
            id="basics.email"
            type="email"
            {...form.register('basics.email')}
            placeholder="john@example.com"
          />
          {form.formState.errors.basics?.email && (
            <p className="text-sm text-red-500">
              {form.formState.errors.basics.email.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="basics.phone">Phone *</Label>
          <Input
            id="basics.phone"
            {...form.register('basics.phone')}
            placeholder="+1 234 567 8900"
          />
          {form.formState.errors.basics?.phone && (
            <p className="text-sm text-red-500">
              {form.formState.errors.basics.phone.message}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="basics.location">Location *</Label>
        <Input
          id="basics.location"
          {...form.register('basics.location')}
          placeholder="New York, USA"
        />
        {form.formState.errors.basics?.location && (
          <p className="text-sm text-red-500">
            {form.formState.errors.basics.location.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="basics.summary">Professional Summary</Label>
        <Textarea
          id="basics.summary"
          {...form.register('basics.summary')}
          placeholder="Brief professional summary..."
          rows={6}
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Social Profiles</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ network: '', url: '', label: '' })}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Profile
          </Button>
        </div>

        <div className="space-y-3">
          {fields.map((field, index) => (
            <div
              key={field.id}
              className="grid gap-3 rounded-lg border p-3 sm:grid-cols-[1fr,2fr,1fr,auto]"
            >
              <div className="space-y-1">
                <Label className="text-xs">Network</Label>
                <Input
                  {...form.register(`basics.profiles.${index}.network`)}
                  placeholder="LinkedIn"
                  className="h-9"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">URL</Label>
                <Input
                  {...form.register(`basics.profiles.${index}.url`)}
                  placeholder="https://linkedin.com/in/..."
                  className="h-9"
                />
                {form.formState.errors.basics?.profiles?.[index]?.url && (
                  <p className="text-xs text-red-500">
                    {form.formState.errors.basics.profiles[index]?.url?.message}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Label (optional)</Label>
                <Input
                  {...form.register(`basics.profiles.${index}.label`)}
                  placeholder="johndoe"
                  className="h-9"
                />
              </div>

              <div className="flex items-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => remove(index)}
                  className="h-9"
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {fields.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No social profiles added yet. Click &quot;Add Profile&quot; to add one.
          </p>
        )}
      </div>
    </div>
  );
}
