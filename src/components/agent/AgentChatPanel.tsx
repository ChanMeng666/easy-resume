'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useRef, useEffect, useState } from 'react';
import { Send, Bot, User, Loader2, Sparkles, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ResumeData } from '@/lib/validation/schema';
import { ToolResultCard } from './ToolResultCard';

interface AgentChatPanelProps {
  resumeData: ResumeData;
  templateId: string;
  onResumeUpdate: (data: ResumeData) => void;
}

/**
 * AI Agent chat panel using Vercel AI SDK v6 useChat hook.
 * Neobrutalism-styled chat interface replacing CopilotSidebar.
 */
export function AgentChatPanel({ resumeData, templateId, onResumeUpdate }: AgentChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [input, setInput] = useState('');

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/agent/chat',
      body: { resumeData, templateId },
    }),
  });

  const isLoading = status === 'streaming' || status === 'submitted';

  // Check tool results for resume updates
  useEffect(() => {
    for (const message of messages) {
      if (message.role !== 'assistant' || !message.parts) continue;
      for (const part of message.parts) {
        if (part.type.startsWith('tool-') && 'output' in part) {
          const toolOutput = part.output as Record<string, unknown> | undefined;
          if (!toolOutput?.success) continue;

          if (part.type === 'tool-updateResume' && toolOutput.data) {
            onResumeUpdate(toolOutput.data as ResumeData);
          }
          if (part.type === 'tool-tailorResumeToJob' && toolOutput.data) {
            onResumeUpdate(toolOutput.data as ResumeData);
          }
        }
      }
    }
  }, [messages, onResumeUpdate]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Handle keyboard submit
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && !isLoading) {
        sendMessage({ text: input });
        setInput('');
      }
    }
  };

  // Handle form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      sendMessage({ text: input });
      setInput('');
    }
  };

  // Quick suggestion prompts
  const suggestions = [
    "Improve my summary",
    "Add a work experience",
    "Optimize for ATS",
    "Score my resume",
  ];

  return (
    <div className={`flex flex-col bg-white border-l-2 border-black h-full transition-all duration-300 ${
      isExpanded ? 'w-[500px]' : 'w-[380px]'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b-2 border-black bg-gradient-to-r from-purple-50 to-cyan-50">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-purple-600 rounded-lg">
            <Bot className="h-4 w-4 text-white" />
          </div>
          <div>
            <h3 className="font-black text-sm">AI Career Agent</h3>
            <p className="text-[10px] text-muted-foreground font-medium">Powered by GPT-4o</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="h-8 w-8 p-0"
        >
          {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </Button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="p-4 bg-purple-100 rounded-xl mb-4">
              <Sparkles className="h-8 w-8 text-purple-600" />
            </div>
            <h4 className="font-black text-lg mb-2">Hi! I&apos;m your AI Career Agent</h4>
            <p className="text-sm text-muted-foreground font-medium mb-6">
              I can edit your resume, analyze job postings, tailor your resume for specific roles, and generate cover letters.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setInput(s);
                    inputRef.current?.focus();
                  }}
                  className="px-3 py-1.5 text-xs font-bold bg-gray-100 rounded-lg border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,0.9)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,0.9)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div key={message.id} className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {message.role === 'assistant' && (
              <div className="flex-shrink-0 w-7 h-7 bg-purple-600 rounded-lg flex items-center justify-center">
                <Bot className="h-4 w-4 text-white" />
              </div>
            )}
            <div className={`max-w-[85%] ${
              message.role === 'user'
                ? 'bg-black text-white rounded-xl rounded-br-sm px-4 py-2.5'
                : 'bg-gray-50 rounded-xl rounded-bl-sm px-4 py-2.5 border border-gray-200'
            }`}>
              {message.parts?.map((part, idx) => {
                if (part.type === 'text') {
                  return (
                    <p key={idx} className="text-sm whitespace-pre-wrap font-medium">
                      {part.text}
                    </p>
                  );
                }
                if (part.type.startsWith('tool-')) {
                  const toolOutput = 'output' in part ? part.output as Record<string, unknown> : undefined;
                  const toolState = 'state' in part ? (part.state as string) : 'loading';
                  return (
                    <ToolResultCard
                      key={idx}
                      toolName={part.type.replace('tool-', '')}
                      result={toolOutput}
                      state={toolState === 'result' ? 'result' : 'loading'}
                    />
                  );
                }
                return null;
              })}
            </div>
            {message.role === 'user' && (
              <div className="flex-shrink-0 w-7 h-7 bg-black rounded-lg flex items-center justify-center">
                <User className="h-4 w-4 text-white" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-7 h-7 bg-purple-600 rounded-lg flex items-center justify-center">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <div className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
              <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t-2 border-black">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me to edit your resume, analyze a job posting..."
            rows={1}
            className="flex-1 resize-none rounded-lg border-2 border-black px-3 py-2 text-sm font-medium placeholder:text-muted-foreground focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)] transition-shadow"
          />
          <Button
            type="submit"
            size="sm"
            disabled={!input.trim() || isLoading}
            className="h-auto px-3"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
