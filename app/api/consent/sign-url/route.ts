import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getR2Client, getR2Bucket } from "@/lib/r2";

const ALLOWED_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

const PRESIGNED_URL_TTL_SECONDS = 300; // 5 minutes

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch (err) {
    console.error("[sign-url] Invalid JSON:", err);
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { key, contentType } = body as Record<string, unknown>;

  if (typeof key !== "string" || !key.startsWith("contracts/")) {
    console.error("[sign-url] Invalid key:", key);
    return NextResponse.json(
      { error: "Invalid or unauthorized key" },
      { status: 400 }
    );
  }

  if (typeof contentType !== "string" || !ALLOWED_CONTENT_TYPES.has(contentType)) {
    console.error("[sign-url] Invalid content type:", contentType);
    return NextResponse.json(
      { error: "Unsupported content type" },
      { status: 415 }
    );
  }

  try {
    const command = new PutObjectCommand({
      Bucket: getR2Bucket(),
      Key: key,
      ContentType: contentType,
    });

    const url = await getSignedUrl(getR2Client(), command, {
      expiresIn: PRESIGNED_URL_TTL_SECONDS,
    });

    console.log("[sign-url] Generated URL for:", key, "type:", contentType);
    return NextResponse.json({ url });
  } catch (err) {
    console.error("[sign-url] Error generating presigned URL:", err);
    return NextResponse.json(
      { error: "Could not generate upload URL" },
      { status: 500 }
    );
  }
}
