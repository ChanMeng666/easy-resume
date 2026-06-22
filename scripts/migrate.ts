import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

/**
 * Migration script to add new tables for the AI Career Agent system.
 * Renames copilot tables to agent tables and adds career agent tables.
 */
async function migrate() {
  const sql = neon(process.env.DATABASE_URL!);

  console.log("Starting migration...");

  // Rename copilot tables to agent tables
  await sql`ALTER TABLE IF EXISTS copilot_messages RENAME TO agent_messages`;
  console.log("Renamed copilot_messages -> agent_messages");

  await sql`ALTER TABLE IF EXISTS copilot_threads RENAME TO agent_threads`;
  console.log("Renamed copilot_threads -> agent_threads");

  // Drop old columns from agent_threads that are no longer needed
  await sql`ALTER TABLE agent_threads DROP COLUMN IF EXISTS agent_state`;
  await sql`ALTER TABLE agent_threads DROP COLUMN IF EXISTS last_agent_id`;
  console.log("Cleaned up agent_threads columns");

  // Drop old columns from agent_messages
  await sql`ALTER TABLE agent_messages DROP COLUMN IF EXISTS agent_id`;
  console.log("Cleaned up agent_messages columns");

  // Create job_descriptions table
  await sql`
    CREATE TABLE IF NOT EXISTS job_descriptions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL,
      raw_text TEXT NOT NULL,
      source_url TEXT,
      parsed JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_jd_user_id ON job_descriptions(user_id)`;
  console.log("Created job_descriptions table");

  // Create tailored_resumes table
  await sql`
    CREATE TABLE IF NOT EXISTS tailored_resumes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL,
      base_resume_id UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
      job_description_id UUID NOT NULL REFERENCES job_descriptions(id) ON DELETE CASCADE,
      data JSONB NOT NULL,
      template_id VARCHAR(50) NOT NULL DEFAULT 'two-column',
      match_score REAL,
      match_analysis JSONB,
      cover_letter TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_tailored_user_id ON tailored_resumes(user_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_tailored_base_resume ON tailored_resumes(base_resume_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_tailored_jd ON tailored_resumes(job_description_id)`;
  console.log("Created tailored_resumes table");

  // Create applications table
  await sql`
    CREATE TABLE IF NOT EXISTS applications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL,
      job_description_id UUID REFERENCES job_descriptions(id) ON DELETE SET NULL,
      tailored_resume_id UUID REFERENCES tailored_resumes(id) ON DELETE SET NULL,
      company VARCHAR(255) NOT NULL,
      position VARCHAR(255) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'draft',
      applied_at TIMESTAMPTZ,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_applications_user_id ON applications(user_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(user_id, status)`;
  console.log("Created applications table");

  // Create credits table
  await sql`
    CREATE TABLE IF NOT EXISTS credits (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL UNIQUE,
      balance INTEGER NOT NULL DEFAULT 3,
      subscription_tier VARCHAR(20) DEFAULT 'free',
      stripe_customer_id VARCHAR(255),
      stripe_subscription_id VARCHAR(255),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_credits_user_id ON credits(user_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_credits_stripe_customer ON credits(stripe_customer_id)`;
  console.log("Created credits table");

  // Create credit_transactions table
  await sql`
    CREATE TABLE IF NOT EXISTS credit_transactions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL,
      type VARCHAR(20) NOT NULL,
      amount INTEGER NOT NULL,
      description TEXT,
      reference_type VARCHAR(50),
      reference_id UUID,
      stripe_payment_id VARCHAR(255),
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_credit_tx_user_id ON credit_transactions(user_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_credit_tx_type ON credit_transactions(user_id, type)`;
  // Backs idempotent outcome-based billing (creditService.useCreditsIdempotent).
  await sql`CREATE INDEX IF NOT EXISTS idx_credit_tx_reference ON credit_transactions(reference_id)`;
  // Enforce idempotent billing at the DB level: at most one usage txn per
  // reference_id. Partial (WHERE type='usage') so purchase/signup_bonus rows
  // with NULL reference_id are unaffected. Dedupe any pre-existing duplicate
  // usage rows first (keep the earliest) so the unique index can be created.
  await sql`
    DELETE FROM credit_transactions a
    USING credit_transactions b
    WHERE a.type = 'usage'
      AND b.type = 'usage'
      AND a.reference_id = b.reference_id
      AND a.reference_id IS NOT NULL
      AND (a.created_at > b.created_at
           OR (a.created_at = b.created_at AND a.id > b.id))
  `;
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS uk_credit_tx_reference_usage
    ON credit_transactions(reference_id) WHERE type = 'usage'
  `;
  console.log("Created credit_transactions table");

  // Create api_keys table (agent/server-to-server access — "API is the UI")
  await sql`
    CREATE TABLE IF NOT EXISTS api_keys (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL,
      name VARCHAR(120) NOT NULL DEFAULT 'default',
      prefix VARCHAR(16) NOT NULL,
      key_hash TEXT NOT NULL,
      last_used_at TIMESTAMPTZ,
      revoked_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(prefix)`;
  console.log("Created api_keys table");

  // Create generation_jobs table (async public v1 API jobs, run in-process)
  await sql`
    CREATE TABLE IF NOT EXISTS generation_jobs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'queued',
      input JSONB NOT NULL,
      result JSONB,
      error JSONB,
      pdf_url TEXT,
      charged BOOLEAN NOT NULL DEFAULT FALSE,
      idempotency_key UUID NOT NULL UNIQUE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_generation_jobs_user_id ON generation_jobs(user_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_generation_jobs_status ON generation_jobs(status)`;
  // Human-friendly label surfaced in the "My Resumes" history list (derived at persist time).
  await sql`ALTER TABLE generation_jobs ADD COLUMN IF NOT EXISTS title TEXT`;
  // Composite index backs the per-user, newest-first history listing.
  await sql`CREATE INDEX IF NOT EXISTS idx_generation_jobs_user_created ON generation_jobs(user_id, created_at DESC)`;
  console.log("Created generation_jobs table");

  // Create rate_limits table (Postgres-backed fixed-window rate limiting)
  await sql`
    CREATE TABLE IF NOT EXISTS rate_limits (
      bucket_key VARCHAR(255) PRIMARY KEY,
      count INTEGER NOT NULL DEFAULT 0,
      expires_at TIMESTAMPTZ NOT NULL
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_rate_limits_expires ON rate_limits(expires_at)`;
  console.log("Created rate_limits table");

  // Create stripe_events table (webhook idempotency — dedupe by Stripe event id)
  await sql`
    CREATE TABLE IF NOT EXISTS stripe_events (
      id VARCHAR(255) PRIMARY KEY,
      type VARCHAR(100),
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  console.log("Created stripe_events table");

  console.log("Migration complete!");
}

migrate().catch(console.error);
