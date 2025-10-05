import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/shared/Navbar';
import { Footer } from '@/components/shared/Footer';
import { getAllTemplates } from '@/templates/registry';

export const metadata = {
  title: 'Templates - Easy Resume',
  description: 'Browse all professional LaTeX resume templates and find the style that suits you',
};

export default function TemplatesPage() {
  // Get templates from registry
  const templates = getAllTemplates();

  const categories = [
    { id: 'all', label: 'All' },
    { id: 'tech', label: 'Tech' },
    { id: 'academic', label: 'Academic' },
    { id: 'business', label: 'Business' },
    { id: 'creative', label: 'Creative' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Navigation */}
      <Navbar currentPath="/templates" />

      {/* Header */}
      <section className="border-b bg-white/50 dark:bg-gray-900/50">
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
            <div
              key={template.metadata.id}
              className="group overflow-hidden rounded-lg border bg-white shadow-sm transition-shadow hover:shadow-md dark:bg-gray-900"
            >
              {/* Preview Image Placeholder */}
              <div className="relative aspect-[3/4] bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700">
                {template.metadata.isPremium && (
                  <div className="absolute right-2 top-2 rounded-full bg-yellow-500 px-3 py-1 text-xs font-semibold text-white">
                    Premium
                  </div>
                )}
              </div>

              {/* Template Info */}
              <div className="p-4">
                <h3 className="mb-2 text-lg font-semibold">{template.metadata.name}</h3>
                <p className="mb-3 text-sm text-muted-foreground">
                  {template.metadata.description}
                </p>

                {/* Tags */}
                <div className="mb-4 flex flex-wrap gap-1">
                  {template.metadata.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Action Button */}
                {template.metadata.isPremium ? (
                  <Button className="w-full" variant="outline" disabled>
                    Coming Soon
                  </Button>
                ) : (
                  <Link href={`/editor?template=${template.metadata.id}`}>
                    <Button className="w-full">Use This Template</Button>
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-600 p-8 text-center text-white md:p-12">
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
