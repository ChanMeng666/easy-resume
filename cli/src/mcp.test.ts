import { describe, it, expect } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from './mcp.js';

/** Connect an in-memory MCP client to the Vitex server and return its tool list. */
async function listTools() {
  const server = createServer({ baseUrl: 'https://api.test', apiKey: 'vitex_p_secret' });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'test', version: '0.0.0' });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  const { tools } = await client.listTools();
  await client.close();
  return tools;
}

describe('vitex mcp server', () => {
  it('registers the get_account tool alongside the existing tools', async () => {
    const names = (await listTools()).map((t) => t.name);
    expect(names).toContain('get_account');
    // The pre-existing tools remain registered.
    expect(names).toEqual(
      expect.arrayContaining([
        'generate_resume',
        'refine_resume',
        'get_resume',
        'download_pdf',
        'list_profiles',
        'create_profile',
        'publish_profile',
        'unpublish_profile',
      ]),
    );
  });

  it('describes get_account as read-only with the billing rule', async () => {
    const tool = (await listTools()).find((t) => t.name === 'get_account');
    expect(tool).toBeDefined();
    expect(tool!.description).toMatch(/never spends credits/i);
    expect(tool!.description).toMatch(/1 credit/i);
  });

  it('annotates every tool with a title and the correct read-only hint', async () => {
    const READ_ONLY = new Set(['get_account', 'get_resume', 'download_pdf', 'list_profiles']);
    const WRITE = new Set([
      'generate_resume',
      'refine_resume',
      'create_profile',
      'publish_profile',
      'unpublish_profile',
    ]);
    for (const tool of await listTools()) {
      const ann = tool.annotations;
      expect(ann, `${tool.name} is missing annotations`).toBeDefined();
      // Every tool carries a human-readable title and acts only on Vitex's own
      // backend (never an open world) and never deletes data.
      expect(typeof ann!.title).toBe('string');
      expect(ann!.title!.length).toBeGreaterThan(0);
      expect(ann!.openWorldHint).toBe(false);
      expect(ann!.destructiveHint).toBe(false);
      if (READ_ONLY.has(tool.name)) expect(ann!.readOnlyHint).toBe(true);
      if (WRITE.has(tool.name)) expect(ann!.readOnlyHint).toBe(false);
    }
  });
});
