import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowRight, Search, ShieldCheck, ShieldX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  consumeManualLookup, dmy, markManualLookup, utcStamp, verifyCredential, type VerifyResult, type VerifySubject,
} from './credential-verify-api.js';

// Public credential verification (/verify and /v/<verification id>). No login,
// no private data, no PDF: only what the server's PublicResult exposes.
// noindex,nofollow while mounted.

type Phase =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'result'; result: VerifyResult };

function useDocumentMeta(title: string): void {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = title;
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex,nofollow';
    document.head.appendChild(meta);
    return () => {
      document.title = previousTitle;
      meta.remove();
    };
  }, [title]);
}

const dash = (value: string | number | null | undefined): string => (value === null || value === undefined || value === '' ? '-' : String(value));

const BANNER: Record<'valid' | 'revoked' | 'superseded', { text: string; tone: string }> = {
  valid: { text: 'Verified – Valid', tone: 'border-emerald-600 bg-emerald-50 text-emerald-800' },
  revoked: { text: 'This document has been revoked and is not valid.', tone: 'border-red-600 bg-red-50 text-red-800' },
  superseded: { text: 'This document has been replaced by a newer version.', tone: 'border-amber-500 bg-amber-50 text-amber-900' },
};

function fieldsFor(r: VerifyResult): Array<[string, string]> {
  const base: Array<[string, string]> = [['Learner', r.learner], ['Programme', r.programme]];
  if (r.status === 'valid') {
    return [
      ...base,
      ['Enrolment', r.enrolment], ['Document type', r.docTypeLabel], ['Document no.', r.documentNo],
      ['Issue date', dmy(r.issueDate)], ['Total credits', dash(r.credits)], ['CGPA', dash(r.cgpa)],
      ['Letter grade', dash(r.grade)], ['Exam month/year', dash(r.examSession)], ['Issued by', r.issuedBy],
    ];
  }
  if (r.status === 'revoked') return [...base, ['Revocation date', dmy(r.revokedAt)]];
  return base;
}

function SubjectTable({ result }: { result: VerifyResult }) {
  const subjects: VerifySubject[] = result.subjects ?? [];
  const has = (key: 'credits' | 'internal' | 'practical') => subjects.some((s) => s[key] !== null);
  const cols: Array<{ label: string; cell: (s: VerifySubject) => string; numeric: boolean }> = [
    { label: 'Subject code', cell: (s) => dash(s.code), numeric: false },
    { label: 'Subject', cell: (s) => dash(s.title), numeric: false },
    ...(has('credits') ? [{ label: 'Credits', cell: (s: VerifySubject) => dash(s.credits), numeric: true }] : []),
    ...(has('internal') ? [{ label: 'Internal', cell: (s: VerifySubject) => dash(s.internal), numeric: true }] : []),
    { label: 'Theory', cell: (s) => dash(s.theory), numeric: true },
    ...(has('practical') ? [{ label: 'Practical', cell: (s: VerifySubject) => dash(s.practical), numeric: true }] : []),
    { label: 'Total', cell: (s) => dash(s.total), numeric: true },
    { label: 'Grade point', cell: (s) => dash(s.points), numeric: true },
    { label: 'Letter grade', cell: (s) => dash(s.grade), numeric: false },
    { label: 'Result', cell: (s) => dash(s.result), numeric: false },
  ];
  return (
    <section className="min-w-0">
      <h2 className="mb-4 text-lg font-semibold">Subject results</h2>
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full min-w-max text-sm">
          <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
            <tr>{cols.map((c) => <th key={c.label} scope="col" className={cn('px-3 py-2 font-medium', c.numeric && 'text-right')}>{c.label}</th>)}</tr>
          </thead>
          <tbody>
            {subjects.map((s, i) => (
              <tr key={`${s.code}-${i}`} className="border-t border-border">
                {cols.map((c) => <td key={c.label} className={cn('px-3 py-2', c.numeric && 'text-right tabular-nums')}>{c.cell(s)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-sm">
        Total credits: {dash(result.credits)} · CGPA: {dash(result.cgpa)} · Grade: {dash(result.grade)} · Final result: {dash(result.result)}
      </p>
    </section>
  );
}

function ResultView({ result, verifiedAt, onOpen }: { result: VerifyResult; verifiedAt: string; onOpen: (id: string) => void }) {
  const banner = result.status === 'not_found' ? null : BANNER[result.status];
  if (!banner) {
    return (
      <section role="status" className="border-l-4 border-border bg-muted p-5">
        <ShieldX aria-hidden="true" className="mb-3 size-9 text-muted-foreground" />
        <h1 className="text-xl font-bold">Not found</h1>
        <p className="mt-3 text-sm text-muted-foreground">No document matches this verification ID.</p>
      </section>
    );
  }
  return (
    <>
      <section role="status" className={cn('border-l-4 p-5', banner.tone)}>
        <ShieldCheck aria-hidden="true" className="mb-3 size-9" />
        <h1 className="text-xl font-bold">{banner.text}</h1>
      </section>
      <dl className="grid gap-x-8 gap-y-5 border-y border-border py-6 sm:grid-cols-2">
        {fieldsFor(result).map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="mt-1 break-words text-sm font-medium">{dash(value)}</dd>
          </div>
        ))}
      </dl>
      {result.status === 'valid' && result.subjects && result.subjects.length > 0 && <SubjectTable result={result} />}
      {result.status === 'valid' && result.related && (
        <div>
          <Button type="button" variant="outline" onClick={() => onOpen(result.related!.verificationId)}>
            Matching {result.related.docTypeLabel}
            <ArrowRight aria-hidden="true" className="size-4" />
          </Button>
        </div>
      )}
      {result.status === 'superseded' && result.replacedBy && (
        <div>
          <Button type="button" variant="outline" onClick={() => onOpen(result.replacedBy!)}>
            View newer version
            <ArrowRight aria-hidden="true" className="size-4" />
          </Button>
        </div>
      )}
      {result.status === 'valid' && <p className="text-xs text-muted-foreground">Verified on {verifiedAt}</p>}
    </>
  );
}

export default function CredentialVerifyPage({ code, onNavigate }: { code: string; onNavigate: (path: string) => void }) {
  useDocumentMeta(code ? 'Credential Verification | TTII' : 'Verify a Credential | TTII');
  const [input, setInput] = useState(code);
  const [phase, setPhase] = useState<Phase>(code ? { kind: 'loading' } : { kind: 'idle' });
  const [verifiedAt, setVerifiedAt] = useState('');
  const [nonce, setNonce] = useState(0);
  const handled = useRef('');
  const methods = useRef(new Map<string, 'qr' | 'manual'>());

  useEffect(() => {
    setInput(code);
    if (!code) {
      handled.current = '';
      setPhase({ kind: 'idle' });
      return undefined;
    }
    const key = `${code}#${nonce}`;
    if (handled.current === key) return undefined;
    handled.current = key;
    // Decided once per lookup: a re-run of this effect must not downgrade a manual lookup to QR.
    if (!methods.current.has(key)) methods.current.set(key, consumeManualLookup(code) ? 'manual' : 'qr');
    const method = methods.current.get(key) ?? 'qr';
    const controller = new AbortController();
    setPhase({ kind: 'loading' });
    verifyCredential(code, method, controller.signal)
      .then((result) => {
        setVerifiedAt(utcStamp(new Date()));
        setPhase({ kind: 'result', result });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setPhase({ kind: 'error', message: error instanceof Error ? error.message : 'The credential could not be verified.' });
      });
    return () => {
      controller.abort();
      // Allow the lookup to run again if this effect was torn down before it finished.
      if (handled.current === key) handled.current = '';
    };
  }, [code, nonce]);

  const open = (id: string) => onNavigate(`/v/${encodeURIComponent(id.toUpperCase())}`);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const id = input.trim().toUpperCase();
    if (!id) return;
    markManualLookup(id);
    if (id === code) setNonce((n) => n + 1);
    else open(id);
  };

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-5 sm:px-5">
          <img src="/logos/ttii-icon-color.svg" alt="" width={40} height={40} className="size-10 shrink-0" />
          <div>
            <p className="text-2xl font-bold leading-tight">TTII</p>
            <p className="text-xs text-muted-foreground">Credential verification</p>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-4xl space-y-6 px-4 py-7 sm:px-5">
        <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="min-w-0 flex-1 text-sm font-medium">
            Verification ID
            <Input
              className="mt-2 h-12 uppercase placeholder:normal-case"
              placeholder="XXXX-XXXX-XXXX"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              maxLength={80}
            />
          </label>
          <Button type="submit" className="h-12" disabled={!input.trim() || phase.kind === 'loading'}>
            <Search aria-hidden="true" className="size-4" />
            Verify
          </Button>
        </form>
        {phase.kind === 'idle' && (
          <section className="border-y border-border py-10">
            <h1 className="text-2xl font-bold">Verify a TTII credential</h1>
          </section>
        )}
        {phase.kind === 'loading' && <p role="status" className="text-sm text-muted-foreground">Checking this verification ID...</p>}
        {phase.kind === 'error' && (
          <section role="alert" className="border-l-4 border-border bg-muted p-5">
            <h1 className="text-xl font-bold">Verify a TTII credential</h1>
            <p className="mt-3 text-sm text-muted-foreground">{phase.message}</p>
          </section>
        )}
        {phase.kind === 'result' && <ResultView result={phase.result} verifiedAt={verifiedAt} onOpen={open} />}
      </main>
      <footer className="mx-auto mt-10 max-w-4xl border-t border-border px-4 py-6 text-xs text-muted-foreground sm:px-5">
        <p>TTII verification queries · Contact details pending confirmation.</p>
      </footer>
    </div>
  );
}
