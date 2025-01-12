<div align="center">
  <h1>
    <img src="/public/easy-resume.svg" alt="Easy Resume Logo" width="80px"><br/>
    Easy Resume
  </h1>
  <p>A modern, responsive resume builder with dark mode support</p>
  <a href="https://easy-resume-theta.vercel.app/"><img src="https://img.shields.io/badge/demo-view%20live-blue?style=for-the-badge" alt="Live Demo" /></a>
  <img src="https://img.shields.io/badge/next.js-15.1.4-black?style=for-the-badge&logo=next.js" />
  <img src="https://img.shields.io/badge/typescript-5.0.0-blue?style=for-the-badge&logo=typescript" />
  <img src="https://img.shields.io/badge/tailwindcss-3.4.1-38B2AC?style=for-the-badge&logo=tailwind-css" />
</div>

[View Demo](https://easy-resume-theta.vercel.app/) | [Documentation](https://github.com/ChanMeng666/easy-resume#readme) | [Report Bug](https://github.com/ChanMeng666/easy-resume/issues) | [Request Feature](https://github.com/ChanMeng666/easy-resume/issues)

> [!NOTE]
> Node.js >= 18 required

Create your professional resume in minutes with Easy Resume - a modern, responsive resume builder featuring dark mode support and seamless Vercel deployment.

<br/>

[![Explore GitHub Profile README Generator](https://gradient-svg-generator.vercel.app/?text=👉+Preview+It+Now!+👈&height=40&template=pride-rainbow)](https://easy-resume-theta.vercel.app/)

<br/>

![screencapture-easy-resume-theta-vercel-app-2025-01-12-01_11_52](https://github.com/user-attachments/assets/a16b794a-aade-4018-a09e-b61227f10fed)

![screencapture-easy-resume-theta-vercel-app-2025-01-12-01_12_07](https://github.com/user-attachments/assets/9c9e9506-286c-4264-b5b8-fca9ae708bb5)


## ✨ Features

- 📱 **Responsive Design** - Perfect viewing on all devices
- 🌓 **Dark/Light Mode** - Automatic theme detection with manual toggle
- 🎨 **Customizable** - Easy to modify colors, fonts, and layout
- 📝 **Type-Safe** - Built with TypeScript for reliable customization
- 🚀 **One-Click Deploy** - Instant deployment to Vercel
- ♿ **Accessible** - WCAG 2.1 compliant
- 🎯 **SEO Optimized** - Best practices for visibility

## 🚀 Quick Start

### Deploy Your Own

Deploy your own version of Easy Resume with Vercel:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/ChanMeng666/easy-resume)

### Local Development

1. **Clone the repository**
```bash
git clone https://github.com/ChanMeng666/easy-resume.git
cd easy-resume
```

2. **Install dependencies**
```bash
npm install
# or
yarn install
```

3. **Start development server**
```bash
npm run dev
# or
yarn dev
```

4. **Open [http://localhost:3000](http://localhost:3000)**

## 🎨 Customization

### Basic Customization

1. **Edit Your Information**
   - Open `src/data/resume.ts`
   - Update the `resumeData` object with your information
   - The TypeScript interface will guide you through available fields

```typescript
export const resumeData: ResumeData = {
  basics: {
    name: "Your Name",
    label: "Your Title",
    email: "your.email@example.com",
    // ... other fields
  },
  // ... other sections
};
```

2. **Modify Colors**
   - Open `globals.css`
   - Update CSS variables to match your preferred color scheme
   - Changes will apply to both light and dark modes

### Advanced Customization

1. **Layout Modifications**
   - Components are in `src/components/`
   - Each section (Education, Work, etc.) can be modified independently
   - Tailwind classes make styling changes easy

2. **Adding New Sections**
   - Create a new component in `src/components/`
   - Add the component to `page.tsx`
   - Update the `ResumeData` interface in `resume.ts`

## 🌐 Deployment

### Deploy to Vercel

1. Fork this repository
2. Create a new project on [Vercel](https://vercel.com)
3. Connect your forked repository
4. Deploy!

> [!TIP]
> Enable automatic deployments to update your resume with every push

### Other Hosting Options

You can also deploy to other platforms:

1. **Static Export**
```bash
npm run build
npm run export
```

2. **Docker**
```bash
docker build -t easy-resume .
docker run -p 3000:3000 easy-resume
```

## 🛠️ Tech Stack

<div align="center">
  <img src="https://img.shields.io/badge/Next.js-15.1.4-black?style=flat-square&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/TypeScript-5.0.0-blue?style=flat-square&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind-3.4.1-38B2AC?style=flat-square&logo=tailwind-css" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/React-19.0.0-61DAFB?style=flat-square&logo=react" alt="React" />
</div>

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

## 📧 Contact

**Chan Meng**
- Website: [chanmeng.live](https://chanmeng.live)
- GitHub: [@ChanMeng666](https://github.com/ChanMeng666)
- LinkedIn: [chanmeng666](https://www.linkedin.com/in/chanmeng666)


## 💖 Acknowledgments

- [Next.js](https://nextjs.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Vercel](https://vercel.com)

---

<div align="center">
⭐️ If you find this project useful, please consider giving it a star!
<br/>
Made with ❤️ by Chan Meng
</div>
