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
      return { valid: false, reason: 'no_mx_record', message: "Email domain doesn't accept mail." };
    }
    const allEmptyExchange = records.every((r) => !r.exchange || r.exchange.trim() === '' || r.exchange === '.');
    if (allEmptyExchange) {
      return { valid: false, reason: 'no_mx_record', message: "Email domain doesn't accept mail." };
    }
    return { valid: true };
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code ?? '';
    if (code === 'ENODATA' || code === 'ENOTFOUND' || code === 'ESERVFAIL' || code === 'EREFUSED') {
      return { valid: false, reason: 'no_mx_record', message: "Email domain doesn't exist." };
    }
    // eslint-disable-next-line no-console
    console.warn('[email-verification] MX lookup transient failure', { domain, code });
    return { valid: true };
  }
}

/** Fast synchronous check used before the async DNS call. */
export function isDisposableEmail(email: string): boolean {
  const domain = extractDomain(email);
  return domain !== null && DISPOSABLE_DOMAINS.has(domain);
}
