'use client';

import { useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getAllTemplates } from '@/templates/registry';

interface TemplateSelectorProps {
  currentTemplateId: string;
  onTemplateChange: (templateId: string) => void;
}

export function TemplateSelector({ currentTemplateId, onTemplateChange }: TemplateSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const templates = getAllTemplates();
  const currentTemplate = templates.find(t => t.metadata.id === currentTemplateId);

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        className="w-full justify-between"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="truncate">{currentTemplate?.metadata.name || 'Select Template'}</span>
        <ChevronDown className="ml-2 h-4 w-4 shrink-0" />
      </Button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute left-0 right-0 top-full z-20 mt-2 max-h-64 overflow-auto rounded-md border bg-white shadow-lg dark:bg-gray-900">
            {templates.map((template) => (
              <button
                key={template.metadata.id}
                className="flex w-full items-center justify-between px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => {
                  onTemplateChange(template.metadata.id);
                  setIsOpen(false);
                }}
                disabled={template.metadata.isPremium}
              >
                <div className="flex-1">
                  <div className="font-medium">{template.metadata.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {template.metadata.description}
                  </div>
                  {template.metadata.isPremium && (
                    <span className="mt-1 inline-block rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                      Premium
                    </span>
                  )}
                </div>
                {currentTemplateId === template.metadata.id && (
                  <Check className="ml-2 h-4 w-4 shrink-0 text-primary" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
