import type { PaymentIntake } from "./payment_intake.js";
import { decideFollowUp } from "./payment_intake.js";
import { InfraiPdfClient } from "./infrai_pdf.js";

function escapeMarkdown(value: string): string {
  return value.replace(/[\\`*_{}[\]()#+.!|>-]/g, "\\$&");
}

export function renderReceipt(intake: PaymentIntake): string {
  const { matter, payment, signedDocument } = intake;
  return [
    "# Payment receipt",
    "",
    `**Receipt:** ${escapeMarkdown(intake.paymentId)}`,
    `**Matter:** ${escapeMarkdown(matter.reference)}`,
    `**Client:** ${escapeMarkdown(matter.clientName)}`,
    `**Service:** ${escapeMarkdown(matter.description)}`,
    `**Payment:** ${payment.amount.toFixed(2)} ${payment.currency}`,
    `**Paid at:** ${payment.paidAt}`,
    `**Signed document:** ${escapeMarkdown(signedDocument.title)}`,
    `**Delivered at:** ${signedDocument.deliveredAt ?? "Pending delivery"}`
  ].join("\n");
}

export async function issueReceipt(
  client: InfraiPdfClient,
  intake: PaymentIntake,
  now = new Date()
) {
  const receipt = await client.generateReceipt(renderReceipt(intake), intake.paymentId);
  return {
    paymentId: intake.paymentId,
    matterReference: intake.matter.reference,
    receipt,
    followUp: decideFollowUp(intake, now)
  };
}
