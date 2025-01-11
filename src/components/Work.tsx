import { ResumeData } from "@/data/resume";
import { Section } from "./Section";

interface WorkProps {
  work: ResumeData["work"];
}

export function Work({ work }: WorkProps) {
  return (
    <Section title="Experience">
      {work.map((job, index) => (
        <div key={index} className="mb-6 last:mb-0 work-item">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-1 sm:gap-2 mb-3">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-1">
                <h3 className="font-bold text-lg text-foreground">
                  {job.company}
                </h3>
                <span className="text-sm text-primary-main dark:text-primary-light font-medium">
                  {job.position}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-text-secondary">
                <div className="flex items-center gap-1.5">
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
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  <span>{job.location}</span>
                </div>
                {job.type && (
                  <div className="flex items-center gap-1.5">
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
                        d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                    <span>{job.type}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-text-secondary whitespace-nowrap">
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
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <span>
                {job.startDate} - {job.endDate}
              </span>
            </div>
          </div>
          <ul className="list-disc list-outside ml-4 space-y-2 text-text-secondary">
            {job.highlights.map((highlight, idx) => (
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