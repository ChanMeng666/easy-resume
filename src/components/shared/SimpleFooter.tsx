import Link from 'next/link';
import Image from 'next/image';

export function SimpleFooter() {
  return (
    <footer className="border-t bg-white/80 backdrop-blur-sm dark:bg-gray-900/80">
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 md:grid-cols-4">
          {/* About */}
          <div>
            <div className="mb-4 flex items-center gap-2">
              <Image src="/easy-resume.svg" alt="Easy Resume" width={24} height={24} />
              <span className="font-bold">Easy Resume</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Professional LaTeX resume generator that makes resume creation simple and efficient
            </p>
          </div>

          {/* Product */}
          <div>
            <h3 className="mb-4 font-semibold">Product</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/templates" className="text-muted-foreground transition-colors hover:text-foreground">
                  Templates
                </Link>
              </li>
              <li>
                <Link href="/editor" className="text-muted-foreground transition-colors hover:text-foreground">
                  Editor
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="mb-4 font-semibold">Resources</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="https://www.overleaf.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  Overleaf
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/yourusername/easy-resume"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  GitHub
                </a>
              </li>
            </ul>
          </div>

          {/* About */}
          <div>
            <h3 className="mb-4 font-semibold">About</h3>
            <p className="text-sm text-muted-foreground">
              Made with ❤️ by developers for developers
            </p>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 border-t pt-8 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Easy Resume. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
