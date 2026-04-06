'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Sparkles, Target, Bot, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Navbar } from '@/components/shared/Navbar';
import { Footer } from '@/components/shared/Footer';

/**
 * Product-first homepage that lets users immediately start generating a resume.
 */
export default function HomePage() {
  const router = useRouter();
  const [jobDescription, setJobDescription] = useState('');
  const [background, setBackground] = useState('');

  /** Navigate to the editor with JD and background stored in sessionStorage. */
  function handleGenerate() {
    sessionStorage.setItem('vitex_jd', jobDescription);
    sessionStorage.setItem('vitex_bg', background);
    router.push('/editor');
  }

  return (
    <div className="relative min-h-screen bg-[#f0f0f0] font-sans text-foreground">
      <div className="flex flex-col min-h-screen">
        <Navbar currentPath="/" />

        <main className="flex-grow pt-20">
          {/* Hero Section */}
          <section className="py-16 md:py-20">
            <div className="container mx-auto px-4 text-center">
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1] mb-4"
              >
                Your Resume, Perfected by AI
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-lg text-muted-foreground font-medium max-w-2xl mx-auto"
              >
                Paste a job description. Get a tailored, ATS-optimized resume in 30 seconds.
              </motion.p>
            </div>
          </section>

          {/* Main Action Area */}
          <section className="pb-20">
            <div className="container mx-auto px-4 max-w-5xl">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="bg-white rounded-xl border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,0.9)] p-6 md:p-10"
              >
                <div className="grid md:grid-cols-[55fr_45fr] gap-6 md:gap-8">
                  {/* Left: Job Description */}
                  <div className="space-y-2">
                    <Label htmlFor="jd" className="text-base">
                      Job Description
                    </Label>
                    <Textarea
                      id="jd"
                      rows={8}
                      placeholder="Paste the job description here..."
                      value={jobDescription}
                      onChange={(e) => setJobDescription(e.target.value)}
                      className="min-h-[200px]"
                    />
                    <p className="text-xs text-muted-foreground font-medium">
                      We&apos;ll analyze the requirements and tailor your resume automatically.
                    </p>
                  </div>

                  {/* Right: Background */}
                  <div className="space-y-2">
                    <Label htmlFor="bg" className="text-base">
                      Your Background
                    </Label>
                    <Textarea
                      id="bg"
                      rows={8}
                      placeholder="Briefly describe your experience, skills, and education..."
                      value={background}
                      onChange={(e) => setBackground(e.target.value)}
                      className="min-h-[200px]"
                    />
                    <p className="text-xs text-muted-foreground font-medium">
                      Or upload an existing resume (coming soon)
                    </p>
                  </div>
                </div>

                {/* Generate Button */}
                <div className="mt-8 flex flex-col items-center gap-3">
                  <Button
                    size="lg"
                    onClick={handleGenerate}
                    className="h-14 px-12 text-lg gap-2 w-full sm:w-auto"
                  >
                    <Sparkles className="h-5 w-5" />
                    Generate My Resume
                  </Button>
                  <p className="text-xs text-muted-foreground font-medium">
                    First resume is free. No account required.
                  </p>
                </div>
              </motion.div>
            </div>
          </section>

          {/* How It Works */}
          <section className="py-20 bg-white border-y-2 border-black">
            <div className="container mx-auto px-4 max-w-5xl">
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-3xl md:text-4xl font-black text-center mb-14"
              >
                How It Works
              </motion.h2>

              <div className="grid md:grid-cols-3 gap-8">
                {[
                  {
                    icon: Target,
                    title: 'Paste JD',
                    description: 'We analyze job requirements and keywords',
                    color: 'bg-purple-500',
                  },
                  {
                    icon: Bot,
                    title: 'AI Generates',
                    description: 'Tailored resume with optimal ATS score',
                    color: 'bg-primary',
                  },
                  {
                    icon: Download,
                    title: 'Download PDF',
                    description: 'Professional PDF ready in seconds',
                    color: 'bg-accent',
                  },
                ].map((step, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.1 }}
                    className="bg-white rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)] p-6 text-center hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.9)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all duration-200"
                  >
                    <div
                      className={`w-14 h-14 ${step.color} rounded-lg flex items-center justify-center mx-auto mb-4`}
                    >
                      <step.icon className="h-7 w-7 text-white" />
                    </div>
                    <h3 className="text-xl font-black mb-2">{step.title}</h3>
                    <p className="text-muted-foreground font-medium">
                      {step.description}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </div>
  );
}
