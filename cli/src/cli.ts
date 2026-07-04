/**
 * vitex — a thin client over the hosted Vitex v1 HTTP API.
 *
 * Two entrypoints share one client core (client.ts): this token-cheap CLI for
 * terminals and coding agents, and `vitex mcp` (a stdio MCP server, mcp.ts) for
 * Claude Desktop / Claude Code / Cursor. It NEVER reimplements the pipeline: no
 * Typst, no LLM, no local compile — every command is a call to the hosted service.
 */

import { parseArgs } from 'node:util';
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { VitexClient, type JobRecord, type RefineScope } from './client.js';
import { readInput, readFeedback, UsageError } from './args.js';
import { emit, humanJobHandle, humanJobRecord, reportError } from './format.js';

const VERSION = '0.1.0';
const DEFAULT_API_URL = 'https://www.vitex.org.nz';

// Union of every flag across all commands. parseArgs (strict) rejects any flag
// outside this set with a usage error (exit 2); an unknown *command* is a valid
// positional and is rejected by the dispatch switch instead.
const OPTIONS = {
  json: { type: 'boolean' },
  'api-url': { type: 'string' },
  'api-key': { type: 'string' },
  help: { type: 'boolean', short: 'h' },
  version: { type: 'boolean' },
  jd: { type: 'string' },
  background: { type: 'string' },
  profile: { type: 'string' },
  template: { type: 'string' },
  wait: { type: 'boolean' },
  output: { type: 'string', short: 'o' },
  feedback: { type: 'string' },
  scope: { type: 'string' },
  label: { type: 'string' },
  voice: { type: 'string' },
} as const;

type Values = {
  json?: boolean;
  'api-url'?: string;
  'api-key'?: string;
  help?: boolean;
  version?: boolean;
  jd?: string;
  background?: string;
  profile?: string;
  template?: string;
  wait?: boolean;
  output?: string;
  feedback?: string;
  scope?: string;
  label?: string;
  voice?: string;
};

/** Parse argv, dispatch the command, and resolve to a process exit code. */
export async function run(argv: string[]): Promise<number> {
  let values: Values;
  let positionals: string[];
  try {
    const parsed = parseArgs({ args: argv, options: OPTIONS, allowPositionals: true, strict: true });
    values = parsed.values as Values;
    positionals = parsed.positionals as string[];
  } catch (err) {
    process.stderr.write(`error USAGE: ${(err as Error).message}\n`);
    process.stderr.write(`Run 'vitex --help' for usage.\n`);
    return 2;
  }

  const command = positionals[0];

  if (values.version && !command) {
    process.stdout.write(`${VERSION}\n`);
    return 0;
  }
  if (values.help || !command) {
    process.stdout.write(HELP);
    return 0;
  }

  try {
    switch (command) {
      case 'generate':
        return await cmdGenerate(values);
      case 'job':
        return await cmdJob(values, positionals[1]);
      case 'pdf':
        return await cmdPdf(values, positionals[1]);
      case 'refine':
        return await cmdRefine(values, positionals[1]);
      case 'profiles':
        return await cmdProfiles(values, positionals.slice(1));
      case 'whoami':
        return await cmdWhoami(values);
      case 'mcp': {
        // Lazy-load the MCP server (and its SDK) so the common CLI path stays light.
        const { runMcpServer } = await import('./mcp.js');
        await runMcpServer(resolveConfig(values));
        return 0;
      }
      default:
        process.stderr.write(`error USAGE: unknown command '${command}'\n`);
        process.stderr.write(`Run 'vitex --help' for usage.\n`);
        return 2;
    }
  } catch (err) {
    return reportError(err);
  }
}

// ---- Config resolution ----------------------------------------------------

interface Config {
  baseUrl: string;
  apiKey: string;
}

/**
 * Resolve the base URL and API key. The key is never echoed anywhere. A missing
 * key is a usage error (exit 2) raised BEFORE any network call.
 */
function resolveConfig(values: Values): Config {
  const baseUrl = values['api-url'] || process.env.VITEX_API_URL || DEFAULT_API_URL;
  const apiKey = values['api-key'] || process.env.VITEX_API_KEY;
  if (!apiKey) {
    throw new UsageError('no API key: set VITEX_API_KEY or pass --api-key <token>');
  }
  return { baseUrl, apiKey };
}

function makeClient(values: Values): VitexClient {
  return new VitexClient(resolveConfig(values));
}

// ---- Commands -------------------------------------------------------------

async function cmdGenerate(values: Values): Promise<number> {
  if (!values.jd) throw new UsageError('generate requires --jd <file|->');
  const jobDescription = readInput(values.jd).trim();
  if (!jobDescription) throw new UsageError('--jd is empty');

  let background: string | undefined;
  let profileId: string | undefined;
  if (values.profile) {
    profileId = values.profile;
  } else if (values.background) {
    background = readInput(values.background);
  } else {
    throw new UsageError('generate requires --background <file|-> or --profile <id>');
  }

  const client = makeClient(values);
  const handle = await client.createResume({
    jobDescription,
    background,
    profileId,
    templateId: values.template,
  });

  if (!values.wait) {
    emit(!!values.json, handle, humanJobHandle(handle));
    return 0;
  }
  return finishWaited(client, handle.id, values);
}

async function cmdRefine(values: Values, parentId?: string): Promise<number> {
  if (!parentId) throw new UsageError('refine requires a parent job id: vitex refine <id> --feedback ...');
  if (!values.feedback) throw new UsageError('refine requires --feedback <text|@file>');
  const feedback = readFeedback(values.feedback).trim();
  if (!feedback) throw new UsageError('--feedback is empty');
  const scope = parseScope(values.scope);

  const client = makeClient(values);
  const handle = await client.refine(parentId, feedback, scope);

  if (!values.wait) {
    emit(!!values.json, handle, humanJobHandle(handle));
    return 0;
  }
  return finishWaited(client, handle.id, values);
}

async function cmdJob(values: Values, id?: string): Promise<number> {
  if (!id) throw new UsageError('job requires a job id: vitex job <id>');
  const client = makeClient(values);
  const job = await client.getJob(id);
  emit(!!values.json, job, humanJobRecord(job));
  return 0;
}

async function cmdPdf(values: Values, id?: string): Promise<number> {
  if (!id) throw new UsageError('pdf requires a job id: vitex pdf <id> [-o out.pdf]');
  const out = values.output || `${id}.pdf`;
  const client = makeClient(values);
  const pdf = await client.getPdf(id);
  writeFileSync(out, pdf);
  emit(!!values.json, { id, path: out, bytes: pdf.length }, `saved ${out} (${pdf.length} bytes)`);
  return 0;
}

async function cmdProfiles(values: Values, rest: string[]): Promise<number> {
  const sub = rest[0];
  const json = !!values.json;
  const client = makeClient(values);
  switch (sub) {
    case 'list': {
      const res = await client.listProfiles();
      emit(json, res, `${res.items.length} profile(s)`);
      return 0;
    }
    case 'get': {
      const id = requireId(rest[1], 'profiles get <id>');
      const p = await client.getProfile(id);
      emit(json, p, `profile ${p.id} — ${p.label ?? '(no label)'}`);
      return 0;
    }
    case 'create': {
      if (!values.background) throw new UsageError('profiles create requires --background <file|->');
      const rawBackground = readInput(values.background).trim();
      if (!rawBackground) throw new UsageError('--background is empty');
      const voiceSample = values.voice ? readInput(values.voice) : undefined;
      const p = await client.createProfile({ rawBackground, label: values.label, voiceSample });
      emit(json, p, `created profile ${p.id}`);
      return 0;
    }
    case 'update': {
      const id = requireId(rest[1], 'profiles update <id>');
      const rawBackground = values.background ? readInput(values.background) : undefined;
      const voiceSample = values.voice ? readInput(values.voice) : undefined;
      if (rawBackground === undefined && voiceSample === undefined && values.label === undefined) {
        throw new UsageError('profiles update needs at least one of --background / --label / --voice');
      }
      const p = await client.updateProfile(id, { rawBackground, label: values.label, voiceSample });
      emit(json, p, `updated profile ${p.id}`);
      return 0;
    }
    case 'delete': {
      const id = requireId(rest[1], 'profiles delete <id>');
      const res = await client.deleteProfile(id);
      emit(json, res, `deleted profile ${id}`);
      return 0;
    }
    case 'publish': {
      const id = requireId(rest[1], 'profiles publish <id>');
      const res = await client.publishProfile(id);
      emit(json, res, `published ${id} → ${res.url}`);
      return 0;
    }
    case 'unpublish': {
      const id = requireId(rest[1], 'profiles unpublish <id>');
      const res = await client.unpublishProfile(id);
      emit(json, res, `unpublished ${id}`);
      return 0;
    }
    default:
      throw new UsageError(
        "profiles needs a subcommand: list | get | create | update | delete | publish | unpublish",
      );
  }
}

async function cmdWhoami(values: Values): Promise<number> {
  const config = resolveConfig(values);
  const client = new VitexClient(config);
  // No dedicated identity endpoint yet; probe an owner-scoped read. Success means
  // the key authenticates; a failure surfaces the standard envelope via reportError.
  const res = await client.listProfiles();
  emit(!!values.json, { ok: true, apiUrl: config.baseUrl, profiles: res.items.length },
    `ok — authenticated against ${config.baseUrl} (${res.items.length} profile(s))`);
  return 0;
}

// ---- Shared helpers -------------------------------------------------------

/** Poll a created job to a terminal state, optionally download its PDF with -o. */
async function finishWaited(client: VitexClient, id: string, values: Values): Promise<number> {
  const job = await client.pollJob(id);
  let downloaded: string | undefined;
  if (job.status === 'succeeded' && values.output) {
    const pdf = await client.getPdf(job.id);
    writeFileSync(values.output, pdf);
    downloaded = values.output;
  }
  const human = downloaded ? `${humanJobRecord(job)} — saved ${downloaded}` : humanJobRecord(job);
  emit(!!values.json, job, human);
  return job.status === 'failed' ? 3 : 0;
}

function parseScope(value: string | undefined): RefineScope | undefined {
  if (value === undefined) return undefined;
  if (value === 'resume' || value === 'cover_letter' || value === 'both') return value;
  throw new UsageError(`--scope must be one of: resume | cover_letter | both (got '${value}')`);
}

function requireId(id: string | undefined, usage: string): string {
  if (!id) throw new UsageError(`missing id: vitex ${usage}`);
  return id;
}

const HELP = `vitex — thin client for the hosted Vitex resume API (${VERSION})

Vitex compiles a tailored, ATS-optimized resume PDF + cover letter from a job
description plus your background. "The API is the UI": this CLI is a thin wrapper
over the hosted v1 HTTP API — no local pipeline, no Typst, no LLM.

USAGE
  vitex <command> [options]

COMMANDS
  generate   Create a resume from a job description + background (async job)
  job        Poll a job by id
  pdf        Download a succeeded job's compiled PDF
  refine     Refine a succeeded resume with natural-language feedback (free)
  profiles   Manage reusable candidate backgrounds (list/get/create/update/
             delete/publish/unpublish)
  whoami     Verify your API key authenticates (probes GET /api/profiles; a
             dedicated identity endpoint is a future addition)
  mcp        Run a stdio MCP server for Claude Desktop / Claude Code / Cursor

GLOBAL OPTIONS
  --json               Print raw JSON instead of a terse human line
  --api-url <url>      Base URL (default ${DEFAULT_API_URL}; or env VITEX_API_URL)
  --api-key <token>    API key (default env VITEX_API_KEY); never echoed
  -h, --help           Show this help
  --version            Print the version

GENERATE
  vitex generate --jd <file|-> (--background <file|-> | --profile <id>)
                 [--template <id>] [--wait] [-o out.pdf]
  Creates a job and prints its id. With --wait it polls to completion; add
  -o to also download the PDF once succeeded.

REFINE
  vitex refine <id> --feedback <text|@file> [--scope resume|cover_letter|both]
               [--wait] [-o out.pdf]
  Builds on a succeeded job's artifacts. scope defaults to 'resume'.

PROFILES
  vitex profiles list
  vitex profiles get <id>
  vitex profiles create --background <file|-> [--label <text>] [--voice <file|->]
  vitex profiles update <id> [--background <file|->] [--label <text>] [--voice <file|->]
  vitex profiles delete <id>
  vitex profiles publish <id>       # → public /p/<slug> career endpoint
  vitex profiles unpublish <id>

INPUT
  A '-' argument reads stdin; --feedback also accepts '@file' to read a file.

AUTH
  Mint a key once, signed in to the web app (POST /api/keys is cookie-only; the
  raw token is shown once). Then export VITEX_API_KEY, or pass --api-key.

BILLING (outcome-based)
  You are charged 1 credit ONLY when a job produces a compiled PDF (status
  succeeded). Validation errors, LLM-step failures, and compilation failures are
  FREE. Refinements are FREE. New accounts start with 3 free credits.

ASYNC JOB MODEL
  generate and refine return a job id immediately (status queued). Poll it with
  'vitex job <id>' until succeeded|failed, then 'vitex pdf <id>'. Or pass --wait
  to do the polling for you.

EXIT CODES
  0 ok · 2 usage error · 3 API error · 4 poll timeout · 1 unexpected

EXAMPLES
  vitex generate --jd jd.txt --background bg.txt --wait -o resume.pdf
  echo "Senior Go engineer ..." | vitex generate --jd - --profile <id> --json
  vitex refine <id> --feedback "Lead with the payments impact." --wait -o v2.pdf
  vitex profiles create --background bg.txt --label "My Background"

MCP (Claude Desktop / Claude Code / Cursor)
  Add to your MCP config, then the assistant can generate/refine/download:
    { "command": "npx", "args": ["-y", "vitex-cli", "mcp"],
      "env": { "VITEX_API_KEY": "vitex_xxx_yyy" } }
`;

// Execute only when run as the CLI binary (not when imported by tests).
const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (import.meta.url === invokedPath) {
  run(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (err) => {
      process.stderr.write(`error UNEXPECTED: ${err instanceof Error ? err.message : String(err)}\n`);
      process.exit(1);
    },
  );
}
