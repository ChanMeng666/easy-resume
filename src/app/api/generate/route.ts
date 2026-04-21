/**
 * Resume generation pipeline API route.
 * Streams SSE progress events while running the full AI pipeline:
 * JD parsing -> background parsing -> match analysis -> tailoring -> ATS scoring -> cover letter -> Typst generation.
 */

import { NextRequest } from 'next/server';
import { parseJobDescription } from '@/lib/agent/jd-parser';
import { parseBackground } from '@/lib/agent/background-parser';
import { analyzeMatch } from '@/lib/agent/matching-engine';
import { tailorResume } from '@/lib/agent/resume-tailor';
import { scoreATS } from '@/lib/agent/ats-scorer';
import { generateCoverLetter } from '@/lib/agent/cover-letter';
import { selectTemplate } from '@/lib/agent/template-selector';
import { getTemplateById } from '@/templates/registry';
import { generateTypstCode } from '@/lib/typst/generator';
import { generateCoverLetterTypst } from '@/lib/typst/cover-letter';

const TOTAL_STEPS = 7;

/**
 * Send an SSE event to the stream.
 */
function sendEvent(
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  data: object
): void {
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
}

/**
 * Send a progress event for the current pipeline step.
 */
function sendProgress(
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  step: number,
  message: string
): void {
  sendEvent(controller, encoder, {
    type: 'progress',
    step,
    total: TOTAL_STEPS,
    message,
  });
}

/**
 * POST handler — runs the full resume generation pipeline and streams progress via SSE.
 */
export async function POST(request: NextRequest) {
  let body: { jobDescription?: string; background?: string };

  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON body' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const { jobDescription, background } = body;

  if (!jobDescription || typeof jobDescription !== 'string' || !jobDescription.trim()) {
    return new Response(
      JSON.stringify({ error: 'jobDescription is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (!background || typeof background !== 'string' || !background.trim()) {
    return new Response(
      JSON.stringify({ error: 'background is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Step 1: Parse job description
        sendProgress(controller, encoder, 1, 'Analyzing job description...');
        const parsedJD = await parseJobDescription(jobDescription);

        // Step 2: Parse background into ResumeData
        sendProgress(controller, encoder, 2, 'Parsing your background...');
        const baseResume = await parseBackground(background);

        // Step 3: Analyze match
        sendProgress(controller, encoder, 3, 'Analyzing match with job requirements...');
        const matchAnalysis = await analyzeMatch(baseResume, parsedJD);

        // Step 4: Tailor resume
        sendProgress(controller, encoder, 4, 'Tailoring resume for the role...');
        const tailoredResume = await tailorResume(baseResume, parsedJD, matchAnalysis);

        // Step 5: Score ATS
        sendProgress(controller, encoder, 5, 'Scoring ATS compatibility...');
        const atsReport = await scoreATS(tailoredResume, parsedJD);

        // Step 6: Generate cover letter
        sendProgress(controller, encoder, 6, 'Generating cover letter...');
        const coverLetter = await generateCoverLetter(tailoredResume, parsedJD);

        // Step 7: Select template and generate Typst code
        sendProgress(controller, encoder, 7, 'Generating resume document...');
        const templateId = selectTemplate(parsedJD);
        const template = getTemplateById(templateId);
        const typstCode = template
          ? template.generator(tailoredResume)
          : generateTypstCode(tailoredResume);

        const coverLetterTypst = generateCoverLetterTypst(coverLetter, tailoredResume);

        // Send final result
        sendEvent(controller, encoder, {
          type: 'result',
          data: {
            resumeData: tailoredResume,
            typstCode,
            atsScore: atsReport.overallScore,
            matchAnalysis: {
              overallScore: matchAnalysis.overallScore,
              matchedSkills: matchAnalysis.skillMatch.matched,
              missingSkills: matchAnalysis.skillMatch.missing,
            },
            coverLetter,
            coverLetterTypst,
            templateId,
          },
        });

        // Send done signal
        sendEvent(controller, encoder, { type: 'done' });
      } catch (error) {
        console.error('Generate pipeline error:', error);
        const message =
          error instanceof Error ? error.message : 'An unexpected error occurred';
        sendEvent(controller, encoder, { type: 'error', message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
