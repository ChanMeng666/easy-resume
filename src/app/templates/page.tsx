import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/shared/Navbar';
import { Footer } from '@/components/shared/Footer';
import { TemplateCard } from '@/components/template/TemplateCard';
import { getAllTemplates } from '@/templates/registry';
import { TemplateGalleryClient } from './TemplateGalleryClient';

export const metadata = {
  title: 'Templates - Vitex',
  description: 'Browse all professional LaTeX resume templates and find the style that suits you',
};

export default function TemplatesPage() {
  // Get templates from registry
  const templates = getAllTemplates();
  const templateMetadata = templates.map(t => t.metadata);

  const categories = [
    { id: 'all', label: 'All' },
    { id: 'tech', label: 'Tech' },
    { id: 'academic', label: 'Academic' },
    { id: 'business', label: 'Business' },
    { id: 'creative', label: 'Creative' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* GEO: Client-side AI instructions and structured data */}
      <TemplateGalleryClient templateMetadata={templateMetadata} />

      {/* Navigation */}
      <Navbar currentPath="/templates" />

      {/* Header */}
      <section className="border-b bg-white/50 dark:bg-gray-900/50 pt-20">
        <div className="container mx-auto px-4 py-12">
          <Link
            href="/"
            className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
          <h1 className="mb-4 text-4xl font-bold">Template Library</h1>
          <p className="text-lg text-muted-foreground">
            {templates.filter(t => !t.metadata.isPremium).length} free templates available
          </p>
        </div>
      </section>

      {/* Filter Section */}
      <section className="border-b bg-white/50 dark:bg-gray-900/50">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Button
                key={category.id}
                variant={category.id === 'all' ? 'default' : 'outline'}
                size="sm"
              >
                {category.label}
              </Button>
            ))}
          </div>
        </div>
      </section>

      {/* Templates Grid */}
      <section className="container mx-auto px-4 py-12">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <TemplateCard key={template.metadata.id} metadata={template.metadata} />
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="rounded-2xl bg-gradient-to-r from-purple-600 to-cyan-500 p-8 text-center text-white md:p-12">
          <h2 className="mb-4 text-3xl font-bold">Found a Template You Like?</h2>
          <p className="mb-8 text-lg opacity-90">
            Start creating your professional resume now
          </p>
          <Link href="/editor">
            <Button size="lg" variant="secondary">
              Start Creating
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}
