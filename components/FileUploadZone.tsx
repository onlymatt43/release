"use client";

import { useRef, useState, useCallback } from "react";
import type { ReactElement } from "react";
import imageCompression from "browser-image-compression";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

const COMPRESSION_OPTIONS = {
  maxSizeMB: 0.95,          // < 1 Mo
  maxWidthOrHeight: 1920,
  useWebWorker: true,
  fileType: "image/jpeg",
} as const;

type UploadStatus = "idle" | "compressing" | "uploading" | "done" | "error";

interface FileUploadZoneProps {
  /** Identifiant de l'input (pour le label). */
  id: string;
  /** Libellé affiché à l'utilisateur. */
  label: string;
  /** Clé R2 de destination, ex: "contracts/abc123/id_front". */
  r2Key: string;
  /** Appelé avec la clé R2 finale une fois l'upload terminé. */
  onUploaded: (r2Key: string) => void;
}

export default function FileUploadZone({
  id,
  label,
  r2Key,
  onUploaded,
}: FileUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const handleChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setError(null);
      setStatus("compressing");

      let compressed: File;
      try {
        compressed = await imageCompression(file, COMPRESSION_OPTIONS);
      } catch (err) {
        setStatus("error");
        setError("Error compressing image.");
        console.error("[FileUpload] Compression error:", err);
        return;
      }

      // Force JPEG content type after compression
      const contentType = "image/jpeg";

      // Aperçu local
      setPreview(URL.createObjectURL(compressed));

      setStatus("uploading");

      // 1. Demander une URL présignée au serveur
      let presignedUrl: string;
      try {
        const res = await fetch("/api/consent/sign-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: r2Key, contentType }),
        });
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          console.error("[FileUpload] sign-url failed:", res.status, errorData);
          throw new Error(`sign-url: ${res.status}`);
        }
        const data = (await res.json()) as { url: string };
        presignedUrl = data.url;
      } catch (err) {
        setStatus("error");
        setError("Unable to obtain upload URL. Please try again.");
        console.error("[FileUpload] Presigned URL error:", err);
        return;
      }

      // 2. PUT direct du fichier compressé vers R2 via l'URL présignée
      try {
        const upload = await fetch(presignedUrl, {
          method: "PUT",
          headers: { "Content-Type": contentType },
          body: compressed,
        });
        if (!upload.ok) {
          const errorText = await upload.text().catch(() => "");
          console.error("[FileUpload] R2 PUT failed:", upload.status, errorText);
          throw new Error(`R2 PUT: ${upload.status}`);
        }
      } catch (err) {
        setStatus("error");
        setError("Upload error. Check your connection.");
        console.error("[FileUpload] Upload error:", err);
        return;
      }

      setStatus("done");
      onUploaded(r2Key);
    },
    [r2Key, onUploaded]
  );

  const statusBadge: Record<UploadStatus, ReactElement> = {
    idle:        <Badge variant="secondary">Pending</Badge>,
    compressing: <Badge variant="secondary">Compressing…</Badge>,
    uploading:   <Badge variant="secondary">Uploading…</Badge>,
    done:        <Badge className="bg-green-600 text-white">✓ Uploaded</Badge>,
    error:       <Badge variant="destructive">Error</Badge>,
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={id}>{label}</Label>
        {statusBadge[status]}
      </div>

      <Input
        ref={inputRef}
        id={id}
        type="file"
        accept="image/*"
        disabled={status === "compressing" || status === "uploading"}
        onChange={handleChange}
        className="cursor-pointer"
      />

      {preview && (
        <img
          src={preview}
          alt={`Preview – ${label}`}
          className="mt-1 h-28 w-auto rounded-md border object-cover"
        />
      )}

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
