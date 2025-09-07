import { ResumeData } from '@/data/resume';

interface A4ProjectsProps {
  projects: ResumeData['projects'];
  hideTitle?: boolean; // 隐藏标题（用于continuation页面）
}

export function A4Projects({ projects, hideTitle = false }: A4ProjectsProps) {
  if (projects.length === 0) return null;

  return (
    <section className="a4-section">
      {!hideTitle && <h2 className="a4-section-title">Projects</h2>}
      
      <div className="a4-section-content">
        {projects.map((project, index) => (
          <div key={index} className="a4-item">
            <div className="a4-item-header">
              <h3 className="a4-item-title">{project.name}</h3>
              {project.url && project.url !== '#' && (
                <div className="a4-item-meta">
                  <span className="text-xs text-blue-600">
                    {new URL(project.url).hostname}
                  </span>
                </div>
              )}
            </div>
            
            <div className="a4-item-description">
              {project.description}
            </div>
            
            {project.highlights.length > 0 && (
              <ul className="a4-list">
                {project.highlights.map((highlight, hIndex) => (
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
