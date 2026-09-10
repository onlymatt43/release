import { S3Client } from "@aws-sdk/client-s3";

// Client instancié à la demande (évite les throws au build Vercel)
let _client: S3Client | null = null;

export function getR2Client(): S3Client {
  if (_client) return _client;

  const endpoint = process.env.R2_ENDPOINT;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!endpoint)        throw new Error("Missing env variable: R2_ENDPOINT");
  if (!accessKeyId)     throw new Error("Missing env variable: R2_ACCESS_KEY_ID");
  if (!secretAccessKey) throw new Error("Missing env variable: R2_SECRET_ACCESS_KEY");

  _client = new S3Client({
    region: "auto",
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
  });

  return _client;
}

// Read lazily, at call time, so an unconfigured bucket fails only when a
// route actually needs R2 — not at build or module-import time.
export function getR2Bucket(): string {
  const bucket = process.env.R2_BUCKET_NAME;
  if (!bucket) throw new Error("Missing env variable: R2_BUCKET_NAME");
  return bucket;
}
