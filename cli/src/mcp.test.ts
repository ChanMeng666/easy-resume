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
});
