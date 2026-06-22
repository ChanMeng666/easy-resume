/**
 * Cloudflare R2 implementation of the BlobStore seam.
 *
 * R2 speaks the S3 API, so we use @aws-sdk/client-s3 pointed at the R2 endpoint
 * (`https://<account>.r2.cloudflarestorage.com`, region "auto"). The SDK is
 * imported dynamically inside each method so the (large) S3 client is only
 * loaded when R2 is actually configured — keeping cold start, tests, and the
 * client bundle lean. All operations are best-effort: failures are logged and
 * swallowed (put → false, get → null) so storage can never break generation.
 */

import 'server-only';
import type { BlobStore } from './blobStore';
import { createLogger } from '@/server/log/logger';

const log = createLogger({ component: 'r2' });

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
}

/** Build an R2-backed BlobStore. The S3 client is created lazily on first use. */
export function createR2Store(cfg: R2Config): BlobStore {
  // Typed loosely to avoid a static import of the SDK types at module load.
  let clientPromise: Promise<unknown> | undefined;

  async function client(): Promise<{ send: (cmd: unknown) => Promise<unknown> }> {
    if (!clientPromise) {
      clientPromise = import('@aws-sdk/client-s3').then(
        ({ S3Client }) =>
          new S3Client({
            region: 'auto',
            endpoint: `https://${cfg.accountId}.r2.cloudflarestorage.com`,
            credentials: {
              accessKeyId: cfg.accessKeyId,
              secretAccessKey: cfg.secretAccessKey,
            },
          })
      );
    }
    return clientPromise as Promise<{ send: (cmd: unknown) => Promise<unknown> }>;
  }

  return {
    enabled: true,

    async put(key, bytes, contentType) {
      try {
        const { PutObjectCommand } = await import('@aws-sdk/client-s3');
        const c = await client();
        await c.send(
          new PutObjectCommand({
            Bucket: cfg.bucket,
            Key: key,
            Body: bytes,
            ContentType: contentType,
          })
        );
        return true;
      } catch (err) {
        log.warn('r2.put.failed', { key }, err);
        return false;
      }
    },

    async get(key) {
      try {
        const { GetObjectCommand } = await import('@aws-sdk/client-s3');
        const c = await client();
        const res = (await c.send(
          new GetObjectCommand({ Bucket: cfg.bucket, Key: key })
        )) as { Body?: { transformToByteArray: () => Promise<Uint8Array> } };
        if (!res.Body) return null;
        return await res.Body.transformToByteArray();
      } catch (err) {
        // A missing object is expected (recompile fallback) — don't log it loud.
        const name = (err as { name?: string })?.name;
        if (name === 'NoSuchKey' || name === 'NotFound') return null;
        log.warn('r2.get.failed', { key }, err);
        return null;
      }
    },
  };
}
