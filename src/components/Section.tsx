interface SectionProps {
  title: string;
  children: React.ReactNode;
}

export function Section({ title, children }: SectionProps) {
  return (
    <section className="relative print:break-inside-avoid">
      <h2 className="text-xl font-bold mb-5 text-primary-main border-b 
        border-primary-main/20 pb-2.5 dark:border-primary-main/10 
        sticky top-0 bg-background-paper z-10 tracking-tight"
      >
        {title}
      </h2>
      <div className="space-y-5">
        {children}
      </div>
    </section>
  );
} 