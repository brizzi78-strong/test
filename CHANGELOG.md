# Changelog

## Stripe payment option — thecardinalspromise.com

Added Stripe ("Pay by Card") as a payment option alongside PayPal for book
pre-orders on https://thecardinalspromise.com (WordPress.com site, blog_id
253597930). The site content lives on WordPress.com, not in this repository;
this file records the changes made.

### What a single button couldn't do
A WordPress button can only carry one link, so it can't offer both PayPal and
card at once. The clean solution is a small Pre-Order page that hosts both
payment options, with the site's call-to-action buttons pointing to it.

### Changes
- **Pre-Order page (`/pre-order/`, page id 224)** — already presents two ways
  to pay:
  - "Pay with PayPal — $20" → https://paypal.me/robbrizzi/20
  - "Pay by Card — $20" → Stripe Checkout (https://buy.stripe.com/00wbJ3dbE8XegwueyN7EQ00)
- **Homepage (`/`, page id 6)** — repointed both "Pre-Order Now — Get a Signed
  Copy" buttons from the direct PayPal link (`paypal.me/robbrizzi`) to the
  Pre-Order page (`/pre-order/`), so visitors land on the page that offers both
  PayPal and card. This also fixes the blog-post CTAs, which funnel through the
  homepage.

### Follow-up (optional)
- A duplicate Pre-Order page exists at `/pre-order-2/` (page id 225). It is now
  unused; consider trashing it to avoid confusion (left in place pending
  confirmation, in case it is referenced by the site navigation menu).
