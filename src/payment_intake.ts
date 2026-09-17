import { z } from "zod";

export const paymentIntakeSchema = z.object({
  paymentId: z.string().min(1),
  matter: z.object({
    reference: z.string().min(1),
    clientName: z.string().min(1),
    description: z.string().min(1)
  }),
  payment: z.object({
    amount: z.number().positive(),
    currency: z.string().regex(/^[A-Z]{3}$/),
    paidAt: z.string().datetime()
  }),
  signedDocument: z.object({
    title: z.string().min(1),
    deliveredAt: z.string().datetime().nullable()
  }),
  deadline: z.object({
    dueAt: z.string().datetime(),
    followUpWindowDays: z.number().int().min(0).max(90)
  })
}).strict();

export type PaymentIntake = z.infer<typeof paymentIntakeSchema>;

export type FollowUpDecision = {
  required: boolean;
  reason: "signed-document-pending" | "deadline-in-window" | "deadline-not-imminent";
};

export function decideFollowUp(intake: PaymentIntake, now: Date): FollowUpDecision {
  if (intake.signedDocument.deliveredAt === null) {
    return { required: true, reason: "signed-document-pending" };
  }

  const dueAt = new Date(intake.deadline.dueAt).getTime();
  const windowMs = intake.deadline.followUpWindowDays * 24 * 60 * 60 * 1000;
  if (dueAt <= now.getTime() + windowMs) {
    return { required: true, reason: "deadline-in-window" };
  }
  return { required: false, reason: "deadline-not-imminent" };
}
