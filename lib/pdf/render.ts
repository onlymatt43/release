import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { createElement, type ReactElement } from "react";
import type { Agreement } from "@/lib/agreements";
import { siteBrandName, siteLocale, siteTimeZone } from "@/lib/site-config";
import { AgreementDocument, type RenderedParty } from "./agreement-document";
import { resolveImage, type ResolvedImage } from "./images";

export async function renderAgreementPdf(agreement: Agreement): Promise<Buffer> {
  const locale = siteLocale() ?? undefined;
  const timeZone = siteTimeZone() ?? undefined;
  const formatDateTime = (iso: string) => new Date(iso).toLocaleString(locale, { timeZone });

  const parties: RenderedParty[] = await Promise.all(
    agreement.parties.map(async (party) => {
      const srcs = party.profile.sections.flatMap((s) => (s.images ?? []).map((i) => i.src));
      const resolved = await Promise.all(srcs.map((src) => resolveImage(src)));
      const images = new Map<string, ResolvedImage>();
      srcs.forEach((src, i) => {
        const r = resolved[i];
        if (r) images.set(src, r);
      });
      const signature = party.profile.signature ? await resolveImage(party.profile.signature.src) : null;
      return { party, images, signature };
    })
  );

  const element = createElement(AgreementDocument, {
    agreement,
    parties,
    brand: siteBrandName(),
    formatDateTime,
  });
  return renderToBuffer(element as unknown as ReactElement<DocumentProps>);
}
