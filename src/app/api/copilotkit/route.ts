import {
  CopilotRuntime,
  OpenAIAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime";
import { NextRequest } from "next/server";

/**
 * CopilotKit runtime endpoint.
 * Handles AI interactions for the resume builder using OpenAI GPT-4o.
 */

// Initialize OpenAI adapter with GPT-4o model
const serviceAdapter = new OpenAIAdapter({
  model: "gpt-4o",
});

// Create CopilotKit runtime
const runtime = new CopilotRuntime();

/**
 * POST handler for CopilotKit requests.
 * Processes AI chat messages and tool calls.
 */
export const POST = async (req: NextRequest) => {
  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    serviceAdapter,
    endpoint: "/api/copilotkit",
  });

  return handleRequest(req);
};
