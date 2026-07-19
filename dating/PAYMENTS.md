# Payments — Stripe & PayPal for Cardinal+

How to take real money for the **Cardinal+ ($19.99/mo)** subscription. Two
levels: a no-backend way to go live fast, and the real backend for scale.

> **Before you charge a single person:** the service they're paying for has to be
> real. Cardinal+ sells access to a *vetted, safe* pool — until the background
> checks, verification, and moderation from `BUILD.md` actually run, charging
> real users is selling something that doesn't exist yet. Turn payments on when
> the product behind them is real.

---

## Level 1 — No backend (go live fast): hosted links

Both Stripe and PayPal let you take recurring subscriptions with **just a URL** —
no server, no secret keys in the app.

### Stripe Payment Link
1. Create a Stripe account (stripe.com) and a **Product**: "Cardinal+", recurring
   **$19.99 / month**.
2. Create a **Payment Link** for that price (Stripe Dashboard → Payment Links).
3. Copy the URL (looks like `https://buy.stripe.com/xxxx…`).
4. Paste it into the app config (below).

### PayPal Subscription button
1. Create a PayPal **Business** account.
2. PayPal → **Subscriptions** → create a plan: "Cardinal+", **$19.99 / month**.
3. Create a subscription button / hosted link and copy its URL
   (`https://www.paypal.com/webapps/billing/plans/subscribe?plan_id=…`).
4. Paste it into the app config.

### Wire it into the demo
In `dating/app.js`, near the top, fill in your links:

```js
const PAY = {
  stripe: "https://buy.stripe.com/your_link_here",
  paypal: "https://www.paypal.com/webapps/billing/plans/subscribe?plan_id=YOUR_PLAN",
};
```

With those set, the "Upgrade to Cardinal+" buttons open real Stripe/PayPal
checkout. Empty strings = demo mode (no charge, "skip & unlock" for testing).

**Limitation of Level 1:** the app can't *automatically* confirm the payment
(no webhook), so entitlement is best-effort. Fine for a soft launch / waitlist
conversion; move to Level 2 before you rely on it.

---

## Level 2 — Real backend (for scale & trust)

- **Stripe Checkout + webhooks:** backend creates a Checkout Session, Stripe
  redirects back on success, and a **webhook** (`checkout.session.completed`,
  `customer.subscription.updated/deleted`) is the source of truth that flips the
  member's `Cardinal+` entitlement. Never trust the client for entitlement.
- **PayPal Subscriptions API + webhooks:** same pattern — `BILLING.SUBSCRIPTION.
  ACTIVATED` / `CANCELLED` webhooks drive entitlement.
- **Entitlements table** (see `BUILD.md` §5.3): the API checks it on every gated
  action (unlimited likes, see-who-liked-you). Handle renewals, failures,
  cancellations, refunds, chargebacks.
- **Secret keys live on the server only.** Publishable/client keys are fine in
  the app; secret keys never are.

---

## The app-store catch (important for the iOS app)

If you ship a **native iOS app**, Apple requires **In-App Purchase (StoreKit)**
for digital subscriptions and takes **15–30%** — you generally *cannot* use
Stripe/PayPal for the subscription inside the native app. The **web** signup can
use Stripe/PayPal at ~2.9% + 30¢. So: sell Cardinal+ on the **web** where you
keep more, and comply with StoreKit in the native app. Plan the funnel around
this.

---

## Quick checklist to go live on payments
- [ ] Real product/service exists (vetting actually runs) — *do not skip*
- [ ] Stripe product + Payment Link created ($19.99/mo)
- [ ] PayPal business + subscription plan created ($19.99/mo)
- [ ] Links pasted into `PAY` in `app.js`
- [ ] Tested a real (or Stripe test-mode) transaction end to end
- [ ] Terms of Service + refund policy published
- [ ] Plan for Level 2 webhooks before you rely on entitlement
