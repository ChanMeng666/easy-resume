import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/shared/Navbar';
import { Footer } from '@/components/shared/Footer';
import { CropFrame } from '@/components/shared/CropFrame';
import { ArrowLeft } from 'lucide-react';

/**
 * 404 page — on-brand "proof not found" treatment.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col baseline-grid bg-[#f0f0f0]">
      <Navbar />
      <main className="page-shell page-pad-b container mx-auto flex flex-1 items-center justify-center px-4">
        <CropFrame className="w-full max-w-lg rounded-xl border-2 border-black bg-white p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.9)]">
          <p className="proof-label mb-3">ERR·404 — Page not set</p>
          <h1 className="font-brand text-4xl sm:text-5xl mb-3">Nothing to compose here.</h1>
          <p className="text-muted-foreground font-medium mb-6">
            That page doesn&apos;t exist — it may have moved or never been typeset.
            Head back and start a fresh resume.
          </p>
          <Link href="/">
            <Button size="lg" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to home
            </Button>
          </Link>
        </CropFrame>
      </main>
      <Footer />
    </div>
  );
}
