import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/shared/Navbar';
import { Footer } from '@/components/shared/Footer';
import { ArrowLeft } from 'lucide-react';

/**
 * 404 page — a calm, centered "page not found" state on the Paper canvas.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="page-shell page-pad-b mx-auto flex flex-1 items-center justify-center px-4 text-center">
        <div className="w-full max-w-lg">
          <p className="mb-4 text-caption uppercase tracking-wider text-fog-deep">Error 404</p>
          <h1 className="text-4xl sm:text-5xl font-light tracking-tight text-aubergine">
            Page not found.
          </h1>
          <p className="mx-auto mt-4 max-w-md text-lead text-muted-foreground">
            That page doesn&apos;t exist — it may have moved or never existed.
            Head back and start a fresh resume.
          </p>
          <div className="mt-8 flex justify-center">
            <Link href="/">
              <Button size="lg" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to home
              </Button>
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
