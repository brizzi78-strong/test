/**
 * BillingService: upgrades to the Pro plan.
 *
 * Two modes, chosen by configuration:
 *
 *   Stripe mode  — STRIPE_SECRET_KEY (and STRIPE_PRICE_ID) set. `upgrade`
 *                  creates a Stripe Checkout session via the REST API (no SDK;
 *                  this repo is zero-dependency) and returns its URL; the
 *                  webhook flips the plan when checkout.session.completed
 *                  arrives, verified against STRIPE_WEBHOOK_SECRET.
 *
 *   Dev mode     — no key configured. `upgrade` flips the plan immediately so
 *                  the product is fully exercisable before Stripe is wired to
 *                  a real account. The response says which mode ran.
 *
 * Nothing here stores card data; in Stripe mode the card never touches this
 * server at all.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';
import type { AccountService } from './accountService.ts';
import { DomainError, ValidationError } from './errors.ts';

export class PaymentRequiredError extends DomainError {
  override readonly status = 402;
}

export interface BillingConfig {
  stripeSecretKey?: string;
  stripePriceId?: string;
  stripeWebhookSecret?: string;
  /** Base URL for checkout redirects, e.g. https://blue-ridge-tax.onrender.com */
  publicBaseUrl?: string;
  fetchImpl?: typeof fetch;
}

export function billingConfigFromEnv(env: NodeJS.ProcessEnv = process.env): BillingConfig {
  return {
    stripeSecretKey: env.STRIPE_SECRET_KEY,
    stripePriceId: env.STRIPE_PRICE_ID,
    stripeWebhookSecret: env.STRIPE_WEBHOOK_SECRET,
    publicBaseUrl: env.PUBLIC_BASE_URL,
  };
}

export interface UpgradeResult {
  mode: 'stripe' | 'dev';
  /** Stripe mode: send the user here to pay. Dev mode: absent. */
  checkoutUrl?: string;
  plan: 'free' | 'pro';
}

export class BillingService {
  private readonly accounts: AccountService;
  private readonly config: BillingConfig;
  private readonly fetchImpl: typeof fetch;

  constructor(accounts: AccountService, config: BillingConfig = {}) {
    this.accounts = accounts;
    this.config = config;
    this.fetchImpl = config.fetchImpl ?? fetch;
  }

  get stripeEnabled(): boolean {
    return Boolean(this.config.stripeSecretKey && this.config.stripePriceId);
  }

  /** Throw 402 unless the owner is on the plan that includes planning tools. */
  requirePro(ownerId: string): void {
    if (this.accounts.planFor(ownerId) !== 'pro') {
      throw new PaymentRequiredError(
        'this is a Pro feature — upgrade to run planning scenarios (POST /billing/upgrade)',
      );
    }
  }

  async upgrade(ownerId: string): Promise<UpgradeResult> {
    if (!this.stripeEnabled) {
      const user = this.accounts.setPlan(ownerId, 'pro');
      return { mode: 'dev', plan: user.plan };
    }
    const base = this.config.publicBaseUrl ?? 'http://localhost:4600';
    const body = new URLSearchParams({
      mode: 'subscription',
      'line_items[0][price]': this.config.stripePriceId!,
      'line_items[0][quantity]': '1',
      client_reference_id: ownerId,
      success_url: `${base}/?billing=success`,
      cancel_url: `${base}/?billing=cancelled`,
    });
    const res = await this.fetchImpl('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${this.config.stripeSecretKey}`,
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });
    const json = (await res.json()) as { url?: string; error?: { message?: string } };
    if (!res.ok || !json.url) {
      throw new ValidationError(`could not start checkout: ${json.error?.message ?? res.status}`);
    }
    return { mode: 'stripe', checkoutUrl: json.url, plan: this.accounts.planFor(ownerId) };
  }

  /**
   * Stripe webhook: verify the signature, then apply checkout completions.
   * Returns true when the event changed a plan.
   */
  handleWebhook(rawBody: string, signatureHeader: string | undefined): boolean {
    if (!this.config.stripeWebhookSecret) {
      throw new ValidationError('webhook received but STRIPE_WEBHOOK_SECRET is not configured');
    }
    if (!verifyStripeSignature(rawBody, signatureHeader, this.config.stripeWebhookSecret)) {
      throw new ValidationError('invalid webhook signature');
    }
    const event = JSON.parse(rawBody) as {
      type?: string;
      data?: { object?: { client_reference_id?: string; customer?: string } };
    };
    if (event.type !== 'checkout.session.completed') return false;
    const ownerId = event.data?.object?.client_reference_id;
    if (!ownerId) return false;
    this.accounts.setPlan(ownerId, 'pro');
    const customer = event.data?.object?.customer;
    if (customer) this.accounts.setStripeCustomer(ownerId, customer);
    return true;
  }
}

/** Stripe signs webhooks as `t=<ts>,v1=<hmac-sha256(ts + '.' + body)>`. */
export function verifyStripeSignature(
  rawBody: string,
  header: string | undefined,
  secret: string,
): boolean {
  if (!header) return false;
  const parts = new Map(
    header.split(',').map((pair) => {
      const eq = pair.indexOf('=');
      return [pair.slice(0, eq).trim(), pair.slice(eq + 1)] as const;
    }),
  );
  const timestamp = parts.get('t');
  const signature = parts.get('v1');
  if (!timestamp || !signature) return false;
  const expected = createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}
