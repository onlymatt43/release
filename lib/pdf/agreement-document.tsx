// The sealed document, rendered from nothing but the frozen contract and the
// parties' profiles as received. No field name, platform or brand lives here.

import { Document, Page, Text, View, Image as PdfImage, StyleSheet } from "@react-pdf/renderer";
import type { Agreement, Party } from "@/lib/agreements";
import type { ResolvedImage } from "./images";

export interface RenderedParty {
  party: Party;
  images: Map<string, ResolvedImage>; // keyed by image src
  signature: ResolvedImage | null;
}

export interface AgreementDocumentProps {
  agreement: Agreement;
  parties: RenderedParty[];
  brand: string | null;
  formatDateTime: (iso: string) => string;
}

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#111" },
  brand: { fontSize: 8, letterSpacing: 2, color: "#666", textTransform: "uppercase" },
  title: { fontSize: 18, fontFamily: "Helvetica-Bold", marginTop: 4 },
  header: { borderBottomWidth: 2, borderBottomColor: "#111", paddingBottom: 10, marginBottom: 16 },
  section: { marginBottom: 14 },
  sectionTitle: {
    fontSize: 8, fontFamily: "Helvetica-Bold", letterSpacing: 1.2, color: "#666",
    textTransform: "uppercase", borderBottomWidth: 1, borderBottomColor: "#ddd",
    paddingBottom: 3, marginBottom: 6,
  },
  partyTitle: { fontSize: 12, fontFamily: "Helvetica-Bold", marginBottom: 6 },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  field: { width: "50%", marginBottom: 6, paddingRight: 8 },
  fieldLabel: { fontSize: 7, color: "#888", marginBottom: 1 },
  fieldValue: { fontSize: 10 },
  paragraph: { fontSize: 9, lineHeight: 1.5, color: "#333", marginBottom: 5 },
  consent: { flexDirection: "row", marginBottom: 4 },
  box: {
    width: 10, height: 10, borderWidth: 1, borderColor: "#333", marginRight: 6,
    alignItems: "center", justifyContent: "center",
  },
  boxOn: { backgroundColor: "#111" },
  images: { flexDirection: "row", flexWrap: "wrap" },
  imageItem: { width: 150, marginRight: 12, marginBottom: 8 },
  image: { width: 150, borderWidth: 1, borderColor: "#ccc" },
  signature: { width: 200, maxHeight: 80, objectFit: "contain", borderWidth: 1, borderColor: "#ccc", padding: 4 },
  meta: { fontSize: 8, color: "#555", marginTop: 4 },
  footer: {
    position: "absolute", bottom: 24, left: 40, right: 40,
    flexDirection: "row", justifyContent: "space-between", fontSize: 7, color: "#999",
  },
});

function PartyBlock({ rendered, agreement, formatDateTime }: {
  rendered: RenderedParty;
  agreement: Agreement;
  formatDateTime: (iso: string) => string;
}) {
  const { party, images, signature } = rendered;
  const s = party.subject;
  const heading = [s.name, `@${s.handle}`].filter(Boolean).join("  ·  ");
  const accepted = new Set(party.consents);

  return (
    <View break>
      <Text style={styles.partyTitle}>{heading}</Text>

      {party.profile.sections.map((section, i) => (
        <View key={i} style={styles.section} wrap={false}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          {section.fields && section.fields.length > 0 && (
            <View style={styles.grid}>
              {section.fields.map((f, j) => (
                <View key={j} style={styles.field}>
                  <Text style={styles.fieldLabel}>{f.label}</Text>
                  <Text style={styles.fieldValue}>{f.value}</Text>
                </View>
              ))}
            </View>
          )}
          {section.images && section.images.length > 0 && (
            <View style={styles.images}>
              {section.images.map((img, j) => {
                const resolved = images.get(img.src);
                return (
                  <View key={j} style={styles.imageItem}>
                    {img.label ? <Text style={styles.fieldLabel}>{img.label}</Text> : null}
                    {resolved ? (
                      <PdfImage style={styles.image} src={{ data: resolved.data, format: resolved.format }} />
                    ) : (
                      <Text style={styles.meta}>Image unavailable</Text>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>
      ))}

      {agreement.contract.consents.length > 0 && (
        <View style={styles.section} wrap={false}>
          <Text style={styles.sectionTitle}>Consents</Text>
          {agreement.contract.consents.map((c) => (
            <View key={c.key} style={styles.consent}>
              <View style={[styles.box, ...(accepted.has(c.key) ? [styles.boxOn] : [])]} />
              <Text style={{ fontSize: 9, flex: 1 }}>{c.label}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.section} wrap={false}>
        <Text style={styles.sectionTitle}>Electronic acceptance</Text>
        {signature ? (
          <PdfImage style={styles.signature} src={{ data: signature.data, format: signature.format }} />
        ) : null}
        <Text style={styles.meta}>Accepted on {formatDateTime(party.acceptedAt)}</Text>
        {party.ipAddress ? <Text style={styles.meta}>IP {party.ipAddress}</Text> : null}
        {party.userAgent ? <Text style={styles.meta}>{party.userAgent}</Text> : null}
      </View>
    </View>
  );
}

export function AgreementDocument({ agreement, parties, brand, formatDateTime }: AgreementDocumentProps) {
  const handles = parties.map((p) => `@${p.party.subject.handle}`).join(" · ");
  return (
    <Document title={agreement.contract.title} author={brand ?? undefined}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          {brand ? <Text style={styles.brand}>{brand}</Text> : null}
          <Text style={styles.title}>{agreement.contract.title}</Text>
          {agreement.title ? <Text style={styles.meta}>{agreement.title}</Text> : null}
          <Text style={styles.meta}>Parties: {handles}</Text>
          {agreement.sealedAt ? <Text style={styles.meta}>Sealed on {formatDateTime(agreement.sealedAt)}</Text> : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contract</Text>
          {agreement.contract.paragraphs.map((p, i) => (
            <Text key={i} style={styles.paragraph}>{p}</Text>
          ))}
        </View>

        {parties.map((rp) => (
          <PartyBlock key={rp.party.subject.id} rendered={rp} agreement={agreement} formatDateTime={formatDateTime} />
        ))}

        <View style={styles.footer} fixed>
          <Text>{agreement.contract.title}</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
