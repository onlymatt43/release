// The contract text is never part of the code. It is loaded from
// configuration when an agreement is created and frozen into that agreement,
// so what the parties accepted is exactly what the document later shows.
//
//   CONTRACT_URL    absolute URL of a JSON document (fetched at creation time)
//   CONTRACT_JSON   the same JSON inline, for deployments without a URL
//
// Shape:
//   {
//     "title": "Model Release",
//     "paragraphs": ["...", "..."],
//     "consents": [{ "key": "recording", "label": "I authorize ...", "required": true }]
//   }

export interface ContractConsent {
  key: string;
  label: string;
  /** Defaults to true: the party must tick it to accept. */
  required: boolean;
}

export interface Contract {
  title: string;
  paragraphs: string[];
  consents: ContractConsent[];
}

export class ContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContractError";
  }
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function parseContract(raw: unknown): Contract {
  const o = (raw ?? {}) as Record<string, unknown>;
  const title = asString(o.title);
  if (!title) throw new ContractError("Contract is missing a title");

  const paragraphs = (Array.isArray(o.paragraphs) ? o.paragraphs : [])
    .map(asString)
    .filter((p): p is string => p !== null);
  if (!paragraphs.length) throw new ContractError("Contract has no paragraphs");

  const consents: ContractConsent[] = [];
  for (const c of Array.isArray(o.consents) ? o.consents : []) {
    const co = (c ?? {}) as Record<string, unknown>;
    const key = asString(co.key);
    const label = asString(co.label);
    if (key && label) consents.push({ key, label, required: co.required !== false });
  }

  return { title, paragraphs, consents };
}

export async function loadContract(): Promise<Contract> {
  const inline = process.env.CONTRACT_JSON?.trim();
  const url = process.env.CONTRACT_URL?.trim();

  if (url) {
    let res: Response;
    try {
      res = await fetch(url, { headers: { Accept: "application/json" }, cache: "no-store", signal: AbortSignal.timeout(10_000) });
    } catch {
      throw new ContractError("Contract URL unreachable");
    }
    if (!res.ok) throw new ContractError(`Contract URL returned ${res.status}`);
    try {
      return parseContract(await res.json());
    } catch (err) {
      if (err instanceof ContractError) throw err;
      throw new ContractError("Contract URL returned invalid JSON");
    }
  }

  if (inline) {
    try {
      return parseContract(JSON.parse(inline));
    } catch (err) {
      if (err instanceof ContractError) throw err;
      throw new ContractError("CONTRACT_JSON is not valid JSON");
    }
  }

  throw new ContractError("No contract configured: set CONTRACT_URL or CONTRACT_JSON");
}
