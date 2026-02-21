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
  console.log("Created credit_transactions table");

  console.log("Migration complete!");
}

migrate().catch(console.error);
