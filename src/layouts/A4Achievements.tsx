import { ResumeData } from '@/data/resume';

interface A4AchievementsProps {
  achievements: ResumeData['achievements'];
}

export function A4Achievements({ achievements }: A4AchievementsProps) {
  if (achievements.length === 0) return null;

  return (
    <section className="a4-section">
      <h2 className="a4-section-title">Achievements</h2>
      
      <div className="a4-section-content">
        <ul className="a4-list">
          {achievements.map((achievement, index) => (
            <li key={index} className="a4-list-item">
              {achievement}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
