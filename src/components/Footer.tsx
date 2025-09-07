import React from 'react';
import Image from 'next/image';

export function Footer() {
  return (
    <footer className="bg-white border-t border-gray-100 mt-16">
      <div className="max-w-5xl mx-auto px-6 py-12">
        
        {/* Main content */}
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-10">
          
          {/* Left: Project Brand */}
          <div className="flex-1 max-w-lg">
            <div className="flex items-center gap-4 mb-6">
              <Image
                src="/easy-resume.svg"
                alt="Easy Resume"
                width={48}
                height={48}
                className="w-12 h-12"
              />
              <div>
                <h2 className="text-xl font-bold text-gray-900">Easy Resume</h2>
                <p className="text-sm text-gray-600">Professional Resume Builder</p>
              </div>
            </div>
            
            <p className="text-gray-700 leading-relaxed mb-6">
              Create professional resumes with modern design and A4 format support. 
              Export to PDF and preview in real-time.
            </p>
            
            {/* Key Features */}
            <div className="flex flex-wrap gap-3">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                PDF Export
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700">
                A4 Format
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700">
                Real-time Preview
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-50 text-orange-700">
                Responsive Design
              </span>
            </div>
          </div>

          {/* Right: Links & Developer */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-8 lg:gap-6 lg:text-right">
            
            {/* Quick Links */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">Resources</h3>
              <div className="flex flex-col space-y-3">
                <a
                  href="https://github.com/ChanMeng666/easy-resume"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center sm:justify-start lg:justify-end gap-2 text-gray-600 hover:text-gray-900 transition-colors group"
                >
                  <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm">View Source</span>
                </a>
                
                <div className="flex items-center sm:justify-start lg:justify-end gap-2 text-gray-500">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm">Open Source</span>
                </div>
              </div>
            </div>

            {/* Developer */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">Developer</h3>
              <div className="flex items-center sm:justify-start lg:justify-end gap-3">
                <Image
                  src="/chan_logo.svg"
                  alt="Chan Meng"
                  width={32}
                  height={32}
                  className="w-8 h-8"
                />
                <div className="text-left lg:text-right">
                  <p className="font-medium text-gray-900 text-sm">Chan Meng</p>
                  <p className="text-xs text-gray-600">Full-Stack Developer</p>
                </div>
              </div>
              
              <div className="flex flex-col space-y-2">
                <a
                  href="mailto:chanmeng.dev@gmail.com"
                  className="flex items-center sm:justify-start lg:justify-end gap-2 text-gray-600 hover:text-gray-900 transition-colors group"
                >
                  <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                  </svg>
                  <span className="text-sm">Contact</span>
                </a>
                
                <a
                  href="https://github.com/ChanMeng666"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center sm:justify-start lg:justify-end gap-2 text-gray-600 hover:text-gray-900 transition-colors group"
                >
                  <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm">Portfolio</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-10 pt-6 border-t border-gray-100">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-500">
              © {new Date().getFullYear()} Easy Resume. Built with Next.js & Tailwind CSS.
            </p>
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <span>Available for custom projects</span>
              <span>•</span>
              <a 
                href="mailto:chanmeng.dev@gmail.com" 
                className="hover:text-gray-600 transition-colors"
              >
                Get in touch
              </a>
            </div>
          </div>
        </div>
        
      </div>
    </footer>
  );
}
