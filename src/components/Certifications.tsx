import { ResumeData } from "@/data/resume";
import { Section } from "./Section";

interface CertificationsProps {
  certifications: ResumeData["certifications"];
}

export function Certifications({ certifications }: CertificationsProps) {
  return (
    <Section title="Certifications">
      <div className="grid grid-cols-1 gap-2">
        {certifications.map((certification, index) => {
          const [title, issuer] = certification.split(' - ').map(s => s.trim());
          return (
            <div
              key={index}
              className="group flex items-center gap-3 px-3 py-2 rounded-lg 
                bg-primary-main/5 dark:bg-primary-main/10 
                hover:bg-primary-main/10 dark:hover:bg-primary-main/15 
                transition-colors duration-200"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                className="h-5 w-5 flex-none text-primary-main dark:text-primary-light"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                />
              </svg>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-sm font-medium text-foreground">
                    {title}
                  </span>
                  {issuer && (
                    <>
                      <span className="text-text-secondary">•</span>
                      <span className="text-sm text-text-secondary">
                        {issuer}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Section>
  );
} 