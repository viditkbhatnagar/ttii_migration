import { useEffect, useState } from 'react';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { AdminPortalApi } from '../../../admin-portal-api.js';
import { EmptyState, Pill } from '../../../shared/components/ui-kit.js';
import { PageLoader } from '@/components/ui/page-loader';
import { dash, fmtDate, fmtDateTime, humanKey, initialsOf } from '../credential-format.js';
import type { IssuedDetail, IssuedRow } from '../credential-issue-types.js';
import { FileText } from 'lucide-react';
import type { IssuedActions, ReasonKind } from './useIssuedActions.js';
import { STATUS_LABEL, STATUS_TONE } from './issued-model.js';

type Col<T> = [header: string, render: (row: T) => React.ReactNode];

function MiniTable<T extends { id: number }>({ rows, cols, empty }: { rows: T[]; cols: Array<Col<T>>; empty: string }) {
  if (rows.length === 0) return <p className="py-6 text-center text-sm text-muted-foreground">{empty}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-xs text-muted-foreground">
          <tr>{cols.map(([h]) => <th key={h} className="whitespace-nowrap border-b border-border px-3 py-2 font-medium">{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-border last:border-b-0">
              {cols.map(([h, f]) => <td key={h} className="max-w-72 px-3 py-2 align-top">{f(r)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const docCols: Array<Col<IssuedRow>> = [
  ['Document no.', (r) => r.documentNo], ['Document type', (r) => r.docTypeLabel], ['Version', (r) => r.version],
  ['Status', (r) => <Pill tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Pill>], ['Issue date', (r) => fmtDate(r.issueDate)], ['Verification ID', (r) => r.verificationId],
];

export function IssuedDetailView({ api, token, id, reloadKey, canRevoke, actions, onBack, onAsk }: {
  api: AdminPortalApi; token: string; id: number; reloadKey: number; canRevoke: boolean; actions: IssuedActions;
  onBack: () => void; onAsk: (kind: ReasonKind, r: IssuedRow) => void;
}) {
  const [detail, setDetail] = useState<IssuedDetail | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let live = true;
    api.credentialIssuedDetail(token, id)
      .then((res) => { if (!live) return; if (res.ok && res.data) { setDetail(res.data); setError(''); } else setError(res.message || 'Could not load the document.'); })
      .catch((e: unknown) => { if (live) setError(e instanceof Error ? e.message : 'Could not load the document.'); });
    return () => { live = false; };
  }, [api, token, id, reloadKey]);

  const back = <Button variant="ghost" className="-ml-2 w-fit gap-1" onClick={onBack}><ArrowLeft aria-hidden="true" className="size-4" /> Back to Issued</Button>;
  if (error) return <div className="grid gap-4">{back}<EmptyState icon={FileText} title="Could not load the document" body={error} /></div>;
  if (!detail) return <div className="grid gap-4">{back}<PageLoader /></div>;
  const { row } = detail;
  const valid = row.status === 'valid';
  const printed = detail.events.filter((e) => e.copyType);
  return (
    <div className="grid gap-5">
      {back}
      <Card className="@container gap-0 overflow-hidden p-0">
        <div className="h-1.5 bg-primary" />
        <div className="grid gap-5 p-5 @3xl:grid-cols-[1fr_auto]">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xl font-semibold text-primary">{initialsOf(row.learner)}</div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-semibold">{row.learner}</h2>
                <Pill tone={STATUS_TONE[row.status]}>{STATUS_LABEL[row.status]}</Pill>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{row.docTypeLabel} · Version {row.version} · {row.course}</p>
              <dl className="mt-4 grid grid-cols-2 gap-x-8 gap-y-3 @xl:grid-cols-4">
                {([['Document no.', row.documentNo], ['Verification ID', row.verificationId], ['Enrolment no.', row.enrolmentNo], ['Issue date', fmtDate(row.issueDate)]] as const).map(([l, v]) => (
                  <div key={l}><dt className="text-xs text-muted-foreground">{l}</dt><dd className="mt-0.5 break-all text-sm font-medium">{dash(v)}</dd></div>
                ))}
              </dl>
            </div>
          </div>
          <div className="flex flex-wrap content-start gap-2 @3xl:max-w-sm @3xl:justify-end">
            <Button disabled={actions.busy} onClick={() => void actions.download(row)}>Download PDF</Button>
            <Button variant="outline" disabled={!valid || actions.busy} onClick={() => void actions.print(row)}>Print Original</Button>
            <Button variant="outline" disabled={!valid || actions.busy} onClick={() => void actions.resend(row)}>Resend portal link</Button>
            <Button variant="outline" disabled={!valid} onClick={() => onAsk('Duplicate', row)}>Duplicate copy</Button>
            <Button variant="outline" disabled={!valid} onClick={() => onAsk('Correction', row)}>Correction</Button>
            {canRevoke ? (
              <Button variant={row.status === 'revoked' ? 'outline' : 'destructive'} disabled={row.status === 'superseded'} onClick={() => onAsk(row.status === 'revoked' ? 'Restore' : 'Revoke', row)}>
                {row.status === 'revoked' ? 'Restore' : 'Revoke'}
              </Button>
            ) : null}
          </div>
        </div>
      </Card>
      <Tabs defaultValue="document">
        <TabsList className="h-auto flex-wrap justify-start">
          <TabsTrigger value="document">Document</TabsTrigger>
          <TabsTrigger value="versions">Versions & linked documents</TabsTrigger>
          <TabsTrigger value="prints">Print history</TabsTrigger>
          <TabsTrigger value="delivery">Delivery history</TabsTrigger>
          <TabsTrigger value="scans">Scan history</TabsTrigger>
          <TabsTrigger value="audit">Audit trail</TabsTrigger>
        </TabsList>
        <Card className="mt-3 p-4">
          <TabsContent value="document" className="grid gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" disabled={actions.busy} onClick={() => void actions.openPdf(row)}>{row.hasPdf ? 'Open PDF' : 'PDF not generated'}</Button>
              {!row.hasPdf ? <Button size="sm" disabled={actions.busy} onClick={() => void actions.regenerate(row)}>Regenerate PDF</Button> : null}
              <Button variant="outline" size="sm" className="gap-1" onClick={() => actions.verify(detail.publicUrl)}>Verification</Button>
              <a className="inline-flex items-center gap-1 text-sm text-primary hover:underline" href={detail.publicUrl} target="_blank" rel="noopener noreferrer">
                Open public page <ExternalLink aria-hidden="true" className="size-3.5" />
              </a>
            </div>
            <dl className="grid gap-x-8 gap-y-3 @xl:grid-cols-2">
              {Object.entries(detail.fields).map(([k, v]) => (
                <div key={k}><dt className="text-xs text-muted-foreground">{humanKey(k)}</dt><dd className="break-words text-sm font-medium">{dash(v)}</dd></div>
              ))}
            </dl>
          </TabsContent>
          <TabsContent value="versions" className="grid gap-4">
            <MiniTable rows={detail.versions} cols={docCols} empty="No other versions." />
            {detail.linked.length > 0 ? <><h3 className="text-sm font-semibold">Linked documents</h3><MiniTable rows={detail.linked} cols={docCols} empty="" /></> : null}
          </TabsContent>
          <TabsContent value="prints">
            <MiniTable rows={printed} empty="No print history." cols={[
              ['When', (e) => fmtDateTime(e.at)], ['Action', (e) => e.action], ['Copy', (e) => humanKey(e.copyType)], ['Reason', (e) => dash(e.reason)], ['By', (e) => dash(e.user)],
            ]} />
          </TabsContent>
          <TabsContent value="delivery">
            <MiniTable rows={detail.deliveryHistory} empty="No delivery history." cols={[
              ['When', (e) => fmtDateTime(e.at)], ['By', (e) => dash(e.user)], ['Action', (e) => e.action], ['Before', (e) => dash(e.before)], ['After', (e) => dash(e.after)], ['Reason', (e) => dash(e.reason)],
            ]} />
          </TabsContent>
          <TabsContent value="scans">
            <MiniTable rows={detail.scans} empty="This document has not been scanned yet." cols={[
              ['When', (s) => fmtDateTime(s.at)], ['Country', (s) => dash(s.country)], ['City', (s) => dash(s.city)], ['Device', (s) => dash(s.device)], ['Method', (s) => humanKey(s.method)], ['Status', (s) => dash(s.status)],
            ]} />
          </TabsContent>
          <TabsContent value="audit">
            <MiniTable rows={detail.events} empty="No audit events." cols={[
              ['When', (e) => fmtDateTime(e.at)], ['Action', (e) => e.action], ['Copy', (e) => (e.copyType ? humanKey(e.copyType) : '—')], ['Reason', (e) => dash(e.reason)], ['By', (e) => dash(e.user)], ['Before', (e) => dash(e.before)], ['After', (e) => dash(e.after)],
            ]} />
          </TabsContent>
        </Card>
      </Tabs>
    </div>
  );
}
