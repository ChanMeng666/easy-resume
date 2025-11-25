'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, FileText, Eye, Palette, Download, CheckCircle, Zap, Shield, Layout, Sparkles, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/shared/Navbar';
import { Footer } from '@/components/shared/Footer';
import { GEOHead } from '@/components/shared/GEOHead';
import { MultipleStructuredData } from '@/components/shared/StructuredData';
import { getPageInstructions } from '@/lib/seo/instructions';
import { webApplicationSchema, softwareApplicationSchema, howToCreateResumeSchema, faqSchema } from '@/lib/seo/schemas';
import { getAllTemplates } from '@/templates/registry';

export default function HomePage() {
  const templates = getAllTemplates();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const initGradient = async () => {
      // Dynamically import Gradient to avoid SSR issues
      const { Gradient } = await import('@/lib/gradient/Gradient');
      const gradient = new Gradient();
      gradient.initGradient('#gradient-canvas');
    };

    initGradient();
  }, []);

  return (
    <div className="relative min-h-screen bg-background font-sans text-foreground selection:bg-primary/10 selection:text-primary overflow-hidden">
      {/* GEO: AI Agent Instructions */}
      <GEOHead instructions={getPageInstructions('home')} />

      {/* SEO: Structured Data for Search Engines and AI */}
      <MultipleStructuredData
        schemas={[
          webApplicationSchema,
          softwareApplicationSchema,
          howToCreateResumeSchema,
          faqSchema,
        ]}
      />

      {/* Animated Gradient Background */}
      <div className="fixed inset-0 -z-10 opacity-30 dark:opacity-20 pointer-events-none">
        <canvas
          id="gradient-canvas"
          data-transition-in
          className="gradient-canvas"
        />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        <Navbar currentPath="/" />

        <main className="flex-grow">
          {/* Hero Section */}
          <section className="relative pt-20 pb-32 md:pt-32 md:pb-48 overflow-visible">
            <div className="hero-glow" />
            <div className="container mx-auto px-4">
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                {/* Text Content */}
                <div className="text-center lg:text-left space-y-8 animate-fade-in-up">
                  <div className="inline-flex items-center px-3 py-1 rounded-full border bg-background/50 backdrop-blur-sm text-xs font-medium text-muted-foreground mb-4">
                    <span className="flex h-2 w-2 rounded-full bg-blue-500 mr-2"></span>
                    New v2.0 is live
                  </div>
                  <h1 className="text-5xl font-bold tracking-tight sm:text-7xl leading-[1.1]">
                    Craft Your <br />
                    <span className="text-gradient">Perfect Resume</span>
                    <br />
                    with LaTeX Power
                  </h1>
                  <p className="text-lg text-muted-foreground sm:text-xl max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                    Create professional, ATS-friendly resumes in minutes. Real-time preview, no coding required, and completely free.
                  </p>
                  
                  <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                    <Link href="/editor">
                      <Button size="lg" className="h-12 px-8 rounded-full gap-2 text-base shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all">
                        Build My Resume <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Link href="/templates">
                      <Button size="lg" variant="outline" className="h-12 px-8 rounded-full text-base hover:bg-secondary/50 transition-all">
                        View Templates
                      </Button>
                    </Link>
                  </div>

                  <div className="flex items-center justify-center lg:justify-start gap-6 pt-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Free Forever</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>No Registration</span>
                    </div>
                  </div>
                </div>

                {/* 3D Visual */}
                <div className="relative hidden lg:block perspective-1000">
                  <div className="relative w-full aspect-[3/4] max-w-md mx-auto transform-style-3d rotate-y-12 transition-transform duration-700 hover:rotate-y-0 hover:scale-105">
                    {/* Main Card */}
                    <div className="absolute inset-0 rounded-xl bg-white dark:bg-gray-900 shadow-2xl border border-white/10 overflow-hidden">
                      {isMounted && (
                        <iframe 
                          src="/template/banking-finance-preview.pdf" 
                          className="w-full h-full scale-100 pointer-events-none select-none"
                          tabIndex={-1}
                        />
                      )}
                    </div>
                    
                    {/* Floating Elements */}
                    <div className="absolute -right-12 top-20 p-4 glass-card rounded-xl shadow-xl border border-white/20 animate-bounce duration-[3000ms]">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 rounded-lg">
                          <Zap className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground font-medium">ATS Score</p>
                          <p className="text-sm font-bold">98/100</p>
                        </div>
                      </div>
                    </div>

                    <div className="absolute -left-8 bottom-32 p-4 glass-card rounded-xl shadow-xl border border-white/20 animate-bounce duration-[4000ms]">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-500/10 rounded-lg">
                          <Download className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground font-medium">Export</p>
                          <p className="text-sm font-bold">PDF & LaTeX</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Stats Section (Minimal) */}
          <section className="border-y bg-secondary/30 backdrop-blur-sm">
            <div className="container mx-auto px-4 py-12">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                {[
                  { label: "Templates", value: "10+", icon: Layout },
                  { label: "Users", value: "10k+", icon: Sparkles },
                  { label: "Time Saved", value: "Hours", icon: Zap },
                  { label: "Cost", value: "$0", icon: CheckCircle },
                ].map((stat, idx) => (
                  <div key={idx} className="flex flex-col items-center justify-center text-center">
                    <div className="mb-3 p-2 rounded-full bg-primary/5 text-primary">
                      <stat.icon className="h-5 w-5" />
                    </div>
                    <div className="text-2xl font-bold">{stat.value}</div>
                    <div className="text-sm text-muted-foreground font-medium">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Features Section - Bento Grid */}
          <section className="container mx-auto px-4 py-24 lg:py-32">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Choose Easy Resume?</h2>
              <p className="text-muted-foreground text-lg">
                Everything you need to build a top-tier resume, packed into a beautiful interface.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {/* Large Feature 1 */}
              <div className="md:col-span-2 rounded-2xl bg-secondary/20 border p-8 hover:bg-secondary/30 transition-colors group">
                <div className="h-12 w-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 mb-6 group-hover:scale-110 transition-transform">
                  <Eye className="h-6 w-6" />
                </div>
                <h3 className="text-2xl font-bold mb-3">Real-time Preview</h3>
                <p className="text-muted-foreground mb-6 max-w-md">
                  See changes instantly as you type. Our split-screen editor shows you exactly what your resume will look like before you export.
                </p>
                <div className="h-48 rounded-lg bg-background border overflow-hidden relative flex">
                  {/* Editor Side (Left) */}
                  <div className="w-1/2 border-r p-3 space-y-2 font-mono text-[10px] text-muted-foreground/50 bg-secondary/10">
                    <div className="flex gap-2 text-blue-500/50"><span className="w-4 text-right">1</span>\documentclass&#123;article&#125;</div>
                    <div className="flex gap-2"><span className="w-4 text-right">2</span></div>
                    <div className="flex gap-2 text-purple-500/50"><span className="w-4 text-right">3</span>\begin&#123;document&#125;</div>
                    <div className="flex gap-2"><span className="w-4 text-right">4</span>  \name&#123;John Doe&#125;</div>
                    <div className="flex gap-2"><span className="w-4 text-right">5</span>  \title&#123;Developer&#125;</div>
                    <div className="flex gap-2"><span className="w-4 text-right">6</span></div>
                    <div className="flex gap-2 text-green-500/50"><span className="w-4 text-right">7</span>  \section&#123;Exp&#125;</div>
                    <div className="w-3/4 h-2 bg-current opacity-20 rounded ml-6"></div>
                    <div className="w-1/2 h-2 bg-current opacity-20 rounded ml-6"></div>
                  </div>
                  {/* Preview Side (Right) */}
                  <div className="w-1/2 p-3 bg-white dark:bg-white/5">
                    <div className="space-y-3 opacity-50">
                      <div className="border-b pb-2">
                        <div className="h-3 w-1/3 bg-foreground rounded mb-1"></div>
                        <div className="h-2 w-1/4 bg-muted-foreground rounded"></div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-2 space-y-1">
                          <div className="h-2 w-1/3 bg-blue-500/50 rounded"></div>
                          <div className="h-1.5 w-full bg-foreground rounded"></div>
                          <div className="h-1.5 w-full bg-foreground rounded"></div>
                        </div>
                        <div className="space-y-1">
                          <div className="h-2 w-2/3 bg-blue-500/50 rounded"></div>
                          <div className="h-1.5 w-full bg-foreground rounded"></div>
                        </div>
                      </div>
                    </div>
                    {/* Cursor Animation */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 p-2 bg-background/80 backdrop-blur shadow-sm rounded border text-xs font-medium flex items-center gap-2 animate-pulse">
                       <div className="w-2 h-2 rounded-full bg-green-500"></div>
                       Live Updating
                    </div>
                  </div>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="rounded-2xl bg-secondary/20 border p-8 hover:bg-secondary/30 transition-colors group">
                <div className="h-12 w-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 mb-6 group-hover:scale-110 transition-transform">
                  <Palette className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold mb-3">Professional Themes</h3>
                <p className="text-muted-foreground">
                  Choose from a variety of ATS-friendly templates designed by career experts.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="rounded-2xl bg-secondary/20 border p-8 hover:bg-secondary/30 transition-colors group">
                <div className="h-12 w-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 mb-6 group-hover:scale-110 transition-transform">
                  <Shield className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold mb-3">Privacy First</h3>
                <p className="text-muted-foreground">
                  Your data lives in your browser. We don&apos;t store your personal information on our servers.
                </p>
              </div>

              {/* Large Feature 4 */}
              <div className="md:col-span-2 rounded-2xl bg-secondary/20 border p-8 hover:bg-secondary/30 transition-colors group">
                <div className="h-12 w-12 rounded-xl bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center text-cyan-600 mb-6 group-hover:scale-110 transition-transform">
                  <FileText className="h-6 w-6" />
                </div>
                <h3 className="text-2xl font-bold mb-3">No LaTeX Knowledge Needed</h3>
                <p className="text-muted-foreground mb-6 max-w-md">
                  Get the typographic perfection of LaTeX without writing a single line of code. We handle the complex formatting for you.
                </p>
              </div>
            </div>
          </section>

          {/* How It Works Section */}
          <section className="bg-secondary/10 border-y py-24">
            <div className="container mx-auto px-4">
              <div className="text-center max-w-2xl mx-auto mb-16">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
                <p className="text-muted-foreground">Three simple steps to your new job.</p>
              </div>

              <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto relative">
                {/* Connecting Line (Desktop) */}
                <div className="hidden md:block absolute top-12 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500/0 via-blue-500/20 to-blue-500/0" />

                {[
                  { step: "01", title: "Enter Details", desc: "Fill in your experience, education, and skills.", icon: FileText },
                  { step: "02", title: "Choose Template", desc: "Select a design that matches your style.", icon: Palette },
                  { step: "03", title: "Export PDF", desc: "Download your resume or open in Overleaf.", icon: Download },
                ].map((item, idx) => (
                  <div key={idx} className="relative flex flex-col items-center text-center">
                    <div className="w-24 h-24 rounded-full bg-background border-4 border-secondary flex items-center justify-center mb-6 z-10 shadow-sm relative group">
                      <item.icon className="h-8 w-8 text-primary group-hover:scale-110 transition-transform" />
                      <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                        {item.step}
                      </div>
                    </div>
                    <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                    <p className="text-muted-foreground max-w-xs">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Template Gallery */}
          <section className="container mx-auto px-4 py-24">
            <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-4">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold mb-4">Featured Templates</h2>
                <p className="text-muted-foreground text-lg">Professionally designed templates for every career path.</p>
              </div>
              <Link href="/templates">
                <Button variant="ghost" className="gap-2 group">
                  View All <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {templates.slice(0, 3).map((template) => (
                <Link href={`/editor?template=${template.metadata.id}`} key={template.metadata.id}>
                  <div className="group relative rounded-xl bg-secondary/20 overflow-hidden hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                    {/* Preview Image */}
                    <div className="relative aspect-[3/4] bg-gray-100 dark:bg-gray-800 overflow-hidden">
                      <iframe
                        src={`/template/${template.metadata.id}-preview.pdf`}
                        className="h-full w-full scale-100 transition-transform duration-500 group-hover:scale-105 pointer-events-none"
                        tabIndex={-1}
                        title={`${template.metadata.name} Preview`}
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
                      
                      {/* Hover Button */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button className="shadow-xl">Use Template</Button>
                      </div>
                    </div>
                    
                    <div className="p-4 border-t bg-background/50 backdrop-blur-sm">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-lg">{template.metadata.name}</h3>
                        <div className="flex gap-1">
                           {template.metadata.tags.slice(0, 2).map(tag => (
                             <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-secondary rounded text-muted-foreground uppercase tracking-wide">{tag}</span>
                           ))}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {template.metadata.description}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* CTA Section */}
          <section className="container mx-auto px-4 py-20 mb-10">
            <div className="rounded-3xl bg-gradient-to-r from-blue-600 to-cyan-600 p-8 md:p-16 text-center text-white relative overflow-hidden shadow-xl">
              {/* Abstract Background Pattern */}
              <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                <div className="absolute right-0 top-0 w-64 h-64 bg-white rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
                <div className="absolute left-0 bottom-0 w-64 h-64 bg-white rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2"></div>
              </div>

              <div className="relative z-10 max-w-2xl mx-auto">
                <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Stand Out?</h2>
                <p className="text-lg md:text-xl opacity-90 mb-10">
                  Join thousands of professionals who have advanced their careers with our resume builder.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link href="/editor">
                    <Button size="lg" variant="secondary" className="h-14 px-8 text-lg w-full sm:w-auto text-blue-600 hover:text-blue-700 font-semibold">
                      Create Free Resume
                    </Button>
                  </Link>
                  <Link href="/templates">
                     <Button size="lg" variant="outline" className="h-14 px-8 text-lg bg-white/10 border-white/20 hover:bg-white/20 text-white w-full sm:w-auto backdrop-blur-sm">
                      Browse Templates
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </div>
  );
}
