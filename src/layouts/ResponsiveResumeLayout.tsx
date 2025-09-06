import { Header } from "@/components/Header";
import { Introduction } from "@/components/Introduction";
import { Education } from "@/components/Education";
import { Skills } from "@/components/Skills";
import { Work } from "@/components/Work";
import { Projects } from "@/components/Projects";
import { Achievements } from "@/components/Achievements";
import { Certifications } from "@/components/Certifications";
import { ResumeData } from '@/data/resume';

interface ResponsiveResumeLayoutProps {
  resumeData: ResumeData;
}

export function ResponsiveResumeLayout({ resumeData }: ResponsiveResumeLayoutProps) {
  return (
    <div className="resume-container max-w-[1200px] mx-auto bg-background-paper 
      shadow-sm sm:shadow-md dark:shadow-lg rounded-lg sm:rounded-xl 
      transition-shadow duration-200">
      
      <div className="px-8 sm:px-10 lg:px-12 py-8 sm:py-10">
        <Header basics={resumeData.basics} />
        
        <div className="mb-12">
          <Introduction summary={resumeData.basics.summary} />
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-[2.2fr,1.8fr] gap-12 lg:gap-16">
          <div className="space-y-12">
            <Work work={resumeData.work} />
            <Projects projects={resumeData.projects} />
          </div>
          <div className="space-y-10">
            <Education education={resumeData.education} />
            <Skills skills={resumeData.skills} />
            <div className="space-y-10">
              <Achievements achievements={resumeData.achievements} />
              <Certifications certifications={resumeData.certifications} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
