import type { ReactNode } from 'react';
import { Eye, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TableCell, TableHead, TableRow } from '@/components/ui/table';
import { asString } from '../../../shared/utils/admin-data-utils.js';
import { Pill } from '../../../shared/components/ui-kit.js';
import {
  cgpaLabel, dmyOf, docTypeLabel, passRuleLabel, type ConfigRow, type OfferingOption, type SeriesRow, type SettingTab,
} from './settings-model.js';

// Column sets per tab (spec §1.7) and row cells. Rows for Number Series are SeriesRow, all others ConfigRow.

export const COLUMNS: Record<SettingTab, string[]> = {
  rule: ['Course offering', 'Rule type', 'Version', 'Effective from', 'Auto-issue', 'Status'],
  template: ['Template', 'Document type', 'Applies to', 'Version', 'Effective from', 'Front background', 'Status'],
  number_series: ['Document type', 'Prefix', 'Year', 'Padding', 'Next number', 'Reset yearly', 'Example'],
  signatory: ['Name', 'Designation', 'Signature image', 'Valid from', 'Valid to', 'Status'],
  grading: ['Scheme', 'Scale maximum', 'Pass minimum (%)', 'Pass rule', 'CGPA method', 'Linked offerings', 'Status'],
  hold_reason: ['Reason', 'Status'],
  courier: ['Courier partner', 'Tracking URL pattern', 'Status'],
};

export const EMPTY_MESSAGE: Record<SettingTab, string> = {
  rule: 'No completion rules for TTII-issued offerings.', template: 'No templates yet.', number_series: 'No number series yet.',
  signatory: 'No signatories yet.', grading: 'No grading schemes yet.', hold_reason: 'No hold reasons yet.', courier: 'No courier partners yet.',
};

export const SEARCH_PLACEHOLDER: Record<SettingTab, string> = {
  rule: 'Search rules…', template: 'Search templates…', number_series: 'Search series…', signatory: 'Search signatories…',
  grading: 'Search schemes…', hold_reason: 'Search reasons…', courier: 'Search couriers…',
};

const status = (active: boolean): ReactNode => <Pill tone={active ? 'emerald' : 'slate'}>{active ? 'Active' : 'Inactive'}</Pill>;

export function TableHeaders({ tab }: { tab: SettingTab }) {
  return (
    <TableRow className="bg-muted/40 hover:bg-muted/40">
      {COLUMNS[tab].map((c) => <TableHead key={c} className="whitespace-nowrap text-xs">{c}</TableHead>)}
      <TableHead className="text-right text-xs">Action</TableHead>
    </TableRow>
  );
}

const offeringTitle = (offerings: OfferingOption[], id: number | null): string => (id === null ? '' : offerings.find((o) => o.id === id)?.title ?? `Offering ${id}`);

/** The text a row is searched by. */
export function searchText(tab: SettingTab, row: ConfigRow | SeriesRow, offerings: OfferingOption[]): string {
  if (tab === 'number_series') { const r = row as SeriesRow; return `${r.docType} ${docTypeLabel(r.docType)} ${r.prefix} ${r.year} ${r.example}`; }
  const r = row as ConfigRow;
  return `${r.name} ${offeringTitle(offerings, r.offeringId)} ${asString(r.data.ruleType)} ${asString(r.data.designation)} ${asString(r.data.docType)} ${asString(r.data.level)}`;
}

export function RowCells({ tab, row, offerings, onViewImage }: {
  tab: SettingTab; row: ConfigRow | SeriesRow; offerings: OfferingOption[]; onViewImage: (key: string) => void;
}) {
  const fileLink = (key: unknown, label: string) => (typeof key === 'string' && key
    ? <Button type="button" variant="link" size="sm" className="h-auto p-0" onClick={() => onViewImage(key)}>{label}</Button>
    : <span className="text-muted-foreground">None</span>);

  if (tab === 'number_series') {
    const r = row as SeriesRow;
    return (
      <>
        <TableCell className="text-sm font-medium">{docTypeLabel(r.docType)}</TableCell>
        <TableCell className="font-mono text-xs">{r.prefix}</TableCell>
        <TableCell className="text-sm tabular-nums">{r.year}</TableCell>
        <TableCell className="text-sm tabular-nums">{r.padding}</TableCell>
        <TableCell className="text-sm tabular-nums">{r.nextNumber}</TableCell>
        <TableCell className="text-sm">{r.resetYearly ? 'Yes' : 'No'}</TableCell>
        <TableCell className="font-mono text-xs">{r.example}</TableCell>
      </>
    );
  }
  const r = row as ConfigRow;
  const d = r.data;
  switch (tab) {
    case 'rule': return (
      <>
        <TableCell className="max-w-xs text-sm font-medium">{offeringTitle(offerings, r.offeringId) || '—'}</TableCell>
        <TableCell className="text-sm">{asString(d.ruleType)}</TableCell>
        <TableCell className="text-sm tabular-nums">v{r.version}</TableCell>
        <TableCell className="whitespace-nowrap text-sm">{dmyOf(r.effectiveFrom)}</TableCell>
        <TableCell className="text-sm">{d.autoIssue === true ? 'Yes' : 'No'}</TableCell>
        <TableCell>{status(r.active)}</TableCell>
      </>
    );
    case 'template': return (
      <>
        <TableCell className="text-sm font-medium">{r.name}</TableCell>
        <TableCell className="text-sm">{docTypeLabel(asString(d.docType))}</TableCell>
        <TableCell className="max-w-xs text-sm">{r.offeringId === null ? `Level: ${asString(d.level)}` : offeringTitle(offerings, r.offeringId)}</TableCell>
        <TableCell className="text-sm tabular-nums">v{r.version}</TableCell>
        <TableCell className="whitespace-nowrap text-sm">{dmyOf(r.effectiveFrom)}</TableCell>
        <TableCell>{fileLink(d.backgroundKey, 'View')}</TableCell>
        <TableCell>{status(r.active)}</TableCell>
      </>
    );
    case 'signatory': return (
      <>
        <TableCell className="text-sm font-medium">{r.name}</TableCell>
        <TableCell className="text-sm">{asString(d.designation)}</TableCell>
        <TableCell>{fileLink(d.signatureKey, 'View')}</TableCell>
        <TableCell className="whitespace-nowrap text-sm">{dmyOf(asString(d.validFrom))}</TableCell>
        <TableCell className="whitespace-nowrap text-sm">{dmyOf(asString(d.validTo)) || 'Open'}</TableCell>
        <TableCell>{status(r.active)}</TableCell>
      </>
    );
    case 'grading': {
      const linked = (Array.isArray(d.offeringIds) ? d.offeringIds : []).map((id) => offeringTitle(offerings, Number(id))).filter(Boolean);
      return (
        <>
          <TableCell className="text-sm font-medium">{r.name}</TableCell>
          <TableCell className="text-sm tabular-nums">{asString(d.scaleMax)}</TableCell>
          <TableCell className="text-sm tabular-nums">{asString(d.passMinimum)}</TableCell>
          <TableCell className="text-sm">{passRuleLabel(asString(d.passRule))}</TableCell>
          <TableCell className="text-sm">{cgpaLabel(asString(d.cgpaMethod))}</TableCell>
          <TableCell className="max-w-xs text-sm">{linked.length ? linked.join(', ') : 'Default for all'}</TableCell>
          <TableCell>{status(r.active)}</TableCell>
        </>
      );
    }
    case 'courier': return (
      <>
        <TableCell className="text-sm font-medium">{r.name}</TableCell>
        <TableCell className="max-w-sm break-all font-mono text-xs">{asString(d.trackingUrlPattern)}</TableCell>
        <TableCell>{status(r.active)}</TableCell>
      </>
    );
    default: return (
      <>
        <TableCell className="text-sm font-medium">{r.name}</TableCell>
        <TableCell>{status(r.active)}</TableCell>
      </>
    );
  }
}

export function RowActions({ tab, row, onPreview, onEdit, onDelete }: {
  tab: SettingTab; row: ConfigRow | SeriesRow; onPreview: () => void; onEdit: () => void; onDelete: () => void;
}) {
  const retained = tab === 'rule' && (row as ConfigRow).active;
  return (
    <TableCell className="whitespace-nowrap text-right">
      {tab === 'template' ? <Button size="sm" variant="ghost" className="gap-1" onClick={onPreview}><Eye aria-hidden="true" className="size-4" /> Preview</Button> : null}
      <Button size="sm" variant="ghost" className="gap-1" onClick={onEdit}><Pencil aria-hidden="true" className="size-4" /> Edit</Button>
      <Button
        size="sm" variant="ghost" className="gap-1 text-destructive hover:text-destructive" disabled={retained}
        title={retained ? 'Active versions are retained' : undefined} onClick={onDelete}
      >
        <Trash2 aria-hidden="true" className="size-4" /> {retained ? 'Active versions are retained' : 'Delete'}
      </Button>
    </TableCell>
  );
}
