import { Header } from "@/components/Header";
import { Education } from "@/components/Education";
import { Skills } from "@/components/Skills";
import { Work } from "@/components/Work";
import { Projects } from "@/components/Projects";
import { Achievements } from "@/components/Achievements";
import { Certifications } from "@/components/Certifications";
import { PrintButton } from "@/components/PrintButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { resumeData } from "@/data/resume";

export default function Home() {
  return (
    <div className="min-h-screen bg-background py-6 sm:py-8 px-3 sm:px-4 print:p-0 print:bg-white">
      <div className="resume-container max-w-[1100px] mx-auto bg-background-paper 
        shadow-sm sm:shadow-md dark:shadow-lg rounded-none sm:rounded-lg 
        transition-shadow duration-200"
      >
        <Header basics={resumeData.basics} />
        <div className="grid grid-cols-1 lg:grid-cols-[2.5fr,1.5fr] gap-8 lg:gap-12">
          <div className="space-y-10">
            <Work work={resumeData.work} />
            <Projects projects={resumeData.projects} />
          </div>
          <div className="space-y-8">
            <Education education={resumeData.education} />
            <Skills skills={resumeData.skills} />
            <div className="space-y-8 print:break-inside-avoid">
              <Achievements achievements={resumeData.achievements} />
              <Certifications certifications={resumeData.certifications} />
            </div>
          </div>
        </div>
      </div>
      <div className="fixed bottom-6 right-6 flex gap-3 print:hidden">
        <ThemeToggle />
        <PrintButton />
      </div>
    </div>
  );
}
