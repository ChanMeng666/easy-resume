'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, FileText, Eye, Palette, Download, CheckCircle, Zap, Shield, Layout, Sparkles, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/shared/Navbar';
import { Footer } from '@/components/shared/Footer';
import { GEOHead } from '@/components/shared/GEOHead';
import { MultipleStructuredData } from '@/components/shared/StructuredData';
import { getPageInstructions } from '@/lib/seo/instructions';
import { webApplicationSchema, softwareApplicationSchema, howToCreateResumeSchema, faqSchema } from '@/lib/seo/schemas';
import { getAllTemplates } from '@/templates/registry';

/**
 * Neobrutalism styled background with animated dots.
 * Uses fixed positions to avoid hydration mismatch.
 */
function BackgroundEffects() {
  // Fixed positions for dots to avoid hydration mismatch
  const dotPositions = [
    { left: 5, top: 10, duration: 3.2, delay: 0.1 },
    { left: 15, top: 25, duration: 4.1, delay: 0.5 },
    { left: 25, top: 45, duration: 3.5, delay: 1.2 },
    { left: 35, top: 15, duration: 4.8, delay: 0.3 },
    { left: 45, top: 70, duration: 3.8, delay: 1.8 },
    { left: 55, top: 35, duration: 4.2, delay: 0.7 },
    { left: 65, top: 85, duration: 3.3, delay: 1.5 },
    { left: 75, top: 55, duration: 4.5, delay: 0.2 },
    { left: 85, top: 20, duration: 3.7, delay: 1.0 },
    { left: 95, top: 65, duration: 4.0, delay: 1.3 },
    { left: 10, top: 80, duration: 3.4, delay: 0.8 },
    { left: 30, top: 90, duration: 4.3, delay: 1.6 },
    { left: 50, top: 5, duration: 3.6, delay: 0.4 },
    { left: 70, top: 40, duration: 4.7, delay: 1.9 },
    { left: 90, top: 75, duration: 3.9, delay: 0.6 },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Grid pattern */}
      <div className="absolute inset-0 neo-grid-bg" />
      
      {/* Animated floating dots with fixed positions */}
      {dotPositions.map((dot, i) => (
        <motion.div
          key={i}
          className="absolute w-3 h-3 bg-black/5 rounded-full"
          style={{
            left: `${dot.left}%`,
            top: `${dot.top}%`,
          }}
          animate={{
            y: [0, -20, 0],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: dot.duration,
            repeat: Infinity,
            ease: "easeInOut",
            delay: dot.delay,
          }}
        />
      ))}
    </div>
  );
}

/**
 * Feature card component with Neobrutalism style.
 */
function FeatureCard({ 
  icon: Icon, 
  title, 
  description, 
  color = "bg-primary",
  large = false 
}: { 
  icon: React.ElementType; 
  title: string; 
  description: string; 
  color?: string;
  large?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className={`${large ? 'md:col-span-2' : ''} bg-white rounded-xl p-6 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)] transition-all duration-200 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.9)] hover:translate-x-[-2px] hover:translate-y-[-2px]`}
    >
      <div className={`h-12 w-12 ${color} rounded-lg flex items-center justify-center border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,0.9)] mb-4`}>
        <Icon className="h-6 w-6 text-white" />
      </div>
      <h3 className="text-xl font-black mb-2">{title}</h3>
      <p className="text-muted-foreground font-medium">{description}</p>
    </motion.div>
  );
}

/**
 * Stat card component for the stats section.
 */
function StatCard({ label, value, icon: Icon }: { label: string; value: string; icon: React.ElementType }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      className="flex flex-col items-center justify-center text-center p-4"
    >
      <div className="mb-3 p-2 rounded-lg bg-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,0.9)]">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div className="text-2xl font-black">{value}</div>
      <div className="text-sm text-muted-foreground font-bold">{label}</div>
    </motion.div>
  );
}

export default function HomePage() {
  const templates = getAllTemplates();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <div className="relative min-h-screen bg-[#f0f0f0] font-sans text-foreground overflow-hidden">
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

      {/* Background Effects */}
      <BackgroundEffects />

      <div className="relative z-10 flex flex-col min-h-screen">
        <Navbar currentPath="/" />

        <main className="flex-grow pt-20">
          {/* Hero Section */}
          <section className="relative py-20 md:py-32 overflow-visible">
            <div className="container mx-auto px-4">
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                {/* Text Content */}
                <motion.div 
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  className="text-center lg:text-left space-y-8"
                >
                  {/* Version Badge */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="inline-flex items-center px-4 py-2 rounded-lg bg-white border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,0.9)] text-sm font-bold"
                  >
                    <span className="flex h-2 w-2 rounded-full bg-green-500 mr-2 animate-pulse"></span>
                    New v2.0 is live
                  </motion.div>

                  {/* Main Heading */}
                  <h1 className="text-5xl font-black tracking-tight sm:text-6xl lg:text-7xl leading-[1.1]">
                    Craft Your <br />
                    <span className="text-gradient-vitex">Perfect Resume</span>
                    <br />
                    with LaTeX Power
                  </h1>

                  <p className="text-lg text-muted-foreground sm:text-xl max-w-2xl mx-auto lg:mx-0 leading-relaxed font-medium">
                    Create professional, ATS-friendly resumes in minutes. Real-time preview, no coding required, professional quality.
                  </p>
                  
                  {/* CTA Buttons */}
                  <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                    <Link href="/editor">
                      <Button size="lg" className="h-14 px-8 text-lg gap-2">
                        Build My Resume <ArrowRight className="h-5 w-5" />
                      </Button>
                    </Link>
                    <Link href="/templates">
                      <Button size="lg" variant="outline" className="h-14 px-8 text-lg">
                        View Templates
                      </Button>
                    </Link>
                  </div>

                  {/* Trust Badges */}
                  <div className="flex items-center justify-center lg:justify-start gap-6 pt-4">
                    <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,0.9)]">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-bold">Professional Quality</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,0.9)]">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-bold">No Registration</span>
                    </div>
                  </div>
                </motion.div>

                {/* 3D Resume Preview */}
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9, rotateY: -15 }}
                  animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                  transition={{ duration: 0.8, delay: 0.3 }}
                  className="relative hidden lg:block"
                >
                  <div className="relative w-full aspect-[3/4] max-w-md mx-auto">
                    {/* Main Card */}
                    <div className="absolute inset-0 rounded-xl bg-white border-3 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,0.9)] overflow-hidden">
                      {isMounted && (
                        <iframe 
                          src="/template/banking-finance-preview.pdf" 
                          className="w-full h-full scale-100 pointer-events-none select-none"
                          tabIndex={-1}
                        />
                      )}
                    </div>
                    
                    {/* Floating ATS Score Badge */}
                    <motion.div 
                      animate={{ y: [0, -8, 0] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                      className="absolute -right-8 top-20 p-4 bg-white rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)]"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-500 rounded-lg border-2 border-black">
                          <Zap className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground font-bold">ATS Score</p>
                          <p className="text-lg font-black">98/100</p>
                        </div>
                      </div>
                    </motion.div>

                    {/* Floating Export Badge */}
                    <motion.div 
                      animate={{ y: [0, -6, 0] }}
                      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                      className="absolute -left-6 bottom-32 p-4 bg-white rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)]"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-accent rounded-lg border-2 border-black">
                          <Download className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground font-bold">Export</p>
                          <p className="text-lg font-black">PDF & LaTeX</p>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                </motion.div>
              </div>
            </div>
          </section>

          {/* Stats Section */}
          <section className="py-12 bg-white border-y-2 border-black">
            <div className="container mx-auto px-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                <StatCard label="Templates" value="10+" icon={Layout} />
                <StatCard label="Users" value="10k+" icon={Sparkles} />
                <StatCard label="Time Saved" value="Hours" icon={Zap} />
                <StatCard label="Cost" value="$0" icon={CheckCircle} />
              </div>
            </div>
          </section>

          {/* Features Section - Bento Grid */}
          <section className="container mx-auto px-4 py-24 lg:py-32">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <motion.h2 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-3xl md:text-4xl font-black mb-4"
              >
                Why Choose Vitex?
              </motion.h2>
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="text-muted-foreground text-lg font-medium"
              >
                Everything you need to build a top-tier resume, packed into a beautiful interface.
              </motion.p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
              <FeatureCard
                icon={Eye}
                title="Real-time Preview"
                description="See changes instantly as you type. Our split-screen editor shows you exactly what your resume will look like before you export."
                color="bg-primary"
                large
              />
              <FeatureCard
                icon={Palette}
                title="Professional Themes"
                description="Choose from a variety of ATS-friendly templates designed by career experts."
                color="bg-purple-500"
              />
              <FeatureCard
                icon={Shield}
                title="Privacy First"
                description="Your data lives in your browser. We don't store your personal information on our servers."
                color="bg-accent"
              />
              <FeatureCard
                icon={FileText}
                title="No LaTeX Knowledge Needed"
                description="Get the typographic perfection of LaTeX without writing a single line of code. We handle the complex formatting for you."
                color="bg-cyan-500"
                large
              />
            </div>
          </section>

          {/* How It Works Section */}
          <section className="bg-white border-y-2 border-black py-24">
            <div className="container mx-auto px-4">
              <div className="text-center max-w-2xl mx-auto mb-16">
                <motion.h2 
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="text-3xl md:text-4xl font-black mb-4"
                >
                  How It Works
                </motion.h2>
                <motion.p 
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 }}
                  className="text-muted-foreground font-medium"
                >
                  Three simple steps to your new job.
                </motion.p>
              </div>

              <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                {[
                  { step: "01", title: "Enter Details", desc: "Fill in your experience, education, and skills.", icon: FileText, color: "bg-primary" },
                  { step: "02", title: "Choose Template", desc: "Select a design that matches your style.", icon: Palette, color: "bg-purple-500" },
                  { step: "03", title: "Export PDF", desc: "Download your resume or open in Overleaf.", icon: Download, color: "bg-accent" },
                ].map((item, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.1 }}
                    className="relative flex flex-col items-center text-center"
                  >
                    <div className={`w-24 h-24 ${item.color} rounded-xl flex items-center justify-center mb-6 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)]`}>
                      <item.icon className="h-10 w-10 text-white" />
                      <div className="absolute -top-2 -right-2 w-8 h-8 rounded-lg bg-white border-2 border-black flex items-center justify-center font-black text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,0.9)]">
                        {item.step}
                      </div>
                    </div>
                    <h3 className="text-xl font-black mb-2">{item.title}</h3>
                    <p className="text-muted-foreground font-medium max-w-xs">{item.desc}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* Template Gallery */}
          <section className="container mx-auto px-4 py-24">
            <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-4">
              <div>
                <motion.h2 
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="text-3xl md:text-4xl font-black mb-4"
                >
                  Featured Templates
                </motion.h2>
                <motion.p 
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 }}
                  className="text-muted-foreground text-lg font-medium"
                >
                  Professionally designed templates for every career path.
                </motion.p>
              </div>
              <Link href="/templates">
                <Button variant="outline" className="gap-2">
                  View All <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {templates.slice(0, 3).map((template, idx) => (
                <motion.div
                  key={template.metadata.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <Link href={`/editor?template=${template.metadata.id}`}>
                    <div className="group relative rounded-xl bg-white overflow-hidden border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)] transition-all duration-200 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.9)] hover:translate-x-[-2px] hover:translate-y-[-2px]">
                      {/* Preview Image */}
                      <div className="relative aspect-[3/4] bg-gray-100 overflow-hidden">
                        <iframe
                          src={`/template/${template.metadata.id}-preview.pdf`}
                          className="h-full w-full scale-100 transition-transform duration-500 group-hover:scale-105 pointer-events-none"
                          tabIndex={-1}
                          title={`${template.metadata.name} Preview`}
                        />
                        
                        {/* Hover Overlay */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button>Use Template</Button>
                          </div>
                        </div>
                      </div>
                      
                      <div className="p-4 border-t-2 border-black bg-white">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-black text-lg">{template.metadata.name}</h3>
                          <div className="flex gap-1">
                            {template.metadata.tags.slice(0, 2).map(tag => (
                              <span key={tag} className="text-[10px] px-2 py-1 bg-gray-100 rounded-md border border-black font-bold uppercase tracking-wide">{tag}</span>
                            ))}
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground font-medium line-clamp-2">
                          {template.metadata.description}
                        </p>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </section>

          {/* CTA Section */}
          <section className="container mx-auto px-4 py-20 mb-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="rounded-2xl bg-primary p-8 md:p-16 text-center text-white border-3 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,0.9)] relative overflow-hidden"
            >
              {/* Background Pattern */}
              <div className="absolute inset-0 neo-dots-bg opacity-10 pointer-events-none" />

              <div className="relative z-10 max-w-2xl mx-auto">
                <h2 className="text-3xl md:text-4xl font-black mb-6">Ready to Stand Out?</h2>
                <p className="text-lg md:text-xl opacity-90 mb-10 font-medium">
                  Join thousands of professionals who have advanced their careers with our resume builder.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link href="/editor">
                    <Button size="lg" variant="secondary" className="h-14 px-8 text-lg w-full sm:w-auto text-primary font-black">
                      Create Resume
                    </Button>
                  </Link>
                  <Link href="/templates">
                    <Button size="lg" variant="outline" className="h-14 px-8 text-lg bg-white/10 border-white text-white w-full sm:w-auto font-bold hover:bg-white/20">
                      Browse Templates
                    </Button>
                  </Link>
                </div>
              </div>
            </motion.div>
          </section>
        </main>

        <Footer />
      </div>
    </div>
  );
}
