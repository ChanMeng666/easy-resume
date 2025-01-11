import { ResumeData } from "@/data/resume";

interface HeaderProps {
  basics: ResumeData["basics"];
}

export function Header({ basics }: HeaderProps) {
  return (
    <header className="mb-8 sm:mb-10 text-center">
      <h1 className="text-3xl sm:text-4xl font-bold mb-2 text-foreground">
        {basics.name}
      </h1>
      <p className="text-lg sm:text-xl text-primary-main dark:text-primary-light mb-4 max-w-2xl mx-auto">
        {basics.label}
      </p>
      <div className="flex flex-col gap-3">
        {/* Contact Info */}
        <div className="flex flex-wrap justify-center items-center gap-3 sm:gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              className="h-4 w-4 text-text-secondary"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <span className="text-text-secondary">{basics.location}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              className="h-4 w-4 text-text-secondary"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
              />
            </svg>
            <span className="text-text-secondary">{basics.phone}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              className="h-4 w-4 text-text-secondary"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            <a
              href={`mailto:${basics.email}`}
              className="text-primary-main hover:text-primary-dark transition-colors"
            >
              {basics.email}
            </a>
          </div>
        </div>

        {/* Social Links */}
        <div className="flex flex-wrap justify-center items-center gap-4 text-sm">
          {basics.profiles.map((profile) => (
            <a
              key={profile.network}
              href={profile.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-1.5 text-primary-main hover:text-primary-dark transition-colors"
            >
              <span className="font-medium">{profile.network}</span>
              {profile.label && (
                <>
                  <span className="text-text-secondary group-hover:text-primary-dark/70 transition-colors">
                    //
                  </span>
                  <span className="text-text-secondary group-hover:text-primary-dark/70 transition-colors">
                    {profile.label}
                  </span>
                </>
              )}
            </a>
          ))}
        </div>
      </div>
    </header>
  );
} 