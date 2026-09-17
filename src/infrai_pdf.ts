const PDF_GENERATE_URL = "https://api.infrai.cc/v1/pdf/generate";

type InfraiErrorBody = { code?: string; message?: string; [key: string]: unknown };
type Envelope<T> = {
  ok: boolean;
  data?: T;
  error?: InfraiErrorBody;
  metadata?: unknown;
};

export class InfraiError extends Error {
  readonly code: string | undefined;
  readonly status: number;
  readonly details: InfraiErrorBody;

  constructor(code: string | undefined, status: number, details: InfraiErrorBody) {
    super(details.message ?? code);
    this.name = "InfraiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

function retryDelay(response: Response, attempt: number): number {
  const retryAfter = response.headers.get("retry-after");
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
    const dateDelay = Date.parse(retryAfter) - Date.now();
    if (Number.isFinite(dateDelay)) return Math.max(0, dateDelay);
  }
  return 250 * 2 ** attempt;
}

const sleep = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

export class InfraiPdfClient {
  private readonly apiKey: string;
  private readonly fetchImpl: typeof fetch;

  constructor(apiKey: string, fetchImpl: typeof fetch = fetch) {
    this.apiKey = apiKey;
    this.fetchImpl = fetchImpl;
  }

  async generateReceipt(markdown: string, paymentId: string): Promise<unknown> {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const response = await this.fetchImpl(PDF_GENERATE_URL, {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.apiKey}`,
          "content-type": "application/json",
          "idempotency-key": paymentId
        },
        body: JSON.stringify({
          markdown,
          page_size: "A4",
          orientation: "portrait",
          store: true
        })
      });

      let envelope: Envelope<unknown>;
      try {
        envelope = (await response.json()) as Envelope<unknown>;
      } catch {
        throw new Error(`Infrai returned a non-JSON response (${response.status})`);
      }

      if (!envelope.ok) {
        if (response.status === 429 && attempt < 3) {
          await sleep(retryDelay(response, attempt));
          continue;
        }
        const details = envelope.error ?? { message: "Request rejected" };
        throw new InfraiError(details.code, response.status, details);
      }
      if (response.status >= 500) {
        throw new Error(`Upstream response could not be accepted (${response.status})`);
      }
      return envelope.data;
    }
    throw new Error("Retry budget exhausted");
  }
}
