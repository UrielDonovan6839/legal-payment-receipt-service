import assert from "node:assert/strict";
import test from "node:test";
import { decideFollowUp, paymentIntakeSchema } from "../src/payment_intake.js";

test("schedules follow-up when a delivered document has a near deadline", () => {
  const intake = paymentIntakeSchema.parse({
    paymentId: "pay-1042",
    matter: { reference: "MAT-1042", clientName: "A Client", description: "Filing" },
    payment: { amount: 125, currency: "USD", paidAt: "2026-09-03T08:00:00.000Z" },
    signedDocument: { title: "Engagement letter", deliveredAt: "2026-09-03T08:15:00.000Z" },
    deadline: { dueAt: "2026-09-08T08:00:00.000Z", followUpWindowDays: 7 }
  });

  assert.deepEqual(decideFollowUp(intake, new Date("2026-09-03T09:00:00.000Z")), {
    required: true,
    reason: "deadline-in-window"
  });
});

test("prioritizes delivery follow-up when the signed document is pending", () => {
  const intake = paymentIntakeSchema.parse({
    paymentId: "pay-1043",
    matter: { reference: "MAT-1043", clientName: "A Client", description: "Review" },
    payment: { amount: 80, currency: "USD", paidAt: "2026-09-03T08:00:00.000Z" },
    signedDocument: { title: "Consent", deliveredAt: null },
    deadline: { dueAt: "2026-10-08T08:00:00.000Z", followUpWindowDays: 7 }
  });

  assert.equal(decideFollowUp(intake, new Date("2026-09-03T09:00:00.000Z")).reason, "signed-document-pending");
});
