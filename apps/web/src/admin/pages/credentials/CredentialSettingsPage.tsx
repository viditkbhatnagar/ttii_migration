import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Search, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PageLoader } from '@/components/ui/page-loader';
import { Table, TableBody, TableHeader, TableRow } from '@/components/ui/table';
import { useConfirm } from '@/components/confirm-dialog';
import { cn } from '@/lib/utils';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { messageFromError } from '../../shared/utils/admin-data-utils.js';
import { EmptyState, PageTitle } from '../../shared/components/ui-kit.js';
import { FilterSelect, PillTab } from '../students/list-chrome.js';
import { AccessUnavailable } from './AccessUnavailable.js';
import { openPrivateImage } from './settings/ImageField.js';
import { SettingEditorDialog } from './settings/SettingEditorDialog.js';
import { EMPTY_MESSAGE, RowActions, RowCells, SEARCH_PLACEHOLDER, TableHeaders, searchText } from './settings/SettingsTable.js';
import { TemplatePreview } from './settings/TemplatePreview.js';
import {
  DOC_TYPES, PASS_RULES, SETTING_TABS, toConfigRows, toOfferingOptions, toSeriesRows,
  type ConfigRow, type OfferingOption, type SeriesRow, type SettingTab,
} from './settings/settings-model.js';
import { useCredentialPermissions } from './use-credential-permissions.js';

// Credential Manager → Settings (spec §1.7): seven pill tabs, each a searchable
// table with Add / Edit / Delete. The server validates, versions and audits.

type Row = ConfigRow | SeriesRow;
type StatusFilter = 'all' | 'active' | 'inactive';

export default function CredentialSettingsPage(props: AdminPageProps) {
  const perms = useCredentialPermissions(props.api, props.session.token, props.session.roleId);
  if (!perms) return <PageLoader label="Loading settings..." />;
  if (!perms.settings) return <AccessUnavailable what="Credential settings" />;
  return <SettingsBody {...props} />;
}

function SettingsBody({ api, session }: AdminPageProps) {
  const token = session.token;
  const confirm = useConfirm();
  const [tab, setTab] = useState<SettingTab>('rule');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [filter, setFilter] = useState('');
  const [editing, setEditing] = useState<{ row: Row | null } | null>(null);
  const [previewing, setPreviewing] = useState<ConfigRow | null>(null);

  const lookups = useAdminPageData(async () => {
    const [options, signatories] = await Promise.all([api.loadCredentialSettingsOptions(token), api.listCredentialSettings(token, 'signatory')]);
    return { offerings: toOfferingOptions(options.offerings), signatories: toConfigRows(signatories.rows).filter((s) => s.active), notice: String(options.message ?? '') };
  }, []);
  const list = useAdminPageData(() => api.listCredentialSettings(token, tab), [tab]);
  const offerings: OfferingOption[] = lookups.data?.offerings ?? [];
  const signatories = lookups.data?.signatories ?? [];

  useEffect(() => { setSearch(''); setStatusFilter('all'); setFilter(''); }, [tab]);

  const rows: Row[] = useMemo(() => (tab === 'number_series' ? toSeriesRows(list.data?.rows) : toConfigRows(list.data?.rows)), [tab, list.data]);
  const ready = list.data?.ready !== false;
  const notice = String(list.data?.message ?? '');

  const counts = useMemo(() => {
    if (tab === 'number_series') return { all: rows.length, active: 0, inactive: 0 };
    const cfg = rows as ConfigRow[];
    return { all: cfg.length, active: cfg.filter((r) => r.active).length, inactive: cfg.filter((r) => !r.active).length };
  }, [rows, tab]);

  const filterOptions = tab === 'rule' ? offerings.map((o) => ({ value: String(o.id), label: o.title }))
    : tab === 'template' ? [...DOC_TYPES] : tab === 'grading' ? [...PASS_RULES] : [];
  const filterLabel = tab === 'rule' ? 'Course offering' : tab === 'template' ? 'Document type' : 'Pass rule';

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (tab !== 'number_series') {
        const active = (r as ConfigRow).active;
        if (statusFilter === 'active' && !active) return false;
        if (statusFilter === 'inactive' && active) return false;
      }
      if (filter) {
        const c = r as ConfigRow;
        if (tab === 'rule' && String(c.offeringId) !== filter) return false;
        if (tab === 'template' && c.data.docType !== filter) return false;
        if (tab === 'grading' && c.data.passRule !== filter) return false;
      }
      return q === '' || searchText(tab, r, offerings).toLowerCase().includes(q);
    });
  }, [rows, tab, search, statusFilter, filter, offerings]);

  const remove = async (row: Row) => {
    if (!(await confirm({ title: 'Delete this setting?', description: 'The change is recorded in the audit history.', confirmText: 'Delete', variant: 'destructive' }))) return;
    try {
      const out = await api.deleteCredentialSetting(token, tab, row.id);
      if (out.status !== 1) { toast.error(out.message || 'Could not delete.'); return; }
      toast.success('Setting deleted');
      list.reload();
      lookups.reload();
    } catch (error) { toast.error(messageFromError(error) || 'Could not delete.'); }
  };

  const meta = SETTING_TABS.find((t) => t.id === tab) as (typeof SETTING_TABS)[number];
  const previewTemplate = previewing && {
    docType: String(previewing.data.docType ?? 'certificate'), level: String(previewing.data.level ?? ''), offeringId: previewing.offeringId,
    fields: (Array.isArray(previewing.data.fields) ? previewing.data.fields : []).map(String),
    signatoryIds: (Array.isArray(previewing.data.signatoryIds) ? previewing.data.signatoryIds : []).map(Number),
    backContent: String(previewing.data.backContent ?? ''), backgroundKey: String(previewing.data.backgroundKey ?? ''),
  };

  return (
    <div className="space-y-6">
      <PageTitle title="Settings" subtitle="Completion rules, templates, numbering, signatories, grading, holds and couriers" />

      <div role="group" aria-label="Settings sections" className="flex flex-wrap gap-2">
        {SETTING_TABS.map((t) => (
          <button
            key={t.id} type="button" aria-pressed={tab === t.id} onClick={() => setTab(t.id)}
            className={cn('rounded-full border px-4 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40', tab === t.id ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-muted-foreground hover:text-foreground')}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{meta.label}</h2>
        <Button size="sm" className="gap-1.5" disabled={!ready} onClick={() => setEditing({ row: null })}>
          <Plus aria-hidden="true" className="size-4" /> Add {meta.noun}
        </Button>
      </div>

      {!ready || lookups.data?.notice ? (
        <p role="status" className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">{notice || lookups.data?.notice}</p>
      ) : null}

      <Card className="gap-0 border-border/70 p-4 shadow-[var(--shadow-soft)]">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input aria-label={SEARCH_PLACEHOLDER[tab]} placeholder={SEARCH_PLACEHOLDER[tab]} className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          {tab === 'number_series' ? <PillTab active label="All" count={counts.all} onClick={() => undefined} /> : (
            <div role="group" aria-label="Status" className="flex gap-2">
              <PillTab active={statusFilter === 'all'} label="All" count={counts.all} onClick={() => setStatusFilter('all')} />
              <PillTab active={statusFilter === 'active'} label="Active" count={counts.active} onClick={() => setStatusFilter('active')} />
              <PillTab active={statusFilter === 'inactive'} label="Inactive" count={counts.inactive} onClick={() => setStatusFilter('inactive')} />
            </div>
          )}
          {filterOptions.length > 0 ? <FilterSelect label={filterLabel} value={filter} onChange={setFilter} allLabel={`All ${filterLabel.toLowerCase()}s`} options={filterOptions} className="max-w-[240px]" /> : null}
        </div>
      </Card>

      <Card className="gap-0 overflow-hidden border-border/70 p-0 shadow-[var(--shadow-soft)]">
        {list.loading && !list.data ? <PageLoader label="Loading..." /> : list.error && !list.data ? (
          <p role="alert" className="p-6 text-center text-sm text-red-600">{list.error} <Button variant="outline" size="sm" onClick={list.reload}>Retry</Button></p>
        ) : shown.length === 0 ? (
          <EmptyState icon={Settings2} title={rows.length === 0 ? EMPTY_MESSAGE[tab] : 'Nothing matches your search.'} />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableHeaders tab={tab} /></TableHeader>
              <TableBody>
                {shown.map((r) => (
                  <TableRow key={r.id} className="hover:bg-muted/30">
                    <RowCells tab={tab} row={r} offerings={offerings} onViewImage={(key) => { void openPrivateImage(api, token, key); }} />
                    <RowActions tab={tab} row={r} onPreview={() => setPreviewing(r as ConfigRow)} onEdit={() => setEditing({ row: r })} onDelete={() => { void remove(r); }} />
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {editing ? (
        <SettingEditorDialog
          key={editing.row ? `${tab}-${editing.row.id}` : `${tab}-new`}
          tab={tab} row={editing.row} offerings={offerings} signatories={signatories} api={api} token={token}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); list.reload(); lookups.reload(); }}
        />
      ) : null}
      {previewTemplate ? <TemplatePreview template={previewTemplate} offerings={offerings} signatories={signatories} api={api} token={token} onClose={() => setPreviewing(null)} /> : null}
    </div>
  );
}
