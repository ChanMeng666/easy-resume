import { ResumeData } from '@/data/resume';

interface A4SkillsProps {
  skills: ResumeData['skills'];
  hideTitle?: boolean;
}

export function A4Skills({ skills, hideTitle = false }: A4SkillsProps) {
  if (skills.length === 0) return null;

  return (
    <section className="a4-section">
      {!hideTitle && <h2 className="a4-section-title">Skills</h2>}
      
      <div className="a4-section-content">
        {skills.map((skillGroup, index) => (
          <div key={index} className="a4-skills-grid">
            <div className="a4-skill-category">
              {skillGroup.name}
            </div>
            
            <div className="a4-skill-tags">
              {skillGroup.keywords.map((keyword, kidx) => (
                <span key={kidx} className="a4-skill-tag">
                  {keyword}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
