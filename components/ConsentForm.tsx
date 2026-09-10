"use client";

import { useState, useCallback, useId } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import FileUploadZone from "@/components/FileUploadZone";

const AddressAutocomplete = dynamic(() => import("@/components/AddressAutocomplete"), {
  ssr: false,
  loading: () => (
    <input
      type="text"
      disabled
      placeholder="123 Rue Exemple, Montréal, QC H1A 1A1"
      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm opacity-50"
    />
  ),
});

const SignaturePad = dynamic(() => import("@/components/SignaturePad"), {
  ssr: false,
  loading: () => (
    <div className="h-40 w-full animate-pulse rounded-md bg-muted" />
  ),
});

interface FormState {
  legalName: string;
  stageName: string;
  mainUrl: string;
  category: string;
  birthDate: string;
  email: string;
  phone: string;
  address: string;
  signatureData: string;
  rectoIdKey: string;
  versoIdKey: string;
  selfieKey: string;
  consentRecording: boolean;
  consentPublication: boolean;
  consentAdult: boolean;
}

interface ConsentFormProps {
  shootId: string;
  shootTitle?: string;
  shootDate?: string;
  shootCategory?: string;
  platformExamples?: string[];
}

function getEighteenYearsAgo(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 18);
  return d.toISOString().split("T")[0];
}

export default function ConsentForm({ shootId, shootTitle, shootDate, shootCategory, platformExamples }: ConsentFormProps) {
  const uid = useId();

  const [docType, setDocType] = useState("");

  const [form, setForm] = useState<FormState>({
    legalName: "",
    stageName: "",
    mainUrl: "",
    category: shootCategory ?? "",
    birthDate: "",
    email: "",
    phone: "",
    address: "",
    signatureData: "",
    rectoIdKey: "",
    versoIdKey: "",
    selfieKey: "",
    consentRecording: false,
    consentPublication: false,
    consentAdult: false,
  });

  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [participationId, setParticipationId] = useState<string | null>(null);

  const contractId = `${shootId}-${uid.replace(/:/g, "")}`;

  const set = useCallback(
    <K extends keyof FormState>(key: K, value: FormState[K]) =>
      setForm((prev) => ({ ...prev, [key]: value })),
    []
  );

  const isReady =
    form.legalName.trim().length >= 2 &&
    form.stageName.trim().length >= 2 &&
    form.mainUrl.trim().length >= 5 &&
    form.birthDate !== "" &&
    docType !== "" &&
    form.email.includes("@") &&
    form.address.trim().length >= 5 &&
    form.signatureData !== "" &&
    form.rectoIdKey !== "" &&
    form.versoIdKey !== "" &&
    form.selfieKey !== "" &&
    form.consentRecording &&
    form.consentPublication &&
    form.consentAdult;

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!isReady || status === "submitting") return;

      setStatus("submitting");
      setErrorMsg(null);

      try {
        const res = await fetch("/api/consent/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ shootId, docType, ...form }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail ? `${data.error}: ${data.detail}` : (data.error ?? "Unknown error"));
        if (data.participationId) setParticipationId(data.participationId);
        setStatus("success");
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : "Network error");
        setStatus("error");
      }
    },
    [form, isReady, shootId, status]
  );

  if (status === "success") {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle className="text-green-600">Consent recorded ✓</CardTitle>
            <CardDescription>
              Thank you {form.legalName.split(" ")[0]}. Your form has been successfully submitted.
            </CardDescription>
          </CardHeader>
          {participationId && (
            <CardContent>
              <a
                href={`/signed/${participationId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-medium transition-colors"
              >
                📄 View / print your document
              </a>
            </CardContent>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Model Release Form</CardTitle>
          {shootTitle && (
            <div className="mt-1 rounded-md bg-muted px-3 py-2 text-sm">
              <span className="font-medium">{shootTitle}</span>
            </div>
          )}
          <CardDescription>
            All fields marked * are required. Your documents are encrypted
            and stored securely.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>

            {/* ── Identité ── */}
            <section className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Identity
              </h2>

              <div className="flex flex-col gap-1">
                <Label htmlFor={`${uid}-legal`}>Legal name (ID document) *</Label>
                <Input
                  id={`${uid}-legal`}
                  type="text"
                  autoComplete="name"
                  placeholder="First LAST"
                  value={form.legalName}
                  onChange={(e) => set("legalName", e.target.value)}
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <Label htmlFor={`${uid}-stage`}>Stage name / Alias *</Label>
                <Input
                  id={`${uid}-stage`}
                  type="text"
                  placeholder="e.g. YourStageName"
                  value={form.stageName}
                  onChange={(e) => set("stageName", e.target.value)}
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <Label htmlFor={`${uid}-mainurl`}>Main profile / website *</Label>
                <Input
                  id={`${uid}-mainurl`}
                  type="url"
                  placeholder="https://your-platform.example/yourusername"
                  value={form.mainUrl}
                  onChange={(e) => set("mainUrl", e.target.value)}
                  required
                />
              </div>

              {shootCategory && (
                <div className="flex flex-col gap-1">
                  <Label>Shoot name / Category</Label>
                  <div className="flex h-9 items-center rounded-md border border-input bg-muted px-3 py-1 text-sm text-muted-foreground">
                    {shootCategory}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-1">
                <Label htmlFor={`${uid}-dob`}>Date of birth *</Label>
                <Input
                  id={`${uid}-dob`}
                  type="date"
                  autoComplete="bday"
                  max={getEighteenYearsAgo()}
                  value={form.birthDate}
                  onChange={(e) => set("birthDate", e.target.value)}
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <Label htmlFor={`${uid}-email`}>Email *</Label>
                <Input
                  id={`${uid}-email`}
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <Label htmlFor={`${uid}-phone`}>Phone</Label>
                <Input
                  id={`${uid}-phone`}
                  type="tel"
                  autoComplete="tel"
                  placeholder="+1 514 xxx xxxx"
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1">
                <Label htmlFor={`${uid}-address`}>Address *</Label>
                <AddressAutocomplete
                  id={`${uid}-address`}
                  value={form.address}
                  onChange={(v) => set("address", v)}
                  placeholder="123 Example St, Montreal, QC H1A 1A1"
                  required
                />
              </div>
            </section>

            {/* ── Pièce d'identité ── */}
            <section className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                ID Document
              </h2>

              <div className="flex flex-col gap-1">
                <Label htmlFor={`${uid}-doctype`}>Document type *</Label>
                <select
                  id={`${uid}-doctype`}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  required
                >
                  <option value="">Choose…</option>
                  <option value="passport">Passport</option>
                  <option value="drivers_license">Driver's license</option>
                  <option value="id_card">ID card</option>
                </select>
              </div>

              <FileUploadZone
                id={`${uid}-recto`}
                label="Front of ID document *"
                r2Key={`contracts/${contractId}/recto.jpg`}
                onUploaded={(k) => set("rectoIdKey", k)}
              />
              <FileUploadZone
                id={`${uid}-verso`}
                label="Back of ID document *"
                r2Key={`contracts/${contractId}/verso.jpg`}
                onUploaded={(k) => set("versoIdKey", k)}
              />
              <FileUploadZone
                id={`${uid}-selfie`}
                label="Selfie with ID document *"
                r2Key={`contracts/${contractId}/selfie.jpg`}
                onUploaded={(k) => set("selfieKey", k)}
              />
            </section>

            {/* ── Signature ── */}
            <section className="flex flex-col gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Signature *
              </h2>

              <div className="h-32 overflow-y-scroll rounded-md border border-input bg-muted/30 px-3 py-2 text-xs text-muted-foreground leading-relaxed">
                <p className="font-semibold mb-1">Image Rights Assignment Contract and Informed Consent</p>
                <p>By signing this form, the undersigned (hereinafter "the Model") irrevocably authorizes the photographer/producer (hereinafter "the Producer") and their successors, assignees, and licensees to use, reproduce, modify, distribute, publish, and license the photographic and audiovisual works created during the session covered by this document.</p>
                <p className="mt-2">This authorization specifically includes commercial exploitation and distribution on any digital content platform, social networks, or adult platforms{platformExamples ? ` (including but not limited to ${platformExamples.join(", ")})` : ""} as well as any other digital or physical medium, present or future, without geographical or temporal restriction. The Model acknowledges that this assignment is granted definitively and does not entitle them to any subsequent compensation, royalties, or approval rights over the use of the material.</p>
                <p className="mt-2 font-medium">The Model certifies under penalty of perjury that:</p>
                <ul className="mt-1 list-disc pl-4 space-y-1">
                  <li>They are at least 18 years of age at the date of the session and have full legal capacity.</li>
                  <li>The identification documents provided are authentic, valid, and accurately represent them.</li>
                  <li>They are acting freely, in an informed manner, without constraint, threat, or impairment by any substance.</li>
                  <li>They have read, understood, and accepted this contract in its entirety before affixing their electronic signature.</li>
                </ul>
                <p className="mt-2">In accordance with international legal requirements applicable to adult content production (notably standards such as 18 U.S.C. § 2257 and equivalent record-keeping laws), the identity information, signatures, and verification documents provided will be retained in a strictly confidential and secure manner for the minimum duration required by law.</p>
                <p className="mt-2">This authorization is final, irrevocable, exclusive, and transferable. The Model expressly waives any claim, lawsuit, or recourse related to the use, modification, or publication of the works within the scope provided herein.</p>
              </div>

              <SignaturePad
                onChange={(data) => set("signatureData", data)}
                onClear={() => set("signatureData", "")}
              />
            </section>

            {/* ── Consentements ── */}
            <section className="flex flex-col gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Consents *
              </h2>

              {(
                [
                  {
                    key: "consentRecording",
                    label: "I authorize the recording of my participation.",
                  },
                  {
                    key: "consentPublication",
                    label: `I authorize the publication of content on the specified platforms${platformExamples ? ` (${platformExamples.join(", ")}, etc.)` : ""}.`,
                  },
                  {
                    key: "consentAdult",
                    label: "I certify that I am of legal age (18+) and consent freely and without constraint.",
                  },
                ] as const
              ).map(({ key, label }) => (
                <label key={key} className="flex items-start gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 rounded border-input accent-primary"
                    checked={form[key]}
                    onChange={(e) => set(key, e.target.checked)}
                    required
                  />
                  <span>{label}</span>
                </label>
              ))}
            </section>

            {errorMsg && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {errorMsg}
              </p>
            )}

            <Button
              type="submit"
              disabled={!isReady || status === "submitting"}
              className="w-full"
            >
              {status === "submitting" ? "Submitting…" : "Submit consent"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
