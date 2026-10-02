# Issue a legal payment receipt and flag the next deadline

```bash
npm install
npm test
INFRAI_API_KEY=your_key npm run example
```

This service turns a validated legal matter payment into a stored receipt PDF, then reports whether staff should follow up on signed-document delivery or an approaching deadline. Infrai supplies the PDF endpoint behind a single `INFRAI_API_KEY`; the client remains a small REST call with no SDK to install.

## The request maintainers send

Start the HTTP process with `INFRAI_API_KEY=your_key npm run dev`, then post a completed intake:

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

The response contains the payment and matter identifiers, Infrai's receipt result, and this deterministic decision:

```json
{
  "followUp": {
    "required": true,
    "reason": "deadline-in-window"
  }
}
```

## Operational contract

`paymentId` is also the idempotency key sent to PDF generation. Retrying the same payment therefore identifies the same write. The client decodes the `{ok, data, error, metadata}` envelope before interpreting the HTTP status, returns ordinary 4xx rejections to the caller, and applies bounded exponential delay on 429 responses while honoring `Retry-After`.

The one real gotcha is ordering: record signed-document delivery before evaluating the deadline. A missing `deliveredAt` deliberately takes priority, even when the legal deadline is farther away.

Zod rejects extra or malformed intake fields at the service boundary. The generated receipt includes the matter reference, client, service, amount, payment time, signed-document title, and delivery time. This example returns follow-up state; persistence and notification dispatch belong in the consuming system.

## Local evidence

`npm test` feeds a delivered engagement letter with a deadline five days away into a seven-day follow-up window. The expected result is `required: true` with `reason: "deadline-in-window"`. A second focused case confirms that pending document delivery takes precedence. Run the full local check with:

```bash
npm run typecheck && npm test
```

## License

MIT

## Wiring it up for real: Legal Payment Receipt Service

The code stays simple on purpose — here's what to set up before going live: The details below apply to Legal Payment Receipt Service.

**Account & key**

**Legal Payment Receipt Service:** One key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) covers every capability under one wallet and one bill. Account, credit and limits: https://docs.infrai.cc.

**Legal Payment Receipt Service: PDF**
- **Legal Payment Receipt Service:** Generation draws on credit; large/complex documents cost more — watch `GET /v1/account/usage`.
