import { ResumeData } from '@/lib/validation/schema';

export const resumeData: ResumeData = {
  basics: {
    name: "Chan Meng",
    label: "Web/Mobile App & AI/ML Infrastructure Engineer",
    email: "chanmeng.career@gmail.com",
    phone: "(+64) 028 8523 5858",
    location: "Auckland, New Zealand",
    summary: "Full-stack developer with specialized expertise in women's health technology, combining React/Next.js, TypeScript, Python, and cloud infrastructure to build impactful web applications. Currently driving technical innovation as CTO at FreePeriod and AI/ML Infrastructure Engineer at Sanicle, delivering enterprise-grade solutions for workplace health management with AI integration.\n\nDistinguished speaker at the UN CSW 69 Beyond Beijing 30 Conference, showcasing how AI technology effectively addresses workplace gender inequities. Passionate mentor dedicated to supporting women in STEM through the Forward with Her program, with proven impact across a diverse network of mentees from prestigious universities. Master's graduate with Distinction from Lincoln University, bringing academic excellence and practical implementation skills to every project.\n\nCombines technical leadership with minimalist design principles to create elegant, efficient solutions while fostering inclusive development environments that empower teams to deliver exceptional results.",
    profiles: [
      {
        network: "Portfolio",
        url: "https://chanmeng.org/",
        label: "chanmeng.org"
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
      gpa: "above 80%",
      note: "with Distinction"
    },
    {
      institution: "Jiangsu Normal University",
      area: "Geography Science",
      studyType: "Bachelor",
      startDate: "Sep 2012",
      endDate: "Jun 2016",
      location: "China",
      gpa: "above 80%",
      note: "with Distinction"
    }
  ],
  skills: [
    {
      name: "Programming Languages",
      keywords: ["TypeScript", "JavaScript", "Python", "Java", "Go", "HTML", "CSS", "SQL", "R"]
    },
    {
      name: "Frontend",
      keywords: ["React", "Next.js", "Angular", "Tailwind CSS", "Redux", "Framer Motion", "Three.js"]
    },
    {
      name: "Backend",
      keywords: ["Node.js", "Express", "REST API", "Flask", "FastAPI", "WebSocket", "Authentication", "Real-time Data Processing"]
    },
    {
      name: "Databases",
      keywords: ["PostgreSQL", "MongoDB", "MySQL", "SQLite", "Database Design", "Query Optimization"]
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
      company: "Sanicle",
      position: "Senior AI/ML Infrastructure Engineer",
      startDate: "Mar 2025",
      endDate: "PRESENT",
      location: "Remote",
      type: "Full-time",
      highlights: [
        "Led the development of two key products that helped Sanicle achieve IBM Silver Partner certification through close collaboration with the IBM team. Currently representing Sanicle in strategic discussions with Google to secure investment funding and startup resources.",
        "Designed and developed Sanicle's corporate website using Next.js 15 and React 19, integrating IBM Cloud Watson AI as an interactive customer service assistant that engages visitors through conversational support to better understand our offerings",
        "Engineered Sanicle.Cloud, a comprehensive SaaS platform for workplace women's health management (menstrual and menopause wellness), featuring role-based dashboards for employees and HR departments with predictive decision alerts",
        "Implemented IBM Cloud Watson AI within the Sanicle.Cloud employee dashboard, enabling AI-powered health consultations and automated leave requests, significantly enhancing user experience for corporate clients",
        "Built secure multi-tenant architecture with end-to-end encryption and GDPR compliance using PostgreSQL and Drizzle ORM, ensuring complete data isolation between organizations while maintaining system scalability"
      ]
    },
    {
      company: "FreePeriod",
      position: "Full-Stack Developer & CTO",
      startDate: "Nov 2024",
      endDate: "PRESENT",
      location: "Remote",
      type: "Full-time",
      highlights: [
        "Leading software development for a HKUST(GZ)-incubated startup that builds smart vending systems for feminine hygiene products in public spaces. Primary responsibility includes designing and developing the company website and database infrastructure.",
        "Architected full-stack solution using Next.js 14 with App Router for company website",
        "Built responsive interface using React 18, Tailwind CSS, and shadcn/ui",
        "Created custom i18n solution for English-Chinese localization",
        "Implemented location services with Google Maps API and analytics dashboard using Recharts"
      ]
    },
    {
      company: "ByteDance",
      position: "Backend Developer",
      startDate: "Nov 2024",
      endDate: "Feb 2025",
      location: "Remote",
      type: "Full-time",
      highlights: [
        "Contributed to TikTok's microservices-based ecommerce platform development, integrating AI recommendations within a 7-member team guided by 22 senior backend engineers.",
        "Developed core microservices using Spring Cloud for user authentication, product management, and order processing",
        "Implemented database architecture using MySQL with Redis caching and RabbitMQ message queue optimization",
        "Integrated Qwen LLM API for intelligent product recommendations and search functionality",
        "Built responsive UI components with Vue3 and Element Plus"
      ]
    },
    {
      company: "CORDE",
      position: "Mobile Application Developer",
      startDate: "Jun 2024",
      endDate: "Nov 2024",
      location: "Christchurch",
      type: "Internship",
      highlights: [
        "Led frontend development and database architecture of offline-first mobile application for field maintenance operations in 5-member Agile team, contributing 60% of codebase and 98% of documentation.",
        "Designed SQLite database schema scaling to 18 tables for offline data management",
        "Implemented automated background sync and real-time status monitoring",
        "Integrated ArcGIS mapping services with GPS tracking",
        "Developed React Native mobile UI with dark/light themes and dynamic forms for field operations"
      ]
    }
  ],
  projects: [
    {
      name: "FriendScope — Full-Stack Web Application",
      description: "Scientific friendship assessment tool",
      url: "https://friendscope.vercel.app/",
      highlights: [
        "Independently developed a privacy-focused relationship assessment platform featuring comprehensive analysis and visualization tools, gaining significant user traction with consistently positive feedback.",
        "Built interactive data visualization system featuring real-time analytics and comparative historical tracking.",
        "Implemented privacy-first architecture with local storage and anonymous assessment, achieving 100% data security."
      ]
    },
    {
      name: "Gradient SVG Generator — Dynamic SVG Generation Suite",
      description: "Open-source platform for generating animated gradient SVGs",
      url: "https://gradient-svg-generator.vercel.app/",
      highlights: [
        "Developed an open-source platform for generating animated gradient SVGs through a web interface and API, garnering recognition from Reddit's r/lgbt community for its inclusive design templates."
      ]
    },
    {
      name: "Google News MCP Server — Model Context Protocol Integration",
      description: "AI assistant integration for real-time news",
      url: "https://glama.ai/mcp/servers/@ChanMeng666/server-google-news",
      highlights: [
        "Pioneered an early MCP implementation enabling AI assistants to access real-time news. Successfully published to multiple MCP platforms and as an npm package, demonstrating proficiency with next-generation AI interaction protocols."
      ]
    },
    {
      name: "Tencent Meeting Video Downloader — Chrome Browser Extension",
      description: "Browser extension for video downloads",
      url: "https://chromewebstore.google.com/detail/%E8%85%BE%E8%AE%AF%E4%BC%9A%E8%AE%AE%E5%BD%95%E5%B1%8F%E4%B8%8B%E8%BD%BD%E5%8A%A9%E6%89%8B/gdajdfngeonjmcclghkmeoacopnnfpnc?hl=zh-CN&utm_source=ext_sidebar",
      highlights: [
        "Developed a browser extension that automates video downloads from Tencent Meeting with URL detection and custom save options. Published on Chrome Web Store with positive ratings and zero data collection."
      ]
    }
  ],
  achievements: [
    "United Nations CSW 69 Speaker — Beyond Beijing 30 Conference, New York, Mar 2025",
    "Outstanding Performer — UN Women FemTech Hackathon, Mar 2025",
    "Most Popular Mentor — Forward with Her Program, supported by UN Women, Feb 2025",
    "Excellence Award Winner — FemTech China Women's Health Technology Challenge, Dec 2024",
    "5-Star Deep Contributor Award — GitHub for Sustained Code Contributions in GitHub 2024",
    "5-Rank Multilingual Developer — GitHub Trophy 2024",
    "Founder — TechRosie GitHub Organization, promoting diversity in tech"
  ],
  certifications: [
    "Software Engineer - HackerRank",
    "Frontend Developer (React) - HackerRank",
    "Problem Solving (Intermediate) - HackerRank",
    "JavaScript (Intermediate) - HackerRank",
    "Node.js (Intermediate) - HackerRank",
    "Angular (Intermediate) - HackerRank",
    "Go (Intermediate) - HackerRank",
    "Java Professional - JetBrains",
    "SQL (Advanced) - HackerRank",
    "Rest API (Intermediate) - HackerRank",
    "Data Analysis - Microsoft",
    "GitHub Professional - GitHub",
    "Docker Professional - Docker Foundation",
    "Ubuntu Linux Professional - Canonical",
    "Agile Project Management - Atlassian",
    "System Administration - Microsoft",
    "Project Management - Microsoft",
    "Cybersecurity - Microsoft"
  ]
}; 