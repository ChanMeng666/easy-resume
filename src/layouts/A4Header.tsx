import { ResumeData } from '@/data/resume';

interface A4HeaderProps {
  basics: ResumeData['basics'];
}

export function A4Header({ basics }: A4HeaderProps) {
  return (
    <header className="a4-header">
      <h1 className="a4-name">{basics.name}</h1>
      
      <p className="a4-position">{basics.label}</p>
      
      <div className="a4-contact">
        {/* 位置 */}
        <div className="a4-contact-item">
          <svg className="a4-contact-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span>{basics.location}</span>
        </div>
        
        {/* 邮箱 */}
        <div className="a4-contact-item">
          <svg className="a4-contact-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <span>{basics.email}</span>
        </div>
        
        {/* 电话 */}
        <div className="a4-contact-item">
          <svg className="a4-contact-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
          <span>{basics.phone}</span>
        </div>
        
        {/* 社交链接 */}
        {basics.profiles.map((profile, index) => (
          <div key={index} className="a4-contact-item">
            <span className="text-primary-main">{profile.network}:</span>
            <span>{profile.label || profile.url}</span>
          </div>
        ))}
      </div>
    </header>
  );
}
