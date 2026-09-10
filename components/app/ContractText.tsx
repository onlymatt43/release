import type { Contract } from "@/lib/contract";

export default function ContractText({ contract }: { contract: Contract }) {
  return (
    <div className="max-h-48 overflow-y-auto rounded-md border border-input bg-muted/30 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
      <p className="mb-1 font-semibold">{contract.title}</p>
      {contract.paragraphs.map((p, i) => (
        <p key={i} className={i > 0 ? "mt-2" : undefined}>{p}</p>
      ))}
    </div>
  );
}
