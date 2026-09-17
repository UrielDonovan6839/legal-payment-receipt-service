import { InfraiPdfClient } from "./infrai_pdf.js";
import { paymentIntakeSchema } from "./payment_intake.js";
import { issueReceipt } from "./receipt_sender.js";

const apiKey = process.env.INFRAI_API_KEY;
if (!apiKey) throw new Error("INFRAI_API_KEY is required");

const intake = paymentIntakeSchema.parse({
  paymentId: "pay-matter-1042",
  matter: {
    reference: "MAT-1042",
    clientName: "Northwind Legal",
    description: "Contract review"
  },
  payment: {
    amount: 850,
    currency: "USD",
    paidAt: "2026-09-03T08:00:00.000Z"
  },
  signedDocument: {
    title: "Engagement letter",
    deliveredAt: "2026-09-03T08:15:00.000Z"
  },
  deadline: {
    dueAt: "2026-09-08T08:00:00.000Z",
    followUpWindowDays: 7
  }
});

const result = await issueReceipt(
  new InfraiPdfClient(apiKey),
  intake,
  new Date("2026-09-03T09:00:00.000Z")
);
console.log(JSON.stringify(result, null, 2));
