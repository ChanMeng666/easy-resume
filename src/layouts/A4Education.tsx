import { ResumeData } from '@/data/resume';

interface A4EducationProps {
  education: ResumeData['education'];
}

export function A4Education({ education }: A4EducationProps) {
  if (education.length === 0) return null;

  return (
    <section className="a4-section">
      <h2 className="a4-section-title">Education</h2>
      
      <div className="a4-section-content">
        {education.map((edu, index) => (
          <div key={index} className="a4-item">
            <h3 className="a4-item-title">{edu.institution}</h3>
            
            <div className="a4-item-subtitle">
              {edu.studyType} in {edu.area}
            </div>
            
            <div className="a4-item-meta text-xs space-y-1">
              <div>{edu.startDate} - {edu.endDate}</div>
              <div>{edu.location}</div>
              {edu.gpa && <div>GPA: {edu.gpa}</div>}
              {edu.note && <div className="text-blue-600">{edu.note}</div>}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
