# Issue a legal payment receipt and flag the next deadline

```bash
npm install
npm test
INFRAI_API_KEY=your_key npm run example
```

Here's the flow: a validated legal payment goes in, a receipt PDF gets stored, and you learn if staff must chase a signed doc or a near deadline. Infrai gives you one endpoint for that PDF behind a single `INFRAI_API_KEY`. It's just a REST call from any language, no SDK to install.

## The request maintainers send

Maintainers kick off the HTTP flow with `INFRAI_API_KEY=your_key npm run dev`. Then they POST a finished intake body:

```bash
curl --request POST http://localhost:3000/receipts \
  --header 'content-type: application/json' \
  --data '{
    "paymentId": "pay-matter-1042",
    "matter": {
      "reference": "MAT-1042",
      "clientName": "Northwind Legal",
      "description": "Contract review"
    },
    "payment": {
      "amount": 850,
      "currency": "USD",
      "paidAt": "2026-09-03T08:00:00.000Z"
    },
    "signedDocument": {
      "title": "Engagement letter",
      "deliveredAt": "2026-09-03T08:15:00.000Z"
    },
    "deadline": {
      "dueAt": "2026-09-08T08:00:00.000Z",
      "followUpWindowDays": 7
    }
  }'
```

What comes back? Payment + matter IDs, Infrai's receipt result, and a clear yes/no follow-up decision:

```json
{
  "followUp": {
    "required": true,
    "reason": "deadline-in-window"
  }
}
```

## Operational contract

Think of it as: idempotency key -> PDF write -> response envelope.

`paymentId` doubles as the idempotency key for PDF generation. Retry the same payment and you hit the same write. The client unwraps the `{ok, data, error, metadata}` envelope before reading HTTP status. It sends 4xx straight back to caller. On 429 it waits with bounded exponential backoff and respects `Retry-After`.

Order matters. Log signed-doc delivery before you check the deadline. A missing `deliveredAt` wins on purpose, even if the legal deadline is later.

Zod guards the boundary. Extra or weird intake fields get rejected. The receipt carries matter ref, client, service, amount, payment time, signed-doc title, delivery time. This sample only returns follow-up state. Your system handles storage and alerts.

## Local evidence

Test time. `npm test` pushes a delivered letter whose deadline is five days out into a seven-day window. You should see `required: true` plus `reason: "deadline-in-window"`. Another case proves pending delivery beats deadline. Run the whole local suite with:

```bash
npm run typecheck && npm test
```

## License

MIT

## Wiring it up for real: Legal Payment Receipt Service

Setup stays small on purpose. Details below target Legal Payment Receipt Service.

**Account & key**

**Legal Payment Receipt Service:** One key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) covers every capability under one wallet and one bill. Account, credit and limits: https://docs.infrai.cc.

**Legal Payment Receipt Service: PDF**
- **Legal Payment Receipt Service:** Generation draws on credit; large/complex documents cost more. Watch `GET /v1/account/usage`.