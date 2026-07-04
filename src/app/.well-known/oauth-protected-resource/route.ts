/**
 * OAuth 2.0 Protected Resource Metadata (RFC 9728).
 *
 * MCP connectors that hit a 401 from `/api/mcp` follow the `WWW-Authenticate`
 * header's `resource_metadata` link to this document to discover which
 * Authorization Server issues tokens for us. We point them at PR1's AS (the same
 * origin), whose `issuer` matches this `authServerUrls` entry (RFC 8414).
 *
 * `protectedResourceHandler` / `metadataCorsOptionsRequestHandler` come from
 * `mcp-handler`; the payload is public, non-secret metadata served with
 * permissive CORS so a browser-based client can read it cross-origin.
 */

import { protectedResourceHandler, metadataCorsOptionsRequestHandler } from 'mcp-handler';
import { getBaseUrl } from '@/server/oauth/config';

export const runtime = 'nodejs';

export const GET = protectedResourceHandler({ authServerUrls: [getBaseUrl()] });

export const OPTIONS = metadataCorsOptionsRequestHandler();
