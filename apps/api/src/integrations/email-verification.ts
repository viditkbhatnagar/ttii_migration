import { promises as dns } from 'node:dns';

/**
 * Server-side email verification — no OTP, no third-party API. Two
 * defenses layered:
 *
 *   1. Disposable / throwaway provider blocklist (curated, ~120 domains).
 *      Catches mailinator, tempmail, guerrillamail, etc.
 *   2. MX record DNS lookup. Catches typos (gnail.com, yhoo.com) and
 *      domains that have no mail infrastructure at all.
 *
 * Both checks run server-side at submission time. Returns a
 * structured result so callers can surface the specific reason
 * ("Email domain doesn't exist" vs "Disposable emails not allowed").
 *
 * Format validation is done first via a strict regex — fastest reject
 * path, no DNS hit.
 *
 * Naji 2026-05-02 — preferred this over OTP for the application form.
 */

const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

/**
 * Curated list of common disposable / throwaway email providers. Not
 * exhaustive — the canonical reference (5000+ domains) lives in the
 * `disposable-email-domains` npm package, which we can swap to later
 * without changing the call sites here.
 */
const DISPOSABLE_DOMAINS = new Set<string>([
  '0-mail.com', '10minutemail.com', '10minutemail.net', '20minutemail.com',
  '33mail.com', '4warding.com', 'altmails.com', 'anonbox.net',
  'anonymbox.com', 'armyspy.com', 'binkmail.com', 'bluewerks.com',
  'bobmail.info', 'boun.cr', 'bouncr.com', 'bsnow.net',
  'burnermail.io', 'byom.de', 'cuvox.de', 'dayrep.com',
  'deadaddress.com', 'despam.it', 'discardmail.com', 'discardmail.de',
  'disposable.email', 'disposeamail.com', 'dispostable.com', 'dropmail.me',
  'easytrashmail.com', 'einrot.com', 'einrot.de', 'emailfake.com',
  'emailtemporanea.net', 'emailtemporario.com.br', 'emailthe.net',
  'fakeinbox.com', 'fakemailgenerator.com', 'fastacura.com', 'filzmail.com',
  'fleckens.hu', 'forwardemail.net', 'getairmail.com', 'getnada.com',
  'gettempmail.com', 'gishpuppy.com',
  'grr.la', 'guerrillamail.biz', 'guerrillamail.com', 'guerrillamail.de',
  'guerrillamail.info', 'guerrillamail.net', 'guerrillamail.org',
  'guerrillamailblock.com', 'gustr.com', 'harakirimail.com',
  'hidzz.com', 'inboxalias.com', 'inboxbear.com',
  'inboxkitten.com', 'incognitomail.org', 'jetable.org', 'jourrapide.com',
  'kasmail.com', 'kurzepost.de', 'lroid.com', 'mailbidon.com',
  'mailcatch.com', 'maildrop.cc', 'maileater.com', 'maileimer.de',
  'mailexpire.com', 'mailforspam.com', 'mailfreeway.com', 'mailguard.me',
  'mailhz.me', 'mailimate.com', 'mailin8r.com', 'mailinator.com',
  'mailinator.net', 'mailinator.org', 'mailinator2.com', 'mailme.lv',
  'mailmetrash.com', 'mailmoat.com', 'mailnesia.com', 'mailnull.com',
  'mailpoof.com', 'mailshell.com', 'mailtemp.info', 'mailtothis.com',
  'mailtrap.io', 'mailzilla.com', 'mailzilla.org', 'mintemail.com',
  'moakt.com', 'mt2014.com', 'mt2015.com', 'mt2016.com', 'mvrht.com',
  'mytemp.email', 'mytrashmail.com', 'no-spam.ws', 'nobulk.com',
  'noclickemail.com', 'nogmailspam.info', 'nomail.xl.cx', 'nospam.ze.tc',
  'nospam4.us', 'nowmymail.com', 'objectmail.com', 'opayq.com',
  'oranek.com', 'pjjkp.com', 'plexolan.de', 'pokemail.net', 'proxymail.eu',
  'rcpt.at', 'recode.me', 'recursor.net', 'safe-mail.net', 'safetymail.info',
  'safetypost.de', 'selfdestructingmail.com', 'sharklasers.com',
  'shieldedmail.com', 'shitmail.me', 'shitware.nl', 'simplemail.in',
  'slaskpost.se', 'slopsbox.com', 'smashmail.de', 'snakemail.com',
  'sneakemail.com', 'sofort-mail.de', 'sogetthis.com', 'spamavert.com',
  'spambob.com', 'spambog.com', 'spambox.us', 'spamday.com', 'spamex.com',
  'spamfree24.com', 'spamfree24.de', 'spamfree24.eu', 'spamfree24.info',
  'spamfree24.net', 'spamfree24.org', 'spamgourmet.com', 'spamgourmet.net',
  'spamgourmet.org', 'spamhereplease.com', 'spamhole.com', 'spaminator.de',
  'spamkill.info', 'spaml.com', 'spaml.de', 'spammotel.com', 'spamobox.com',
  'spamsalad.in', 'spamspot.com', 'spamthis.co.uk', 'spamthisplease.com',
  'spamtrail.com', 'spamtroll.net', 'speed.1s.fr', 'superrito.com',
  'supergreatmail.com', 'tafmail.com', 'teleworm.com', 'teleworm.us',
  'temp-mail.com', 'temp-mail.org', 'temp-mail.ru', 'tempemail.co.za',
  'tempemail.com', 'tempemail.net', 'tempinbox.co.uk', 'tempinbox.com',
  'tempmail.eu', 'tempmail.it', 'tempmail.us', 'tempmaildemand.com',
  'tempmailer.com', 'tempmailer.de', 'tempomail.fr', 'temporarily.de',
  'temporarioemail.com.br', 'temporaryemail.net', 'temporaryforwarding.com',
  'temporaryinbox.com', 'temporarymailaddress.com', 'tempymail.com',
  'thankyou2010.com', 'thisisnotmyrealemail.com', 'throam.com',
  'throwam.com', 'throwawayemail.com', 'tmail.ws', 'tmailinator.com',
  'tradermail.info', 'trash-amil.com', 'trash-mail.at', 'trash-mail.com',
  'trash-mail.de', 'trash2009.com', 'trashdevil.com', 'trashemail.de',
  'trashinbox.com', 'trashmail.at', 'trashmail.com', 'trashmail.de',
  'trashmail.me', 'trashmail.net', 'trashmail.org', 'trashmail.ws',
  'trashmailer.com', 'trashymail.com', 'trbvm.com', 'tyldd.com',
  'uggsrock.com', 'upliftnow.com', 'uplipht.com', 'venompen.com',
  'wegwerfemail.de', 'wegwerfmail.de', 'wegwerfmail.info', 'wegwerfmail.net',
  'wegwerfmail.org', 'wh4f.org', 'whyspam.me', 'willhackforfood.biz',
  'willselfdestruct.com', 'winemaven.info', 'wronghead.com',
  'wuzup.net', 'wuzupmail.net', 'xagloo.com', 'xemaps.com', 'xemps.com',
  'xoxy.net', 'yapped.net', 'yopmail.com', 'yopmail.fr', 'yopmail.net',
  'yourdomain.com', 'yuurok.com', 'zehnminuten.de', 'zoemail.org',
]);

export interface EmailVerificationResult {
  /** True if the email passes all checks. */
  valid: boolean;
  /** Specific failure reason — undefined when valid. */
  reason?: 'invalid_format' | 'disposable_domain' | 'no_mx_record' | 'dns_error';
  /** Human-readable message safe to show to the user. */
  message?: string;
  /**
   * If the entered domain looks like a typo of a popular provider
   * (Levenshtein distance <= 2), the suggested correction. Caller decides
   * whether to surface this as a "Did you mean ...?" prompt.
   */
  suggestion?: string;
}

/**
 * Top consumer email providers used in India + globally. Used as targets
 * for the typo detector below. Order doesn't matter; only domain set
 * membership and Levenshtein distance are checked.
 */
const POPULAR_EMAIL_DOMAINS: readonly string[] = [
  'gmail.com', 'googlemail.com',
  'yahoo.com', 'yahoo.co.in', 'yahoo.in',
  'hotmail.com', 'hotmail.co.in',
  'outlook.com', 'outlook.in',
  'live.com', 'msn.com', 'aol.com',
  'icloud.com', 'me.com',
  'protonmail.com', 'proton.me',
  'zoho.com', 'zohomail.com', 'zohomail.in',
  'rediffmail.com', 'indiatimes.com', 'sify.com',
  'teachersindia.in',
];

const POPULAR_DOMAIN_SET = new Set<string>(POPULAR_EMAIL_DOMAINS);

/**
 * Standard iterative Levenshtein. Returns the minimum number of single
 * character insertions, deletions, or substitutions to turn a into b.
 * Used purely for nearest-neighbour ranking in the typo suggester — not
 * a security primitive.
 */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const m = a.length;
  const n = b.length;
  let prev = new Array<number>(n + 1);
  let curr = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    const ai = a.charCodeAt(i - 1);
    for (let j = 1; j <= n; j++) {
      const cost = ai === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(
        (prev[j] ?? 0) + 1,           // deletion
        (curr[j - 1] ?? 0) + 1,       // insertion
        (prev[j - 1] ?? 0) + cost,    // substitution
      );
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n] ?? 0;
}

/**
 * If the input domain is unlikely to be intended (i.e. it's not in the
 * popular set, but is within 1-2 edits of one of them), return the closest
 * popular domain. Returns null when nothing close enough is found, or when
 * the input is itself a popular domain.
 *
 * Skips suggestions for very short domains where small edit distances are
 * misleading (e.g. x.com vs y.com).
 */
function suggestDomainCorrection(domain: string): string | null {
  if (!domain || domain.length < 5) return null;
  if (POPULAR_DOMAIN_SET.has(domain)) return null;
  let best: { domain: string; distance: number } | null = null;
  for (const popular of POPULAR_EMAIL_DOMAINS) {
    const d = levenshtein(domain, popular);
    if (d === 0) return null;
    if (d > 2) continue;
    if (!best || d < best.distance) best = { domain: popular, distance: d };
  }
  return best ? best.domain : null;
}

function extractDomain(email: string): string | null {
  const at = email.lastIndexOf('@');
  if (at < 0 || at === email.length - 1) return null;
  return email.slice(at + 1).toLowerCase().trim();
}

/**
 * Verify an email by format → disposable list → MX record. Network call
 * for the MX lookup uses Node's built-in dns module (no third party).
 * Typical latency 30-150ms in India / SGP.
 */
export async function verifyEmail(emailRaw: string): Promise<EmailVerificationResult> {
  const email = (emailRaw || '').trim();
  if (!EMAIL_REGEX.test(email)) {
    return { valid: false, reason: 'invalid_format', message: 'Email is not a valid format.' };
  }

  const domain = extractDomain(email);
  if (!domain) {
    return { valid: false, reason: 'invalid_format', message: 'Email is not a valid format.' };
  }

  if (DISPOSABLE_DOMAINS.has(domain)) {
    return { valid: false, reason: 'disposable_domain', message: 'Disposable email addresses are not allowed.' };
  }

  // Even when MX passes, surface a "did you mean ...?" hint for likely
  // typos of popular providers (e.g. gnail.com → gmail.com). Built once
  // here so every caller gets it in one round-trip.
  const typoSuggestion = suggestDomainCorrection(domain);

  // MX lookup. ENODATA / ENOTFOUND / ESERVFAIL mean no mail servers — the
  // domain can't receive email. Truly transient errors (timeout, network
  // unreachable) fall open: better to let a borderline submission through
  // than to block legitimate users on a network hiccup. Server logs the
  // warning either way.
  //
  // Also catch RFC 7505 "Null MX" records: a single MX of priority 0 with
  // an empty exchange explicitly says "this domain does not accept mail".
  try {
    const records = await dns.resolveMx(domain);
    if (!records || records.length === 0) {
      return {
        valid: false,
        reason: 'no_mx_record',
        message: "Email domain doesn't accept mail.",
        ...(typoSuggestion ? { suggestion: typoSuggestion } : {}),
      };
    }
    const allEmptyExchange = records.every((r) => !r.exchange || r.exchange.trim() === '' || r.exchange === '.');
    if (allEmptyExchange) {
      return {
        valid: false,
        reason: 'no_mx_record',
        message: "Email domain doesn't accept mail.",
        ...(typoSuggestion ? { suggestion: typoSuggestion } : {}),
      };
    }
    // Valid MX, but the domain might still be a typo of a popular one.
    // Surface the suggestion alongside the pass so the form can prompt
    // ("Did you mean gmail.com?") without rejecting.
    return { valid: true, ...(typoSuggestion ? { suggestion: typoSuggestion } : {}) };
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code ?? '';
    if (code === 'ENODATA' || code === 'ENOTFOUND' || code === 'ESERVFAIL' || code === 'EREFUSED') {
      return {
        valid: false,
        reason: 'no_mx_record',
        message: "Email domain doesn't exist.",
        ...(typoSuggestion ? { suggestion: typoSuggestion } : {}),
      };
    }
    // eslint-disable-next-line no-console
    console.warn('[email-verification] MX lookup transient failure', { domain, code });
    return { valid: true, ...(typoSuggestion ? { suggestion: typoSuggestion } : {}) };
  }
}

/** Fast synchronous check used before the async DNS call. */
export function isDisposableEmail(email: string): boolean {
  const domain = extractDomain(email);
  return domain !== null && DISPOSABLE_DOMAINS.has(domain);
}
