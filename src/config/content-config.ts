// Content configuration file - Easy content editing for users
// Modify this file to update resume content, similar to online document editing experience

export const contentConfig = {
  // Personal basic information
  basics: {
    name: "Chan Meng",
    position: "Web/Mobile App & AI/ML Infrastructure Engineer",
    email: "chanmeng.career@gmail.com",
    phone: "(+64) 028 8523 5858",
    location: "Auckland, New Zealand",
    
    // Personal summary (recommend keeping under 500 characters)
    summary: `Full-stack developer with specialized expertise in women's health technology, combining React/Next.js, TypeScript, Python, and cloud infrastructure to build impactful web applications. Currently driving technical innovation as CTO at FreePeriod and AI/ML Infrastructure Engineer at Sanicle, delivering enterprise-grade solutions for workplace health management with AI integration.

Distinguished speaker at the UN CSW 69 Beyond Beijing 30 Conference, showcasing how AI technology effectively addresses workplace gender inequities. Passionate mentor dedicated to supporting women in STEM through the Forward with Her program, with proven impact across a diverse network of mentees from prestigious universities. Master's graduate with Distinction from Lincoln University, bringing academic excellence and practical implementation skills to every project.

Combines technical leadership with minimalist design principles to create elegant, efficient solutions while fostering inclusive development environments that empower teams to deliver exceptional results.`,
    
    // Social links
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

  // Content editing guide
  editingGuide: {
    tips: [
      "📝 Personal summary should be under 500 characters, highlighting core strengths",
      "💼 Work experience should have no more than 5 key highlights per position",  
      "🚀 Project experience should showcase 3 most representative projects",
      "🎓 Education section should only show relevant academic information",
      "🔧 Skills should be organized into 5-6 main categories",
      "🏆 Achievements should be limited to 8 most important accomplishments",
      "📜 Certifications should show only relevant professional credentials, max 10 items"
    ],
    
    limits: {
      summary: 500,
      workHighlights: 5,
      projects: 3,
      achievements: 8,
      certifications: 10,
      skillCategories: 6
    }
  },

  // Style theme configuration
  theme: {
    // Primary color
    primaryColor: "#2563eb",
    
    // Font configuration
    fonts: {
      headingFont: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif",
      bodyFont: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif",
    },
    
    // Spacing configuration
    spacing: {
      sectionGap: "24px",
      itemGap: "16px",
      textGap: "8px"
    }
  }
};

// Content templates - Multiple preset versions available
export const contentTemplates = {
  // Technical resume template
  tech: {
    name: "Technical Expert Template",
    description: "Suitable for software engineers, tech leads, and technical roles",
    focus: ["Tech Stack", "Project Experience", "Technical Achievements"]
  },
  
  // Management resume template
  management: {
    name: "Management Template", 
    description: "Suitable for team leaders, project managers, and management roles",
    focus: ["Leadership Experience", "Team Management", "Business Results"]
  },
  
  // Startup resume template
  startup: {
    name: "Entrepreneur Template",
    description: "Suitable for entrepreneurs, CTOs, and executive roles",
    focus: ["Startup Experience", "Strategic Planning", "Business Insights"]
  }
};

// Export configuration
export const exportConfig = {
  // PDF file naming rules
  fileNaming: {
    pattern: "{name}-Resume-{date}",
    dateFormat: "YYYY-MM-DD"
  },
  
  // PDF quality settings
  quality: {
    printBackground: true,
    scale: 1.0,
    format: "A4" as const
  }
};
