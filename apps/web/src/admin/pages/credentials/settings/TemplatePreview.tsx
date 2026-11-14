import { useEffect, useState } from 'react';
import { Award, QrCode, UserRound } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { AdminPortalApi } from '../../../admin-portal-api.js';
import { docTypeLabel, type ConfigRow, type OfferingOption } from './settings-model.js';

// HTML mock-up of the template at A4 ratio with static sample values
// (spec §7.3; CredentialTemplatePreview.tsx). Private images load through
// short-lived signed URLs and are simply omitted when a URL is unavailable.

export interface PreviewTemplate {
  docType: string; level: string; offeringId: number | null; fields: string[]; signatoryIds: number[]; backContent: string; backgroundKey: string;
}

const WIDTH = 'min(820px, calc(100vw - 2rem))';

async function signed(api: AdminPortalApi, token: string, key: string): Promise<string> {
  if (!key) return '';
  try { return await api.credentialSettingFileUrl(token, key); } catch { return ''; }
}

export function TemplatePreview({ template, offerings, signatories, api, token, onClose }: {
  template: PreviewTemplate; offerings: OfferingOption[]; signatories: ConfigRow[]; api: AdminPortalApi; token: string; onClose: () => void;
}) {
  const [background, setBackground] = useState('');
  const [signatures, setSignatures] = useState<Record<number, string>>({});
  const chosen = signatories.filter((s) => template.signatoryIds.includes(s.id));

  useEffect(() => {
    let live = true;
    void signed(api, token, template.backgroundKey).then((u) => { if (live) setBackground(u); });
    void Promise.all(chosen.map(async (s) => [s.id, await signed(api, token, String(s.data.signatureKey ?? ''))] as const))
      .then((pairs) => { if (live) setSignatures(Object.fromEntries(pairs)); });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, token, template.backgroundKey, template.signatoryIds.join(',')]);

  const has = (field: string) => template.fields.includes(field);
  const offering = offerings.find((o) => o.id === template.offeringId);
  const isMarksheet = template.docType === 'marksheet' || template.docType === 'transcript';
  const facts: Array<[string, string]> = [
    ['Level', template.level || offering?.level || 'Diploma'], ['Duration', '12 months'], ['Credits', '30'], ['CGPA', '8.50'], ['Grade', 'A'], ['Exam month/year', 'November 2026'],
  ];

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-h-[92vh] overflow-y-auto" style={{ width: WIDTH, maxWidth: WIDTH }}>
        <DialogHeader><DialogTitle>Preview</DialogTitle></DialogHeader>
        <div className="relative isolate mx-auto flex aspect-[210/297] w-full max-w-[620px] flex-col border-2 border-primary/40 bg-card p-5 sm:p-10">
          {background ? <img src={background} alt="Template background" className="absolute inset-0 -z-10 h-full w-full object-cover" onError={() => setBackground('')} /> : null}
          <header className="flex items-center justify-between border-b border-primary/30 pb-5">
            <div><p className="text-3xl font-bold text-primary">TTII</p><p className="text-xs text-muted-foreground">Academic credentials</p></div>
            <Award aria-hidden="true" className="size-10 text-primary" />
          </header>
          <p className="mt-7 text-center text-xl font-semibold">{docTypeLabel(template.docType)}</p>
          {isMarksheet ? null : <p className="mt-6 text-center text-sm text-muted-foreground">This is to certify that</p>}
          {has('Learner name') ? <h2 className="mt-4 text-center text-2xl font-semibold">Anjali Menon</h2> : null}
          {has('Photo') ? <div className="mx-auto mt-3 flex size-16 items-center justify-center rounded-md bg-muted"><UserRound aria-hidden="true" className="size-8 text-muted-foreground" /></div> : null}
          {has('Enrolment no.') ? <p className="mt-2 text-center text-xs text-muted-foreground">Enrolment: TTII/ENR/2026/001001</p> : null}
          {has('Programme title') ? <p className="mt-5 text-center text-base font-semibold">{offering?.course || offering?.title || 'Early Years Education'}</p> : null}
          <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
            {facts.filter(([f]) => has(f)).map(([f, v]) => <div key={f}><span className="text-xs text-muted-foreground">{f}</span><p>{v}</p></div>)}
          </div>
          {isMarksheet ? (
            <div className="mt-6 divide-y divide-border text-sm">
              <div className="grid grid-cols-3 bg-muted p-2 font-semibold"><span>Subject</span><span>Credits</span><span>Grade</span></div>
              {['Foundations', 'Practicum', 'Assessment'].map((subject) => <div key={subject} className="grid grid-cols-3 p-2"><span>{subject}</span><span>10</span><span>A</span></div>)}
            </div>
          ) : null}
          <div className="mt-auto pt-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              {has('QR') ? <div className="text-center"><QrCode aria-hidden="true" className="size-12" /><p className="mt-1 text-[10px] text-muted-foreground">QR</p></div> : null}
              {has('Signatories') ? chosen.map((s) => (
                <div key={s.id} className="text-center">
                  {signatures[s.id] ? <img src={signatures[s.id]} alt={`${s.name} signature`} className="mx-auto h-9 max-w-32 object-contain" /> : null}
                  <p className="text-sm font-medium">{s.name}</p>
                  <p className="text-xs text-muted-foreground">{String(s.data.designation ?? '')}</p>
                </div>
              )) : null}
            </div>
            <div className="mt-6 flex flex-wrap justify-between gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
              {has('Document no.') ? <span>Document no.: Not allocated</span> : null}
              {has('Issue date') ? <span>Issue date: 12 Nov 2026</span> : null}
            </div>
          </div>
        </div>
        {template.backContent ? (
          <section className="border-t border-border pt-4">
            <h3 className="text-sm font-semibold">Back-side text</h3>
            <p className="mt-3 whitespace-pre-wrap text-sm">{template.backContent}</p>
          </section>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
