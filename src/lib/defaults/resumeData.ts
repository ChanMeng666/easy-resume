import type { ResumeData } from "@/lib/validation/schema";

/**
 * Returns default resume data for new resumes.
 */
export function getDefaultResumeData(): ResumeData {
  return {
    basics: {
      name: "Your Name",
      label: "Your Professional Title",
      email: "your.email@example.com",
      phone: "+1 (555) 123-4567",
      location: "City, Country",
      summary: "A brief professional summary highlighting your key skills and career objectives.",
      profiles: [
        {
          network: "LinkedIn",
          url: "https://linkedin.com/in/yourprofile",
        },
        {
          network: "GitHub",
          url: "https://github.com/yourusername",
        },
      ],
    },
    education: [
      {
        institution: "University Name",
        area: "Your Major",
        studyType: "Bachelor of Science",
        startDate: "Sep 2018",
        endDate: "Jun 2022",
        location: "City, Country",
        gpa: "3.8/4.0",
      },
    ],
    work: [
      {
        company: "Company Name",
        position: "Your Position",
        startDate: "Jul 2022",
        endDate: "PRESENT",
        location: "City, Country",
        type: "Full-time",
        highlights: [
          "Describe your key achievement or responsibility",
          "Quantify your impact when possible",
          "Use action verbs to start each bullet point",
        ],
      },
    ],
    projects: [
      {
        name: "Project Name",
        description: "Brief description of the project and your role",
        url: "https://github.com/yourusername/project",
        highlights: [
          "Key feature or achievement",
          "Technologies used",
        ],
      },
    ],
    skills: [
      {
        name: "Programming Languages",
        keywords: ["JavaScript", "TypeScript", "Python"],
      },
      {
        name: "Frameworks & Tools",
        keywords: ["React", "Node.js", "Git"],
      },
    ],
    achievements: [
      "Notable achievement or award",
    ],
    certifications: [
      "Relevant certification",
    ],
  };
}
