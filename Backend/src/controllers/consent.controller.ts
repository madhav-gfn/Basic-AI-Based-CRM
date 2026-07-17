import { Request, Response, NextFunction } from "express";
import { ConsentStatus } from "@prisma/client";
import { prisma } from "../config/database";
import { sendSuccess, sendError } from "../utils/response";

// ─────────────────────────────────────────────────────────────────────────────
// Consent / unsubscribe handling
//
// A marketing CRM must honour opt-out (DPDP Act / GDPR). Every outbound message
// carries a one-click unsubscribe link backed by the customer's stable
// `unsubscribeToken`. Suppressed customers are excluded from all future dispatch
// (enforced in ExecutionService and CampaignService audience resolution).
// ─────────────────────────────────────────────────────────────────────────────

/** Minimal branded confirmation page returned to a browser click. */
function confirmationPage(title: string, body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: #e2e8f0;
           display: grid; place-items: center; min-height: 100vh; margin: 0; }
    .card { background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 40px;
            max-width: 420px; text-align: center; }
    h1 { font-size: 20px; margin: 0 0 12px; }
    p { color: #94a3b8; line-height: 1.6; margin: 0; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${title}</h1>
    <p>${body}</p>
  </div>
</body>
</html>`;
}

/**
 * GET /api/consent/unsubscribe/:token
 * Public, one-click unsubscribe. Idempotent — re-clicking a used link is fine.
 * Returns an HTML page because this URL is opened directly in a browser.
 */
export async function unsubscribe(req: Request, res: Response, next: NextFunction) {
  try {
    const { token } = req.params;

    const customer = await prisma.customer.findUnique({
      where: { unsubscribeToken: token },
      select: { id: true, name: true, consentStatus: true },
    });

    if (!customer) {
      res
        .status(404)
        .type("html")
        .send(
          confirmationPage(
            "Link not recognised",
            "This unsubscribe link is invalid or has expired."
          )
        );
      return;
    }

    if (customer.consentStatus !== ConsentStatus.OPTED_OUT) {
      await prisma.customer.update({
        where: { id: customer.id },
        data: { consentStatus: ConsentStatus.OPTED_OUT, unsubscribedAt: new Date() },
      });
    }

    res.type("html").send(
      confirmationPage(
        "You're unsubscribed",
        `${customer.name}, you will no longer receive marketing messages from us. ` +
          `You can re-subscribe any time by contacting support.`
      )
    );
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/consent/:customerId
 * Programmatic consent update (used by internal tooling / re-subscribe flows).
 * Body: { consentStatus: "OPTED_IN" | "OPTED_OUT" | "UNKNOWN" }
 */
export async function updateConsent(req: Request, res: Response, next: NextFunction) {
  try {
    const { customerId } = req.params;
    const { consentStatus } = req.body as { consentStatus: string };

    const status = ConsentStatus[consentStatus as keyof typeof ConsentStatus];
    if (!status) {
      sendError(
        res,
        `Invalid consentStatus. Allowed: ${Object.keys(ConsentStatus).join(", ")}.`,
        400
      );
      return;
    }

    const exists = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true },
    });
    if (!exists) {
      sendError(res, "Customer not found", 404);
      return;
    }

    const customer = await prisma.customer.update({
      where: { id: customerId },
      data: {
        consentStatus: status,
        unsubscribedAt: status === ConsentStatus.OPTED_OUT ? new Date() : null,
      },
    });

    sendSuccess(res, customer, "Consent updated");
  } catch (error) {
    next(error);
  }
}
