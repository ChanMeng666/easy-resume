import { ResumeData } from "@/data/resume";
import { Section } from "./Section";

interface EducationProps {
  education: ResumeData["education"];
}

export function Education({ education }: EducationProps) {
  return (
    <Section title="Education">
      {education.map((edu, index) => (
        <div key={index} className="mb-6 last:mb-0 education-item">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-1 sm:gap-2 mb-3">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-1">
                <h3 className="font-bold text-lg text-foreground">
                  {edu.institution}
                </h3>
                <span className="text-sm text-primary-main dark:text-primary-light font-medium">
                  {edu.studyType} in {edu.area}
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
                  <span>{edu.location}</span>
                </div>
                {edu.gpa && (
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
                        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                      />
                    </svg>
                    <span>GPA: {edu.gpa}</span>
                  </div>
                )}
                {edu.note && (
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
                        d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                      />
                    </svg>
                    <span className="italic">{edu.note}</span>
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
                {edu.startDate} - {edu.endDate}
              </span>
            </div>
          </div>
        </div>
      ))}
    </Section>
  );
} 