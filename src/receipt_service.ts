import { createServer } from "node:http";
import { ZodError } from "zod";
import { InfraiError, InfraiPdfClient } from "./infrai_pdf.js";
import { paymentIntakeSchema } from "./payment_intake.js";
import { issueReceipt } from "./receipt_sender.js";

const apiKey = process.env.INFRAI_API_KEY;
if (!apiKey) throw new Error("INFRAI_API_KEY is required");
const client = new InfraiPdfClient(apiKey);

function sendJson(response: import("node:http").ServerResponse, status: number, value: unknown) {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(value));
}

const server = createServer(async (request, response) => {
  if (request.method !== "POST" || request.url !== "/receipts") {
    sendJson(response, 404, { error: "Route not found" });
    return;
  }

  try {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    const intake = paymentIntakeSchema.parse(JSON.parse(Buffer.concat(chunks).toString("utf8")));
    sendJson(response, 201, await issueReceipt(client, intake));
  } catch (error) {
    if (error instanceof ZodError) {
      sendJson(response, 400, { error: "Invalid receipt request", issues: error.issues });
      return;
    }
    if (error instanceof SyntaxError) {
      sendJson(response, 400, { error: "Request body must be JSON" });
      return;
    }
    if (error instanceof InfraiError) {
      const status = error.status >= 400 && error.status < 500 ? error.status : 502;
      sendJson(response, status, { error: error.message, code: error.code });
      return;
    }
    console.error(error);
    sendJson(response, 502, { error: "Receipt generation failed" });
  }
});

const port = Number(process.env.PORT ?? 3000);
server.listen(port, () => console.log(`Receipt service listening on http://localhost:${port}`));
