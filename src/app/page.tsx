'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { ArrowRight, FileText, Eye, Palette, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/shared/Navbar';
import { Footer } from '@/components/shared/Footer';
import { getAllTemplates } from '@/templates/registry';

export default function HomePage() {
  const templates = getAllTemplates();

  useEffect(() => {
    const initGradient = async () => {
      // Dynamically import Gradient to avoid SSR issues
      const { Gradient } = await import('@/lib/gradient/Gradient');
      const gradient = new Gradient();
      gradient.initGradient('#gradient-canvas');
    };

    initGradient();
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Animated Gradient Background */}
      <canvas
        id="gradient-canvas"
        data-transition-in
        className="gradient-canvas"
      />

      {/* Content Overlay */}
      <div className="relative z-10">
        {/* Navigation */}
        <Navbar currentPath="/" />

      {/* Hero Section */}
      <section className="container mx-auto px-4 pt-32 pb-20 md:pt-40 md:pb-32">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-6xl">
            Create Professional
            <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
              {' '}LaTeX Resumes
            </span>
            {' '}in Minutes
          </h1>
          <p className="mb-8 text-lg text-muted-foreground sm:text-xl">
            No registration required · Visual editing with real-time preview · One-click export to Overleaf
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/editor">
              <Button size="lg" className="gap-2">
                Get Started <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/templates">
              <Button size="lg" variant="outline">
                Browse Templates
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <h2 className="mb-12 text-center text-3xl font-bold">Key Features</h2>
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {/* Feature 1 */}
          <div className="rounded-lg border bg-white p-6 shadow-sm dark:bg-gray-900">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
              <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="mb-2 text-xl font-semibold">Visual Editing</h3>
            <p className="text-sm text-muted-foreground">
              No need to write LaTeX code manually. Edit your resume content through intuitive forms with instant results
            </p>
          </div>

          {/* Feature 2 */}
          <div className="rounded-lg border bg-white p-6 shadow-sm dark:bg-gray-900">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-cyan-100 dark:bg-cyan-900">
              <Eye className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />
            </div>
            <h3 className="mb-2 text-xl font-semibold">Real-time Preview</h3>
            <p className="text-sm text-muted-foreground">
              Syntax-highlighted LaTeX code generated in real-time. View PDF directly in Overleaf
            </p>
          </div>

          {/* Feature 3 */}
          <div className="rounded-lg border bg-white p-6 shadow-sm dark:bg-gray-900">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900">
              <Palette className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="mb-2 text-xl font-semibold">Multiple Templates</h3>
            <p className="text-sm text-muted-foreground">
              Professional templates for tech, academic, business and more. Continuously updated free template library
            </p>
          </div>

          {/* Feature 4 */}
          <div className="rounded-lg border bg-white p-6 shadow-sm dark:bg-gray-900">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900">
              <Download className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="mb-2 text-xl font-semibold">Local Storage</h3>
            <p className="text-sm text-muted-foreground">
              Data saved locally in your browser. Import/export JSON backup with privacy protection
            </p>
          </div>
        </div>
      </section>

      {/* Template Gallery Preview */}
      <section className="container mx-auto px-4 py-20">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold">Featured Templates</h2>
          <p className="text-muted-foreground">Choose a professional resume template that suits you</p>
        </div>
        <div className="grid gap-8 md:grid-cols-3">
          {/* Featured Templates */}
          {templates.slice(0, 3).map((template) => (
            <div
              key={template.metadata.id}
              className="group overflow-hidden rounded-lg border bg-white shadow-sm transition-shadow hover:shadow-md dark:bg-gray-900"
            >
              {/* PDF Preview */}
              <div className="relative aspect-[3/4] overflow-hidden bg-gray-100 dark:bg-gray-800">
                <iframe
                  src={`/template/${template.metadata.id}-preview.pdf`}
                  className="h-full w-full scale-100 transition-transform group-hover:scale-105"
                  title={`${template.metadata.name} Preview`}
                />
                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10" />
              </div>
              <div className="p-4">
                <h3 className="mb-2 font-semibold">{template.metadata.name}</h3>
                <p className="mb-3 text-sm text-muted-foreground">
                  {template.metadata.description}
                </p>
                <div className="mb-4 flex flex-wrap gap-1">
                  {template.metadata.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <Link href={`/editor?template=${template.metadata.id}`}>
                  <Button className="w-full" variant="outline">
                    Use This Template
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-12 text-center">
          <Link href="/templates">
            <Button variant="outline" size="lg">
              View All Templates
            </Button>
          </Link>
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-y bg-white/50 dark:bg-gray-900/50">
        <div className="container mx-auto px-4 py-16">
          <div className="grid gap-8 md:grid-cols-3">
            <div className="text-center">
              <div className="mb-2 text-4xl font-bold text-primary">100%</div>
              <div className="text-sm text-muted-foreground">Completely Free</div>
            </div>
            <div className="text-center">
              <div className="mb-2 text-4xl font-bold text-primary">3 Min</div>
              <div className="text-sm text-muted-foreground">Quick Generation</div>
            </div>
            <div className="text-center">
              <div className="mb-2 text-4xl font-bold text-primary">Zero Code</div>
              <div className="text-sm text-muted-foreground">No LaTeX Knowledge Required</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-600 p-8 text-center text-white md:p-12">
          <h2 className="mb-4 text-3xl font-bold">Ready to Create Your Professional Resume?</h2>
          <p className="mb-8 text-lg opacity-90">
            No registration required. Start now, completely free
          </p>
          <Link href="/editor">
            <Button size="lg" variant="secondary" className="gap-2">
              Create Free Resume <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
}
