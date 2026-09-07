/**
 * The two emails Cardinal Verify sends. Plain wording, one clear link each, and
 * an explicit note of scope (references / employment / education only). Kept as
 * pure builders so they're trivial to unit-test.
 */

import type { OutboundEmail } from './notifier.ts';
import type { ItemType } from '../domain/types.ts';

const SCOPE_NOTE =
  'This covers reference, employment, and education verification only — it does not authorize criminal or credit checks.';

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string);
}

function wrap(bodyHtml: string): string {
  return (
    '<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#17233F;line-height:1.5">' +
    bodyHtml +
    '</div>'
  );
}

function button(url: string, label: string): string {
  return (
    `<p style="margin:22px 0"><a href="${esc(url)}" ` +
    'style="background:#A31B33;color:#fff;text-decoration:none;padding:11px 20px;border-radius:8px;' +
    `display:inline-block;font-weight:600">${esc(label)}</a></p>` +
    `<p style="font-size:13px;color:#5b6472">Or paste this link into your browser:<br>${esc(url)}</p>`
  );
}

/** To the candidate, when a request is opened: read the disclosure and e-sign. */
export function consentEmail(input: { to: string; companyName: string; candidateFirstName: string; url: string }): OutboundEmail {
  const { companyName, candidateFirstName, url } = input;
  const text =
    `Hi ${candidateFirstName},\n\n` +
    `${companyName} would like to verify your background and needs your authorization first. ` +
    `Open the link below to review exactly who will be contacted and what will be confirmed, then e-sign to authorize.\n\n` +
    `${url}\n\n${SCOPE_NOTE}\n\nNothing and no one is contacted until you sign.`;
  const html = wrap(
    `<p>Hi ${esc(candidateFirstName)},</p>` +
      `<p><b>${esc(companyName)}</b> would like to verify your background and needs your authorization first. ` +
      `Open the link to review exactly who will be contacted and what will be confirmed, then e-sign to authorize.</p>` +
      button(url, 'Review & authorize') +
      `<p style="font-size:13px;color:#5b6472">${esc(SCOPE_NOTE)} Nothing and no one is contacted until you sign.</p>`,
  );
  return { to: input.to, subject: `${companyName}: authorize your background verification`, text, html };
}

const ASK: Record<ItemType, string> = {
  reference: 'give a reference for',
  employment: 'confirm past employment for',
  education: 'confirm the education of',
};

/** To a source, after the candidate consents: confirm or decline via their link. */
export function verifierEmail(input: {
  to: string;
  companyName: string;
  candidateName: string;
  itemType: ItemType;
  subject: string;
  url: string;
}): OutboundEmail {
  const { companyName, candidateName, itemType, subject, url } = input;
  const ask = ASK[itemType];
  const text =
    `Hello,\n\n${companyName} has asked you to ${ask} ${candidateName} (regarding ${subject}), ` +
    `with ${candidateName}'s written consent. It takes about a minute — open the link to confirm or decline.\n\n` +
    `${url}\n\n${SCOPE_NOTE}`;
  const html = wrap(
    `<p>Hello,</p>` +
      `<p><b>${esc(companyName)}</b> has asked you to ${esc(ask)} <b>${esc(candidateName)}</b> ` +
      `(regarding ${esc(subject)}), with ${esc(candidateName)}'s written consent. It takes about a minute.</p>` +
      button(url, 'Respond') +
      `<p style="font-size:13px;color:#5b6472">${esc(SCOPE_NOTE)}</p>`,
  );
  return { to: input.to, subject: `${companyName}: a quick verification for ${candidateName}`, text, html };
}
