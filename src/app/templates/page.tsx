import Link from 'next/link';
import { MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/shared/Navbar';
import { Footer } from '@/components/shared/Footer';
import { TemplateFilteredSection } from '@/components/template/TemplateFilteredSection';
import { getAllTemplates } from '@/templates/registry';
import { TemplateGalleryClient } from './TemplateGalleryClient';

export const metadata = {
  title: 'Templates - Vitex',
  description: 'Browse all professional LaTeX resume templates. Pick a style, then let AI build your resume through natural conversation.',
};

/**
 * Neobrutalism styled templates gallery page.
 */
export default function TemplatesPage() {
  // Get templates from registry
  const templates = getAllTemplates();
  const templateMetadata = templates.map(t => t.metadata);

  return (
    <div className="min-h-screen bg-[#f0f0f0]">
      {/* GEO: Client-side AI instructions and structured data */}
      <TemplateGalleryClient templateMetadata={templateMetadata} />

      {/* Navigation */}
      <Navbar currentPath="/templates" />

      {/* Header */}
      <section className="bg-white border-b-2 border-black pt-20">
        <div className="container mx-auto px-4 py-12">
          <h1 className="mb-4 text-4xl font-brand">Pick Your Style</h1>
          <p className="text-lg text-muted-foreground font-medium max-w-2xl">
            <span className="inline-flex items-center justify-center w-8 h-8 bg-primary text-white rounded-lg font-black mr-2">
              {templates.filter(t => !t.metadata.isPremium).length}
            </span>
            professional templates. Choose one, then chat with AI to fill in your details.
          </p>
        </div>
      </section>

      {/* Filter Section & Templates Grid */}
      <TemplateFilteredSection templates={templateMetadata} />

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="rounded-2xl bg-gradient-to-br from-purple-600 to-primary p-8 text-center text-white md:p-12 border-3 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,0.9)]">
          <h2 className="mb-4 text-3xl font-brand">Ready to Build Your Resume?</h2>
          <p className="mb-8 text-lg opacity-90 font-medium max-w-xl mx-auto">
            Pick any template above, then let AI help you create the perfect resume through simple conversation.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/editor">
              <Button size="lg" variant="secondary" className="font-black gap-2">
                <MessageSquare className="h-5 w-5" />
                Chat with AI
              </Button>
            </Link>
            <Link href="/editor/manual">
              <Button size="lg" variant="outline" className="font-bold bg-white/10 border-white text-white hover:bg-white/20">
                Manual Editor
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}
