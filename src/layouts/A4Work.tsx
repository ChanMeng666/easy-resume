import { ResumeData } from '@/data/resume';

interface A4WorkProps {
  work: ResumeData['work'];
}

export function A4Work({ work }: A4WorkProps) {
  if (work.length === 0) return null;

  return (
    <section className="a4-section">
      <h2 className="a4-section-title">Experience</h2>
      
      <div className="a4-section-content">
        {work.map((job, index) => (
          <div key={index} className="a4-item">
            <div className="a4-item-header">
              <div className="flex-1">
                <h3 className="a4-item-title">{job.company}</h3>
                <div className="a4-item-subtitle">{job.position}</div>
              </div>
              <div className="a4-item-meta">
                <div>{job.startDate} - {job.endDate}</div>
                <div>{job.location}</div>
                <div className="text-xs">{job.type}</div>
              </div>
            </div>
            
            {job.highlights.length > 0 && (
              <ul className="a4-list">
                {job.highlights.map((highlight, hIndex) => (
                  <li key={hIndex} className="a4-list-item">
                    {highlight}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
