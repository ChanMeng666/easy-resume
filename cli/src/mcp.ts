/**
 * `vitex mcp` — a stdio MCP server exposing the Vitex hosted API as tools for
 * Claude Desktop, Claude Code, and Cursor (`npx -y vitex-cli mcp`).
 *
 * Every tool is a thin wrapper over VitexClient (client.ts); the generate/refine
 * tools block-and-poll internally so an assistant gets a final result in one call.
 * The API key is read from the environment (VITEX_API_KEY) resolved by cli.ts.
 */

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { VitexClient, ApiError, type JobRecord } from './client.js';

const VERSION = '0.2.0';

interface McpConfig {
  baseUrl: string;
  apiKey: string;
}

type ToolResult = {
  content: { type: 'text'; text: string }[];
  isError?: boolean;
};

/** Wrap a JSON-serializable value as a text tool result. */
function ok(value: unknown): ToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(value, null, 2) }] };
}

/** Render an error as a tool result (envelope for ApiError, message otherwise). */
function fail(err: unknown): ToolResult {
  const payload =
    err instanceof ApiError
      ? { error: { code: err.code, message: err.message, retriable: err.retriable, step: err.step, requestId: err.requestId } }
      : { error: { code: 'UNEXPECTED', message: err instanceof Error ? err.message : String(err) } };
  return { content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }], isError: true };
}

const BILLING_NOTE =
  'Billing: 1 credit only on a successfully compiled PDF; failures and refinements are free.';

/** Build an McpServer with every Vitex tool registered (no transport attached). */
export function createServer(config: McpConfig): McpServer {
  const client = new VitexClient(config);
  const server = new McpServer({ name: 'vitex-cli', version: VERSION });

  server.registerTool(
    'get_account',
    {
      title: 'Get account identity & credit balance',
      description:
        `Return the authenticated account: userId, credit balance, and tier. Read-only — never spends credits. Check credits before generating: a successfully compiled PDF costs 1 credit (refinements and failures are free).`,
      inputSchema: {},
      annotations: {
        title: 'Get account identity & credit balance',
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async (): Promise<ToolResult> => {
      try {
        return ok(await client.me());
      } catch (err) {
        return fail(err);
      }
    },
  );

  server.registerTool(
    'generate_resume',
    {
      title: 'Generate a tailored resume',
      annotations: {
        title: 'Generate a tailored resume',
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: false,
      },
      description:
        `Compile a tailored, ATS-optimized resume PDF and cover letter from a job description plus a background (inline or a saved profile_id). Blocks until the job finishes and returns the final job incl. atsScore. ${BILLING_NOTE}`,
      inputSchema: {
        jobDescription: z.string().min(1).describe('The target job description text'),
        background: z.string().optional().describe('Candidate background as free text (or use profile_id)'),
        profile_id: z.string().optional().describe('A saved candidate profile id to reuse instead of background'),
        template_id: z.string().optional().describe('Optional template id; auto-selected from the JD if omitted'),
      },
    },
    async ({ jobDescription, background, profile_id, template_id }): Promise<ToolResult> => {
      try {
        if (!background && !profile_id) {
          return fail(new Error('provide either background or profile_id'));
        }
        const handle = await client.createResume({ jobDescription, background, profileId: profile_id, templateId: template_id });
        const job = await client.pollJob(handle.id);
        return ok(finalJob(job));
      } catch (err) {
        return fail(err);
      }
    },
  );

  server.registerTool(
    'refine_resume',
    {
      title: 'Refine a resume',
      annotations: {
        title: 'Refine a resume',
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: false,
      },
      description:
        `Refine a succeeded resume with natural-language feedback. Creates a new version in the parent's chain and blocks until it finishes. ${BILLING_NOTE} (Refinement is free.)`,
      inputSchema: {
        id: z.string().min(1).describe('The parent (succeeded) job id'),
        feedback: z.string().min(1).max(8000).describe('Natural-language revision instructions'),
        scope: z.enum(['resume', 'cover_letter', 'both']).optional().describe("What to revise; defaults to 'resume'"),
      },
    },
    async ({ id, feedback, scope }): Promise<ToolResult> => {
      try {
        const handle = await client.refine(id, feedback, scope);
        const job = await client.pollJob(handle.id);
        return ok(finalJob(job));
      } catch (err) {
        return fail(err);
      }
    },
  );

  server.registerTool(
    'get_resume',
    {
      title: 'Get a resume job',
      annotations: {
        title: 'Get a resume job',
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
      description: `Fetch a generation/refine job by id (status, result, atsScore, error). ${BILLING_NOTE}`,
      inputSchema: { id: z.string().min(1).describe('The job id') },
    },
    async ({ id }): Promise<ToolResult> => {
      try {
        return ok(await client.getJob(id));
      } catch (err) {
        return fail(err);
      }
    },
  );

  server.registerTool(
    'download_pdf',
    {
      title: 'Download a resume PDF',
      annotations: {
        title: 'Download a resume PDF',
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
      description:
        `Download a succeeded job's compiled PDF to a temp file and return its path. ${BILLING_NOTE}`,
      inputSchema: { id: z.string().min(1).describe('The succeeded job id') },
    },
    async ({ id }): Promise<ToolResult> => {
      try {
        const pdf = await client.getPdf(id);
        // The id lands in a filesystem path; strip anything that isn't a safe
        // id character so a hostile value can't traverse out of tmpdir.
        const safeId = id.replace(/[^A-Za-z0-9_-]/g, '');
        const path = join(tmpdir(), `vitex-${safeId || 'resume'}.pdf`);
        writeFileSync(path, pdf);
        return ok({ path, bytes: pdf.length });
      } catch (err) {
        return fail(err);
      }
    },
  );

  server.registerTool(
    'list_profiles',
    {
      title: 'List candidate profiles',
      annotations: {
        title: 'List candidate profiles',
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
      description: `List your saved candidate backgrounds (reusable across job descriptions). ${BILLING_NOTE} (Profiles are free.)`,
      inputSchema: {},
    },
    async (): Promise<ToolResult> => {
      try {
        return ok(await client.listProfiles());
      } catch (err) {
        return fail(err);
      }
    },
  );

  server.registerTool(
    'create_profile',
    {
      title: 'Create a candidate profile',
      annotations: {
        title: 'Create a candidate profile',
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: false,
      },
      description:
        `Save a reusable candidate background (parsed server-side). Reuse it via profile_id in generate_resume. ${BILLING_NOTE} (Creating a profile is free.)`,
      inputSchema: {
        raw_background: z.string().min(1).describe('Candidate background as free text'),
        label: z.string().optional().describe('Optional human label'),
        voice_sample: z.string().max(4000).optional().describe('Optional writing sample so cover letters match the voice'),
      },
    },
    async ({ raw_background, label, voice_sample }): Promise<ToolResult> => {
      try {
        return ok(await client.createProfile({ rawBackground: raw_background, label, voiceSample: voice_sample }));
      } catch (err) {
        return fail(err);
      }
    },
  );

  server.registerTool(
    'publish_profile',
    {
      title: 'Publish a candidate profile',
      annotations: {
        title: 'Publish a candidate profile',
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: false,
      },
      description:
        `Publish a profile to a stable public career endpoint (/p/<slug>); returns the URL. Never exposes email/phone/photo. ${BILLING_NOTE} (Free.)`,
      inputSchema: { id: z.string().min(1).describe('The profile id to publish') },
    },
    async ({ id }): Promise<ToolResult> => {
      try {
        return ok(await client.publishProfile(id));
      } catch (err) {
        return fail(err);
      }
    },
  );

  server.registerTool(
    'unpublish_profile',
    {
      title: 'Unpublish a candidate profile',
      annotations: {
        title: 'Unpublish a candidate profile',
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: false,
      },
      description: `Close a published profile's public endpoint (the slug is kept so republishing restores the same URL). ${BILLING_NOTE} (Free.)`,
      inputSchema: { id: z.string().min(1).describe('The profile id to unpublish') },
    },
    async ({ id }): Promise<ToolResult> => {
      try {
        return ok(await client.unpublishProfile(id));
      } catch (err) {
        return fail(err);
      }
    },
  );

  return server;
}

/** Build the server and serve it over stdio (the `vitex mcp` entrypoint). */
export async function runMcpServer(config: McpConfig): Promise<void> {
  const server = createServer(config);
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Keep the process alive until the stdio transport closes (the host, e.g.
  // Claude Desktop, ends stdin). Without this, runMcpServer would resolve right
  // after connect() and cli.ts would call process.exit(0), killing the server.
  await new Promise<void>((resolve) => {
    const prev = server.server.onclose;
    server.server.onclose = () => {
      prev?.();
      resolve();
    };
  });
}

/** Compact the final job to the fields an assistant needs (status + key result). */
function finalJob(job: JobRecord): Record<string, unknown> {
  if (job.status !== 'succeeded') {
    return { id: job.id, status: job.status, error: job.error };
  }
  const r = job.result ?? {};
  return {
    id: job.id,
    status: job.status,
    pdfUrl: job.pdfUrl,
    atsScore: r.atsScore,
    matchAnalysis: r.matchAnalysis,
    coverLetter: r.coverLetter,
    templateId: r.templateId,
    usage: r.usage,
  };
}
