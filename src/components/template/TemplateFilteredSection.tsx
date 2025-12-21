'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { TemplateCard } from './TemplateCard';
import { TemplateMetadata, TemplateCategory } from '@/templates/types';

interface TemplateFilteredSectionProps {
  templates: TemplateMetadata[];
}

interface Category {
  id: 'all' | TemplateCategory;
  label: string;
}

const categories: Category[] = [
  { id: 'all', label: 'All' },
  { id: 'tech', label: 'Tech' },
  { id: 'academic', label: 'Academic' },
  { id: 'business', label: 'Business' },
  { id: 'creative', label: 'Creative' },
];

/**
 * Client-side component for filtering and displaying templates.
 */
export function TemplateFilteredSection({ templates }: TemplateFilteredSectionProps) {
  const [selectedCategory, setSelectedCategory] = useState<'all' | TemplateCategory>('all');

  // Filter templates based on selected category
  const filteredTemplates = selectedCategory === 'all'
    ? templates
    : templates.filter(t => t.category === selectedCategory);

  return (
    <>
      {/* Filter Section */}
      <section className="bg-white border-b-2 border-black">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-wrap gap-3">
            {categories.map((category) => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(category.id)}
              >
                {category.label}
                {category.id !== 'all' && (
                  <span className="ml-1.5 text-xs opacity-70">
                    ({templates.filter(t => t.category === category.id).length})
                  </span>
                )}
              </Button>
            ))}
          </div>
        </div>
      </section>

      {/* Templates Grid */}
      <section className="container mx-auto px-4 py-12">
        {filteredTemplates.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-lg text-muted-foreground font-medium">
              No templates found in this category.
            </p>
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {filteredTemplates.map((template) => (
              <TemplateCard key={template.id} metadata={template} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}

