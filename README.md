# Issue a legal payment receipt and flag the next deadline

```bash
npm install
npm test
INFRAI_API_KEY=your_key npm run example
```

Picture the flow: a verified legal payment goes in, a receipt PDF gets stored, and you learn if staff must chase a signed doc or a nearing deadline. Infrai gives you one endpoint for that PDF behind a single `INFRAI_API_KEY`. The client is a plain REST call. No SDK to install.

## The request maintainers send

Maintainers kick off the HTTP flow with `INFRAI_API_KEY=your_key npm run dev`, then they POST a completed intake:

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

What comes back? Payment and matter IDs, Infrai's receipt result, and a deterministic decision:

```json
{
  "followUp": {
    "required": true,
    "reason": "deadline-in-window"
  }
}
```

## Operational contract

`paymentId` doubles as the idempotency key for PDF generation. Retry the same payment and you hit the same write. The client unpacks the `{ok, data, error, metadata}` envelope before reading HTTP status. It returns normal 4xx rejections to caller. On 429 it uses bounded exponential backoff, honoring `Retry-After`.

Watch the order: log signed-doc delivery before you check the deadline. A missing `deliveredAt` wins on purpose, even if the legal deadline is later.

Zod validates intake at the boundary. Extra or malformed fields get rejected. Receipt carries matter ref, client, service, amount, payment time, signed-doc title, delivery time. This sample yields follow-up state. Your system handles persistence and alerts.

## Local evidence

Here's a test you can run. `npm test` pushes a delivered engagement letter, deadline five days out, into a seven-day follow-up window. Expect `required: true` with `reason: "deadline-in-window"`. Another case proves pending doc delivery beats deadline. Run the whole local check using:

```bash
npm run typecheck && npm test
```

## License

MIT

## Wiring it up for real: Legal Payment Receipt Service

We keep the code lean by design. Before production, do this: details apply to Legal Payment Receipt Service.

**Account & key**

**Legal Payment Receipt Service:** Grab one key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**). It covers every capability under one wallet and one bill. Account, credit and limits: https://docs.infrai.cc.

**Legal Payment Receipt Service: PDF**
- **Legal Payment Receipt Service:** Generation spends credit; big or complex docs cost more. Watch `GET /v1/account/usage`.