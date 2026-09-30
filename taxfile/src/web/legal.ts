/**
 * Terms of Service and Privacy Policy pages.
 *
 * Kept as one module because the two documents share a layout and must stay
 * consistent with each other. Both are rendered from the same shell, with
 * operator-specific details (legal entity, contact email, governing state)
 * substituted from the environment so nothing ships with placeholder text
 * baked into the served HTML.
 *
 * These are drafts written to describe what this software actually does.
 * Have counsel review them before publishing — see taxfile/README.md.
 */

export interface LegalConfig {
  brandName: string;
  entity: string;
  email: string;
  state: string;
  updated: string;
}

export function legalConfigFromEnv(env: NodeJS.ProcessEnv = process.env): LegalConfig {
  return {
    brandName: env.BRAND_NAME ?? 'TaxFile',
    entity: env.LEGAL_ENTITY ?? env.BRAND_NAME ?? 'TaxFile',
    email: env.LEGAL_EMAIL ?? 'support@example.com',
    state: env.LEGAL_STATE ?? 'North Carolina',
    updated: env.LEGAL_UPDATED ?? 'August 2026',
  };
}

const escapeHtml = (s: string): string =>
  s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

function shell(title: string, cfg: LegalConfig, sections: string): string {
  const brand = escapeHtml(cfg.brandName);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)} — ${brand}</title>
<style>
  :root {
    color-scheme: light;
    --royal-900:#0d1b47; --royal-700:#1c3b9c; --royal-500:#3a63e0; --royal-50:#f1f5ff;
    --ink:#131c36; --muted:#5c6a8e; --line:#dde4f6; --bg:#eef2fd;
  }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--bg); color:var(--ink);
    font:16px/1.65 ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    -webkit-font-smoothing:antialiased; }
  header { background:linear-gradient(115deg,var(--royal-900),var(--royal-700) 55%,var(--royal-500));
    color:#fff; padding:22px 26px; }
  header a { color:#fff; text-decoration:none; font-weight:700; font-size:19px; letter-spacing:-.02em; }
  header p { margin:4px 0 0; color:rgba(255,255,255,.75); font-size:13px; }
  main { max-width:760px; margin:30px auto 80px; padding:0 20px; }
  article { background:#fff; border:1px solid var(--line); border-radius:16px; padding:34px 38px;
    box-shadow:0 1px 2px rgba(13,27,71,.06), 0 8px 24px -12px rgba(13,27,71,.28); }
  h1 { font-size:30px; font-weight:800; letter-spacing:-.025em; margin:0 0 6px; }
  .updated { color:var(--muted); font-size:13.5px; margin:0 0 26px; }
  h2 { font-size:17px; font-weight:750; letter-spacing:-.012em; margin:28px 0 8px; color:var(--royal-900); }
  p, li { color:#2b3552; font-size:15px; }
  ul { padding-left:22px; }
  li { margin-bottom:6px; }
  strong { font-weight:650; }
  .callout { background:var(--royal-50); border-left:3px solid var(--royal-500);
    padding:14px 18px; border-radius:0 10px 10px 0; margin:22px 0; }
  .callout p { margin:0; }
  footer { margin-top:26px; text-align:center; font-size:13px; color:var(--muted); }
  footer a { color:var(--royal-700); }
  @media (max-width:600px){ article{padding:26px 20px;} }
</style>
</head>
<body>
<header>
  <a href="/">${brand}</a>
  <p>Federal tax estimator — an estimate, never a filing</p>
</header>
<main>
  <article>
    <h1>${escapeHtml(title)}</h1>
    <p class="updated">Last updated ${escapeHtml(cfg.updated)}</p>
    ${sections}
  </article>
  <footer>
    <a href="/">Back to the estimator</a> · <a href="/terms">Terms</a> · <a href="/privacy">Privacy</a>
  </footer>
</main>
</body>
</html>`;
}

export function termsPage(cfg: LegalConfig): string {
  const brand = escapeHtml(cfg.brandName);
  const entity = escapeHtml(cfg.entity);
  const email = escapeHtml(cfg.email);
  return shell('Terms of Service', cfg, `
    <div class="callout"><p><strong>The short version:</strong> ${brand} gives you a federal tax
      estimate. It is not tax advice, it does not prepare or file a tax return, and nothing you enter
      is sent to the IRS. Use the estimate to plan; use an authorized filing service or a tax
      professional to file.</p></div>

    <h2>1. Who we are</h2>
    <p>${brand} is operated by ${entity} ("we", "us"). By using the service you agree to these terms.
      If you do not agree, please do not use the service.</p>

    <h2>2. What the service does</h2>
    <p>The service estimates United States federal individual income tax for a supported tax year
      based on figures you enter, and — on a paid plan — runs planning scenarios against those
      figures. It covers common situations only. When you tell us about a situation the engine cannot
      handle correctly, it declines to show an estimate rather than showing one we cannot stand
      behind.</p>

    <h2>3. What the service is not</h2>
    <ul>
      <li>It is <strong>not tax, legal, or accounting advice</strong>. We are not your accountant,
        attorney, or enrolled agent, and no professional relationship is created by your use of it.</li>
      <li>It <strong>does not file anything</strong>. No tax return is prepared, transmitted, or filed
        on your behalf, and nothing is sent to the IRS or to any state authority.</li>
      <li>It <strong>does not compute state taxes</strong>, and it omits several federal items listed
        in the app and its documentation.</li>
    </ul>

    <h2>4. Accuracy</h2>
    <p>We work hard to make the math right and we test it, but an estimate depends entirely on the
      figures you enter and on the limits of what the engine models. Your actual tax liability may
      differ. Verify anything important with a qualified professional before acting on it.</p>

    <h2>5. Your account</h2>
    <p>You are responsible for the accuracy of what you enter and for keeping your password
      confidential. Tell us promptly at ${email} if you believe your account has been accessed
      without your permission. Do not use the service unlawfully, attempt to disrupt it, or try to
      access other people's data.</p>

    <h2>6. Paid plans</h2>
    <p>Some features require a paid subscription. Prices are shown before you buy. Payments are
      processed by Stripe; we never receive or store your card number. Subscriptions renew
      automatically for the same period until cancelled, and you can cancel at any time — access
      continues to the end of the period you have paid for.</p>
    <p><strong>Refunds.</strong> If the service does not do what we said it does, email ${email}
      within 30 days of a charge and we will refund it. This is in addition to any refund rights you
      have under law.</p>

    <h2>7. Availability and changes</h2>
    <p>We may change, suspend, or discontinue features, and we may update these terms. If a change is
      material we will make reasonable efforts to notify account holders. Continuing to use the
      service after a change means you accept the updated terms.</p>

    <h2>8. Disclaimer and limits</h2>
    <p>The service is provided "as is," without warranties of any kind to the fullest extent
      permitted by law. To the maximum extent permitted by law, our total liability for any claim
      relating to the service is limited to the amount you paid us in the twelve months before the
      claim, and we are not liable for indirect or consequential damages. <strong>Tax you owe is
      your obligation regardless of what the estimator showed</strong>; amounts owed to any tax
      authority, and penalties or interest on them, are not recoverable from us.</p>
    <p>Some jurisdictions do not allow certain exclusions, so parts of this section may not apply to
      you.</p>

    <h2>9. Termination</h2>
    <p>You may stop using the service and delete your account at any time. We may suspend or close an
      account that breaches these terms or that we reasonably believe is being used unlawfully.</p>

    <h2>10. Governing law</h2>
    <p>These terms are governed by the laws of the State of ${escapeHtml(cfg.state)}, without regard
      to its conflict-of-laws rules.</p>

    <h2>11. Contact</h2>
    <p>Questions about these terms: <strong>${email}</strong>.</p>
  `);
}

export function privacyPage(cfg: LegalConfig): string {
  const brand = escapeHtml(cfg.brandName);
  const entity = escapeHtml(cfg.entity);
  const email = escapeHtml(cfg.email);
  return shell('Privacy Policy', cfg, `
    <div class="callout"><p><strong>The short version:</strong> we never ask for your Social Security
      number or your address. We do not use advertising or analytics trackers. If you use the
      estimator without an account, your figures stay in your browser and never reach our
      server.</p></div>

    <h2>1. What we do not collect</h2>
    <ul>
      <li><strong>No Social Security numbers or taxpayer identification numbers.</strong> The
        estimator does not need them, so it does not ask for them.</li>
      <li><strong>No home address.</strong></li>
      <li><strong>No advertising or analytics trackers</strong>, and no third-party cookies. We do not
        sell or share personal information, and we do not use your data for advertising.</li>
    </ul>

    <h2>2. What we do collect</h2>
    <ul>
      <li><strong>Account information</strong>, if you create an account: your email address and a
        cryptographically hashed version of your password. We never store your password itself.</li>
      <li><strong>The figures you enter</strong> — wages, withholding, dependents' first names and
        birth years, deduction amounts, and the situation answers that drive scope screening. If you
        are signed in, these are stored so you can return to your estimate. If you are not signed in,
        they stay in your browser.</li>
      <li><strong>Payment information</strong>, if you subscribe — handled entirely by Stripe. We
        receive a customer reference and your subscription status; we never see your card number.</li>
      <li><strong>Standard server logs</strong> kept by our hosting provider — the time of a request,
        the page requested, and the connecting IP address — used to keep the service running and
        secure. We do not build profiles from them.</li>
    </ul>

    <h2>3. Why we use it</h2>
    <p>To compute your estimate, to keep you signed in, to save your work if you have an account, to
      process payments for paid plans, and to keep the service secure and working. We do not use your
      tax figures for any other purpose.</p>

    <h2>4. Storage in your browser</h2>
    <p>We use your browser's local storage to remember your current estimate and preferences — for
      example, which tax year you selected. This stays on your device. Clearing your browser data
      removes it.</p>

    <h2>5. Who we share it with</h2>
    <p>Only the service providers needed to run the service: our hosting provider, and Stripe for
      payments. We may disclose information if legally required to do so, or to protect the rights
      and safety of our users. We do not sell personal information.</p>

    <h2>6. How long we keep it</h2>
    <p>Account data and saved estimates are kept while your account is open. Email ${email} to have
      your account and its data deleted — we will do so within 30 days, except where we must keep
      records to meet legal obligations, such as payment records. Estimates held only in your browser
      disappear when you clear your browser data or use the app's "start over" control.</p>

    <h2>7. Your choices</h2>
    <p>You can use the estimator without creating an account at all. If you have an account, you can
      access, correct, export, or delete your information by using the app or by emailing ${email}.
      Depending on where you live you may have additional rights under laws such as the CCPA or
      GDPR; we honor those requests regardless of where you live.</p>

    <h2>8. Security</h2>
    <p>Traffic is encrypted in transit. Passwords are hashed. Access to production data is limited to
      the people who need it to operate the service. No system is perfectly secure, so please use a
      strong, unique password.</p>

    <h2>9. Children</h2>
    <p>The service is not directed to children under 13, and we do not knowingly collect their
      information.</p>

    <h2>10. Changes and contact</h2>
    <p>If we change this policy we will update the date at the top and, for material changes, make
      reasonable efforts to notify account holders. Questions, or to exercise any of the rights
      above: <strong>${email}</strong> (${entity}).</p>
  `);
}
