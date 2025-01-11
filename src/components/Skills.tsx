import { ResumeData } from "@/data/resume";
import { Section } from "./Section";

interface SkillsProps {
  skills: ResumeData["skills"];
}

export function Skills({ skills }: SkillsProps) {
  return (
    <Section title="Skills">
      <div className="space-y-5">
        {skills.map((skillGroup, index) => (
          <div key={index} className="mb-4 last:mb-0">
            <div className="flex items-center gap-2 mb-2">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                className="h-4 w-4 text-primary-main dark:text-primary-light"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
              <h3 className="font-bold text-base text-foreground">
                {skillGroup.name}
              </h3>
            </div>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {skillGroup.keywords.map((keyword, kidx) => (
                <span
                  key={kidx}
                  className="skill-tag inline-flex items-center px-2.5 py-1 
                    rounded-full text-xs sm:text-sm bg-primary-main/10 
                    text-primary-main dark:bg-primary-main/5 
                    dark:text-primary-light transition-colors
                    hover:bg-primary-main/15 dark:hover:bg-primary-main/10
                    cursor-default"
                >
                  {keyword}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
} 