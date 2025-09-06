import { ResumeData } from '@/data/resume';

interface A4CertificationsProps {
  certifications: ResumeData['certifications'];
}

export function A4Certifications({ certifications }: A4CertificationsProps) {
  if (certifications.length === 0) return null;

  return (
    <section className="a4-section">
      <h2 className="a4-section-title">Certifications</h2>
      
      <div className="a4-section-content">
        <ul className="a4-list">
          {certifications.map((cert, index) => (
            <li key={index} className="a4-list-item">
              {cert}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
