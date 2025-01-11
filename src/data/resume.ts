export interface ResumeData {
  basics: {
    name: string;
    label: string;
    email: string;
    phone: string;
    location: string;
    profiles: {
      network: string;
      url: string;
      label?: string;
    }[];
  };
  education: {
    institution: string;
    area: string;
    studyType: string;
    startDate: string;
    endDate: string;
    gpa?: string;
    location: string;
    note?: string;
  }[];
  skills: {
    name: string;
    keywords: string[];
  }[];
  work: {
    company: string;
    position: string;
    startDate: string;
    endDate: string;
    location: string;
    type: string;
    highlights: string[];
  }[];
  projects: {
    name: string;
    description: string;
    highlights: string[];
    url?: string;
  }[];
  achievements: string[];
  certifications: string[];
}

export const resumeData: ResumeData = {
  basics: {
    name: "Chan Meng",
    label: "Full-Stack Developer specializing in Web & Mobile Applications",
    email: "chanmeng.career@gmail.com",
    phone: "(+64) 028 8523 5858",
    location: "New Zealand",
    profiles: [
      {
        network: "Portfolio",
        url: "https://chanmeng.live/",
        label: "chanmeng.live"
      },
      {
        network: "LinkedIn",
        url: "https://www.linkedin.com/in/chanmeng666",
        label: "chanmeng666"
      },
      {
        network: "GitHub",
        url: "https://github.com/ChanMeng666",
        label: "ChanMeng666"
      }
    ]
  },
  education: [
    {
      institution: "Lincoln University",
      area: "Applied Computing",
      studyType: "Master",
      startDate: "Nov 2023",
      endDate: "Dec 2024",
      location: "New Zealand",
      note: "with Distinction"
    },
    {
      institution: "Jiangsu Normal University",
      area: "Geography Science",
      studyType: "Bachelor",
      startDate: "Sep 2012",
      endDate: "Jun 2016",
      location: "China",
      note: "with Distinction"
    }
  ],
  skills: [
    {
      name: "Programming Languages",
      keywords: ["TypeScript", "JavaScript", "Python", "HTML", "CSS", "SQL"]
    },
    {
      name: "Frontend",
      keywords: ["React", "Next.js", "Angular", "Tailwind CSS", "Redux", "Framer Motion", "Three.js"]
    },
    {
      name: "Backend",
      keywords: ["Node.js", "Express", "Flask", "FastAPI", "RESTful APIs", "WebSocket", "Authentication", "Real-time Data Processing"]
    },
    {
      name: "Databases",
      keywords: ["PostgreSQL", "MongoDB", "MySQL", "Database Design", "Query Optimization"]
    },
    {
      name: "Additional Expertise",
      keywords: [
        "System Architecture",
        "API Design",
        "Performance Optimization",
        "Technical Documentation",
        "Test-Driven Development",
        "Agile Methodologies"
      ]
    }
  ],
  work: [
    {
      company: "ByteDance Youth Camp",
      position: "Backend Engineer",
      startDate: "Nov 2024",
      endDate: "PRESENT",
      location: "Remote/China",
      type: "Apprenticeship",
      highlights: [
        "Selected among 8900+ participants to develop microservices and distributed systems under ByteDance engineers' mentorship."
      ]
    },
    {
      company: "FreePeriod",
      position: "Chief Technology Officer",
      startDate: "Nov 2024",
      endDate: "PRESENT",
      location: "Remote/China",
      type: "Freelance",
      highlights: [
        "Built bilingual platform serving 3,000+ monthly users with IoT-enabled tracking of 50+ sanitary pad stations.",
        "Developed analytics dashboard with automated tracking, reducing inventory management time by 30%."
      ]
    },
    {
      company: "CORDE",
      position: "Mobile Application Full Stack Developer",
      startDate: "Jun 2024",
      endDate: "Nov 2024",
      location: "Hybrid/Christchurch",
      type: "Internship",
      highlights: [
        "Developed Android app processing 119,000+ annual maintenance logs for 100+ field workers.",
        "Implemented offline data sync system reducing manual entry by 80%, while contributing 66% of project codebase."
      ]
    }
  ],
  projects: [
    {
      name: "AgriHire Solutions",
      description: "Equipment rental management system",
      url: "https://agrihireaq.pythonanywhere.com/",
      highlights: [
        "Developed full-stack equipment rental management system serving 4 user roles across 10+ stores.",
        "Implemented real-time inventory tracking for 100+ equipment items and streamlined booking process.",
        "Increased operational efficiency by 30% through integrated analytics and automated notifications."
      ]
    },
    {
      name: "Library Management System",
      description: "Full-stack library platform with Next.js 15",
      url: "https://github.com/ChanMeng666/library-management-system",
      highlights: [
        "Built a full-stack library platform with Next.js 15, achieving 99.9% uptime and 75% faster checkout process.",
        "Designed responsive UI with real-time updates using shadcn/ui."
      ]
    },
    {
      name: "FriendScope",
      description: "Scientific friendship assessment tool",
      url: "https://friendscope.vercel.app/",
      highlights: [
        "Engineered a scientific friendship assessment tool that evaluates relationships across 10 psychological dimensions and generates personalized insights.",
        "Built interactive data visualization system featuring real-time analytics and comparative historical tracking.",
        "Implemented privacy-first architecture with local storage and anonymous assessment, achieving 100% data security."
      ]
    },
    {
      name: "FreePeriod Website",
      description: "Sustainable menstrual care platform",
      url: "https://free-period-website.vercel.app/",
      highlights: [
        "Developed a sustainable menstrual care platform using TypeScript, integrating 4+ core modules including real-time impact tracking, location services, user authentication, and educational resources.",
        "Implemented responsive UI with Tailwind CSS, achieving seamless functionality across all devices and supporting 2 languages (EN/CN)."
      ]
    },
    {
      name: "Interactive Story Generator",
      description: "AI-powered storytelling platform",
      url: "https://huggingface.co/spaces/ChanMeng666/interactive-story-generator",
      highlights: [
        "Developed an AI-powered storytelling platform using Python, Gradio and Hugging Face Transformers, featuring 5+ story themes and customizable AI parameters.",
        "Implemented comprehensive story management system enabling users to create, save and continue personalized narratives through natural dialogue."
      ]
    }
  ],
  achievements: [
    "Excellence Award Winner — FemTech China Women's Health Technology Challenge in December 2024",
    "Mentor — Forward with Her Program, supported by UN Women",
    "Founder — TechRosie GitHub Organization, promoting diversity in tech"
  ],
  certifications: [
    "Software Engineer - HackerRank",
    "Frontend Developer (React) - HackerRank",
    "Node.js (Intermediate) - HackerRank",
    "Angular (Intermediate) - HackerRank",
    "SQL (Advanced) - HackerRank",
    "Rest API (Intermediate) - HackerRank",
    "System Administration - Microsoft",
    "Project Management - Microsoft",
    "Cybersecurity - Microsoft"
  ]
}; 