/**
 * Legal pages for Cardinal Trading — Terms of Service, Privacy Policy, and
 * Investment Risk Disclosures. Served publicly (no session) at /legal/:slug
 * as standalone pages in the app's visual language.
 *
 * These are plain-language starting points written for a paper-trading app
 * with an interface-only on-chain component; have a lawyer review them
 * before relying on them.
 */

const EFFECTIVE = 'August 16, 2026';

const STYLE = /* css */ `
  :root{--bg:#fff;--surface:#fff;--ink:#111;--muted:#6f6f6f;--line:#e6e6e6;--brand:#00A305;--crit:#E04A00}
  @media (prefers-color-scheme: dark){:root{--bg:#000;--surface:#0E0E0E;--ink:#f4f4f4;--muted:#9a9a9a;--line:#232323;--brand:#00C805;--crit:#FF5000}}
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.65 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
  main{max-width:720px;margin:0 auto;padding:40px 22px 80px}
  .brandrow{display:flex;align-items:center;gap:10px;margin-bottom:6px}
  .brandrow svg{width:26px;height:26px;fill:#C31F3C}
  .brandrow b{font-size:1rem}
  h1{font-size:1.6rem;margin:.4em 0 .1em}
  .eff{color:var(--muted);font-size:.85rem;margin-bottom:28px}
  h2{font-size:1.05rem;margin:1.8em 0 .4em}
  p,li{color:var(--ink);font-size:.95rem}
  ul{padding-left:1.2em}
  .card{border:1px solid var(--line);border-radius:12px;padding:16px 18px;margin:18px 0;background:var(--surface)}
  .card.warn{border-color:var(--crit)}
  .card.warn b{color:var(--crit)}
  a{color:var(--brand)}
  nav.legal{margin-top:48px;padding-top:18px;border-top:1px solid var(--line);font-size:.85rem;display:flex;gap:18px;flex-wrap:wrap}
  nav.legal a{color:var(--muted)}
`;

const GLYPH =
  '<svg viewBox="0 0 100 100" aria-hidden="true"><polygon points="38,30 44,4 52,30"/><circle cx="44" cy="40" r="15"/><polygon points="30,39 12,47 30,53"/><ellipse cx="58" cy="64" rx="24" ry="21"/><polygon points="72,72 98,92 86,96 66,82"/></svg>';

function shell(title: string, body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} — Cardinal Trading</title>
<style>${STYLE}</style>
</head>
<body>
<main>
  <div class="brandrow">${GLYPH}<b>Cardinal Trading</b></div>
  <h1>${title}</h1>
  <div class="eff">Effective ${EFFECTIVE}</div>
  ${body}
  <nav class="legal">
    <a href="/">&larr; Back to Cardinal Trading</a>
    <a href="/legal/terms">Terms of Service</a>
    <a href="/legal/privacy">Privacy Policy</a>
    <a href="/legal/disclosures">Risk Disclosures</a>
  </nav>
</main>
</body>
</html>`;
}

const TERMS = shell(
  'Terms of Service',
  /* html */ `
<p>Welcome to Cardinal Trading. These terms are a plain-language agreement between you and Cardinal Trading ("we", "us"). By creating an account or using the app you agree to them. If you don't agree, please don't use the app.</p>

<h2>1. What Cardinal Trading is</h2>
<p>Cardinal Trading is a <b>paper-trading app</b>: every account starts with simulated "play money", and every stock, ETF, and crypto trade placed inside the app is simulated. No real money is deposited, held, or moved by the app — ever. It exists for learning, practice, and community.</p>

<h2>2. What Cardinal Trading is not</h2>
<ul>
  <li>We are <b>not a broker-dealer, exchange, investment adviser, bank, or money transmitter</b>, and we are not registered with the SEC, FINRA, or any other financial regulator.</li>
  <li>Nothing in the app is investment advice or a recommendation to buy or sell anything. Prices, charts, and statistics are shown for information and practice only.</li>
  <li>Accounts are not insured by the FDIC or protected by SIPC. There is nothing to insure — the balances are simulated.</li>
</ul>

<h2>3. The HOPE token page</h2>
<p>The HOPE page can show links that open <b>Uniswap</b>, a third-party decentralized exchange, pre-filled for a real on-chain swap. If you follow one of those links:</p>
<ul>
  <li>The transaction happens entirely between <b>your own crypto wallet</b> and the Uniswap protocol on the Ethereum network. We never hold your funds, tokens, or keys, this app adds no fee, and we cannot reverse, refund, or intervene in any on-chain transaction.</li>
  <li>The HOPE token itself carries a <b>built-in 2% fee on every transfer</b>, paid to the project treasury. That fee is part of the token&rsquo;s own contract &mdash; it applies wherever HOPE is traded, it is fixed forever, and it is disclosed in full at <a href="https://cp17.org">cp17.org</a>.</li>
  <li>You are responsible for your own wallet security and for understanding what you are buying. Read the <a href="/legal/disclosures">Risk Disclosures</a> first — crypto tokens can lose their entire value.</li>
</ul>

<h2>4. Your account</h2>
<ul>
  <li>You must be at least 18 years old to use Cardinal Trading.</li>
  <li>Keep your password to yourself; you are responsible for activity on your account.</li>
  <li>Don't abuse the service: no attempting to access other users' accounts, probing or overloading the system, or using the app for anything unlawful.</li>
  <li>We may suspend or delete accounts that break these terms, and we may modify or discontinue the service (it's a free community project, offered as-is).</li>
</ul>

<h2>5. No warranties, limited liability</h2>
<p>The app is provided <b>"as is" and "as available"</b>, without warranties of any kind. Market data may be delayed, estimated, or wrong. To the fullest extent the law allows, we are not liable for any damages arising from your use of the app — including anything you decide to do with real money anywhere else, which is entirely your own decision and responsibility.</p>

<h2>6. Changes</h2>
<p>If these terms change, we'll update this page and its effective date. Using the app after a change means you accept the new terms.</p>

<h2>7. Contact</h2>
<p>Questions? Reach us through <a href="https://cp17.org">cp17.org</a>.</p>
`,
);

const PRIVACY = shell(
  'Privacy Policy',
  /* html */ `
<p>Cardinal Trading collects as little as it can. Here is everything, plainly.</p>

<h2>What we collect</h2>
<ul>
  <li><b>Account basics</b> — your name (if you give one), your email address, and a scrambled (hashed) version of your password. We never store the password itself.</li>
  <li><b>Your paper-trading activity</b> — the simulated orders, positions, watchlist, and recurring plans that make your account work.</li>
  <li><b>Security records</b> — a log of sign-ins, sign-outs, and orders (an audit trail), and temporary counts of failed attempts by network address to slow down attackers.</li>
</ul>

<h2>What we don't collect</h2>
<ul>
  <li>No real payment details, bank accounts, card numbers, or government IDs — the app never touches real money.</li>
  <li>No crypto wallet addresses or keys. If you use a Uniswap link from the HOPE page, that activity happens in your own wallet and on the public Ethereum network, outside our systems.</li>
  <li>No advertising trackers, no analytics scripts, no selling or renting your data to anyone. Period.</li>
</ul>

<h2>Cookies</h2>
<p>One cookie: the session cookie that keeps you logged in. It's HttpOnly and expires after 30 days or when you log out.</p>

<h2>Email</h2>
<p>We email you only to verify your address and to reset your password when you ask. No marketing email.</p>

<h2>Where your data lives and how long</h2>
<p>Your data is stored in the app's own database on our hosting provider and kept while your account exists. To have your account and its data deleted, contact us through <a href="https://cp17.org">cp17.org</a> and we'll remove it.</p>

<h2>Changes</h2>
<p>If this policy changes, we'll update this page and its effective date.</p>
`,
);

const DISCLOSURES = shell(
  'Investment Risk Disclosures',
  /* html */ `
<div class="card warn"><b>The short version:</b> Cardinal Trading is for practice. Nothing here is investment advice. If you ever trade real money — anywhere — you can lose it, and crypto tokens like HOPE can lose <b>all</b> of their value.</div>

<h2>Paper trading is not real trading</h2>
<p>Simulated results do not predict real results. Paper trading can't reproduce the emotions, costs, taxes, or execution realities (slippage, partial fills, halts, spreads) of real markets, so success in the app does not mean you would succeed with real money.</p>

<h2>Not advice, not a recommendation</h2>
<p>Listing an instrument in the app — including HOPE — is not an endorsement or a recommendation. We are not investment advisers and nothing in the app considers your personal financial situation. Before investing real money, consider speaking with a licensed financial adviser.</p>

<h2>Crypto risk, and HOPE specifically</h2>
<ul>
  <li>Crypto tokens are <b>extremely volatile and speculative</b>. Small-pool tokens like HOPE can move violently on tiny trades, may have little or no liquidity when you want to sell, and can go to zero.</li>
  <li>HOPE charges a <b>built-in 2% fee on every transfer</b>, routed to the project treasury &mdash; so a round trip costs about 4.6% in fees before network costs. The people behind this platform benefit from that fee. Weigh that alongside the conflict of interest below.</li>
  <li>HOPE is a community token connected to this project. That is a <b>conflict of interest</b> you should weigh: the people behind Cardinal Trading and cp17.org created HOPE and hold HOPE. Never buy it — or any token — with money you can't afford to lose entirely.</li>
  <li>On-chain transactions are <b>irreversible</b>. A mistaken or regretted swap cannot be undone by us or anyone else. Larger trades move the pool price against you (price impact), so what you pay can differ from the quoted price.</li>
  <li>Crypto held in your own wallet has no FDIC or SIPC protection, and lost keys mean lost funds.</li>
</ul>

<h2>Market data</h2>
<p>Quotes and charts in the app may be delayed, estimated, simulated, or sourced from third parties (including the public Ethereum network), and may be inaccurate or unavailable. Never rely on them for real-money decisions.</p>
`,
);

/** slug → rendered page; unknown slugs get undefined. */
export const LEGAL_PAGES: Record<string, string> = {
  terms: TERMS,
  privacy: PRIVACY,
  disclosures: DISCLOSURES,
};
