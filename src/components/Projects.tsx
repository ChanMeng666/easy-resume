import { ResumeData } from "@/data/resume";
import { Section } from "./Section";

interface ProjectsProps {
  projects: ResumeData["projects"];
}

export function Projects({ projects }: ProjectsProps) {
  return (
    <Section title="Projects">
      {projects.map((project, index) => (
        <div key={index} className="mb-6 last:mb-0 project-item">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-1 sm:gap-2 mb-3">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-1">
                <h3 className="font-bold text-lg text-foreground">
                  {project.name}
                </h3>
                {project.url && project.url !== '#' && (
                  <a
                    href={project.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm text-primary-main hover:text-primary-dark transition-colors"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      className="h-4 w-4"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                    <span className="truncate max-w-[200px] hidden sm:inline">
                      {(() => {
                        try {
                          return new URL(project.url).hostname;
                        } catch {
                          return 'Link';
                        }
                      })()}
                    </span>
                  </a>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-sm text-text-secondary">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  className="h-4 w-4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
                <span className="text-primary-main dark:text-primary-light font-medium">
                  {project.description}
                </span>
              </div>
            </div>
          </div>
          <ul className="list-disc list-outside ml-4 space-y-2 text-text-secondary">
            {project.highlights.map((highlight, idx) => (
              <li key={idx} className="text-sm pl-1">
                <span className="text-[0.925rem] leading-relaxed">
                  {highlight}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </Section>
  );
} 