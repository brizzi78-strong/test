=== Blue Ridge Mailer ===
Contributors: blueridge
Requires at least: 6.0
Tested up to: 6.7
Requires PHP: 7.4
Stable tag: 1.0.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Draft coaching-lead emails with Claude, review them, then approve and send. Generating and sending are deliberately separate, human-gated steps.

== Description ==

Blue Ridge Mailer is a small, single-purpose plugin for sending email to a list
of coaching leads. It is built around one rule: **an AI never sends anything on
its own.**

The flow:

1. **Generate.** You write a short brief; Claude (`claude-opus-4-8`) drafts a
   subject and body. This only writes a *draft* — it sends nothing.
2. **Review.** You read and edit the draft, and can send a test to yourself.
3. **Approve & send.** A separate screen, a separate confirmation, a separate
   click. Only this step sends.

Every send is:

* **Deduplicated** — the recipient list has a unique index on email, and each
  recipient is visited at most once per campaign.
* **Individually addressed** — one message per recipient, so the list is never
  exposed via a shared To/CC.
* **Compliant** — each email carries the sender's name, a physical mailing
  address, and a working one-click unsubscribe link. Sending is blocked until
  the From address and mailing address are set.
* **Throttled** — sends drip through WP-Cron in small batches so a large list
  can't time out the request or spike your domain's send-rate.

Unsubscribes are honoured immediately and such addresses are never re-added by
a later import.

== Installation ==

1. Upload the `blue-ridge-mailer` folder to `/wp-content/plugins/`.
2. Activate the plugin (this creates its two database tables).
3. Add your API key. **Recommended:** put it in `wp-config.php` so it never
   touches the database —
   `define( 'BLUE_RIDGE_ANTHROPIC_API_KEY', 'sk-ant-...' );`
   Otherwise, paste it under **Mailer → Settings**.
4. Under **Mailer → Settings**, set the From name/email and your physical
   mailing address.
5. Add leads under **Mailer → Recipients**.
6. Generate a draft under **Mailer → Campaigns**, review it, and approve.

== Frequently Asked Questions ==

= Why isn't there a one-click "Generate & Send"? =

By design. An unreviewed AI email going out under your name is the exact failure
mode this plugin refuses to allow. Generating a draft and sending it are two
separate actions on two separate screens.

= Is this a replacement for a real ESP? =

No. For ongoing newsletters and subscriber funnels, a dedicated email platform
gives you consent tracking, deliverability monitoring, and domain-reputation
tooling this plugin does not. This is for narrow, list-to-lead sends where you
want an AI-assisted draft with a hard human approval gate.

== Changelog ==

= 1.0.0 =
* Initial release: Claude-drafted campaigns, separate human approval, deduped
  drip sending, CAN-SPAM footer with one-click unsubscribe.
