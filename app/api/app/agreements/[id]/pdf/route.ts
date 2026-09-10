// Deliver the sealed document to one of its parties. Once every party has
// downloaded, the agreement is deleted after this response is sent.

import { NextResponse, type NextRequest } from "next/server";
import { after } from "next/server";
import { getAgreement, partyOf, markDownloaded, everyoneDownloaded, deleteAgreement } from "@/lib/agreements";
import { renderAgreementPdf } from "@/lib/pdf/render";
import { requireSession } from "@/lib/app-request";

export const maxDuration = 60;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const { id } = await params;
  const agreement = await getAgreement(id);
  if (!agreement || !partyOf(agreement, session)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (agreement.status !== "sealed") return NextResponse.json({ error: "Not sealed yet" }, { status: 409 });

  let pdf: Buffer;
  try {
    pdf = await renderAgreementPdf(agreement);
  } catch (err) {
    console.error("[agreements pdf]", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Could not render the document" }, { status: 500 });
  }

  after(async () => {
    try {
      await markDownloaded(agreement.id, session.id);
      if (await everyoneDownloaded(agreement.id)) await deleteAgreement(agreement.id);
    } catch (err) {
      console.error("[agreements pdf cleanup]", err instanceof Error ? err.message : err);
    }
  });

  const handles = agreement.parties.map((p) => p.subject.handle).join("-");
  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${agreement.id.slice(0, 8)}-${handles}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
