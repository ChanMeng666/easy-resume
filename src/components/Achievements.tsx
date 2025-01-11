import { ResumeData } from "@/data/resume";
import { Section } from "./Section";

interface AchievementsProps {
  achievements: ResumeData["achievements"];
}

export function Achievements({ achievements }: AchievementsProps) {
  return (
    <Section title="Achievements & Communities">
      <div className="space-y-3">
        {achievements.map((achievement, index) => (
          <div
            key={index}
            className="group flex items-start gap-3 px-3 py-2 rounded-lg 
              hover:bg-primary-main/5 dark:hover:bg-primary-main/10 
              transition-colors duration-200"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              className="h-5 w-5 mt-0.5 flex-none text-primary-main dark:text-primary-light"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-text-secondary leading-relaxed">
                {achievement.split('—').map((part, idx, arr) => (
                  <span key={idx}>
                    {idx > 0 && (
                      <span className="text-primary-main dark:text-primary-light mx-2">
                        —
                      </span>
                    )}
                    {idx === arr.length - 1 ? (
                      <span className="text-primary-main dark:text-primary-light font-medium">
                        {part.trim()}
                      </span>
                    ) : (
                      part.trim()
                    )}
                  </span>
                ))}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
} 