import { ResumeData } from "@/data/resume";
import { Section } from "./Section";

interface IntroductionProps {
  summary: ResumeData["basics"]["summary"];
}

export function Introduction({ summary }: IntroductionProps) {
  if (!summary) return null;

  return (
    <Section title="Introduction">
      <div className="text-sm sm:text-base leading-relaxed text-text-primary space-y-4">
        {summary.split('\n\n').map((paragraph, index) => (
          <p key={index} className="text-justify">
            {paragraph}
          </p>
        ))}
      </div>
    </Section>
  );
} 