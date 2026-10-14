import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Save, UserPlus, UsersRound } from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { AdminPortalApi } from '../../admin-portal-api.js';
import { messageFromError } from '../../shared/utils/admin-data-utils.js';
import { Field, OrgDialog, SELECT_CLASS, TEXTAREA_CLASS } from '../teams/org-dialog-kit.js';
import { useOrgOptions } from '../teams/use-org-options.js';
import {
  ORG_DESCRIPTION_MAX, ORG_NAME_MAX, directMemberIds, groupCounsellorPickerItems, roleLabel, teamPickerItems, validateOrgForm,
  type GroupRow, type OrgFormErrors, type OrgOptions, type OrgStatus,
} from '../teams/org-model.js';
import { NotReadyNotice, PickerList } from '../teams/org-ui.js';

// Create / Edit Group and Manage Teams (Naji's CreateGroupDialog,
// EditGroupDialog, ManageTeamsDialog). Assigning a team that sits in another
// group moves it here (the badge says so before saving).
// Assign Counsellors (Naji 2026-10-14): counsellors in no team can be filed
// directly under the group. One group per counsellor — those in a team are
// shown locked; a direct member of another group moves here on save.

interface FormState { name: string; managerId: string; status: OrgStatus; description: string }

const toggle = (id: string) => (prev: Set<string>) => {
  const next = new Set(prev);
  if (next.has(id)) next.delete(id); else next.add(id);
  return next;
};

export function GroupFormDialog({ open, group, api, token, onClose, onSaved }: {
  open: boolean; group: GroupRow | null; api: AdminPortalApi; token: string; onClose: () => void; onSaved: (id: string) => void;
}) {
  const { options, error: loadError } = useOrgOptions(api, token, open);
  const [f, setF] = useState<FormState>({ name: '', managerId: '', status: 'active', description: '' });
  const [teams, setTeams] = useState<Set<string>>(new Set());
  const [counsellors, setCounsellors] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<OrgFormErrors>({});
  const [saving, setSaving] = useState(false);
  const isCreate = group === null;

  useEffect(() => {
    if (!open) return;
    setF(group
      ? { name: group.name, managerId: group.managerId, status: group.status, description: group.description }
      : { name: '', managerId: '', status: 'active', description: '' });
    setTeams(new Set());
    setCounsellors(new Set());
    setErrors({});
  }, [open, group]);
  // Editing: start from the group's current direct counsellors once the pickers load.
  useEffect(() => {
    if (options) setCounsellors(new Set(directMemberIds(options, group?.id ?? '')));
  }, [options, group]);

  const set = <K extends keyof FormState>(k: K) => (v: FormState[K]) => {
    setF((s) => ({ ...s, [k]: v }));
    setErrors((e) => ({ ...e, [k === 'managerId' ? 'owner' : k]: undefined }));
  };
  const managers = useMemo(() => {
    const list = options?.leaders ?? [];
    if (group?.managerId && !list.some((l) => l.id === group.managerId)) {
      return [{ id: group.managerId, name: `${group.managerName} (no longer eligible)`, roleId: 0 }, ...list];
    }
    return list;
  }, [options, group]);
  const items = useMemo(() => (options ? teamPickerItems(options, '') : []), [options]);
  const counsellorItems = useMemo(() => (options ? groupCounsellorPickerItems(options, group?.id ?? '') : []), [options, group]);
  const directReady = options?.directReady === true;

  const save = async () => {
    const found = validateOrgForm('Group', f.name, f.managerId, f.description);
    if (Object.keys(found).length > 0) { setErrors(found); return; }
    setSaving(true);
    try {
      const res = await api.saveCounsellorGroup(token, {
        ...(group ? { id: group.id } : { team_ids: [...teams] }),
        // Sent only once direct members exist; on edit it is the full list (unticked = released).
        ...(directReady ? { counsellor_ids: [...counsellors] } : {}),
        name: f.name.trim(), manager_user_id: f.managerId, status: f.status, description: f.description.trim(),
      });
      toast.success(res.message);
      onSaved(res.id);
      onClose();
    } catch (err) {
      toast.error(messageFromError(err));
    } finally {
      setSaving(false);
    }
  };

  const ready = options?.ready !== false;
  return (
    <OrgDialog
      open={open}
      title={isCreate ? 'Create Group' : 'Edit Group'}
      description={isCreate ? 'Set up a new group and assign teams and counsellors under a group manager.' : `Update details for ${group?.name ?? 'this group'}.`}
      saving={saving}
      saveLabel={isCreate ? 'Create Group' : 'Save Changes'}
      saveIcon={isCreate ? <Plus aria-hidden="true" className="size-4" /> : <Save aria-hidden="true" className="size-4" />}
      canSave={!!options && ready}
      onClose={onClose}
      onSave={() => { void save(); }}
    >
      {loadError ? <p role="alert" className="text-sm text-destructive">{loadError}</p> : null}
      {options && !ready ? <NotReadyNotice message={options.message} /> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Group Name" htmlFor="group-name" required error={errors.name}>
          <Input id="group-name" value={f.name} maxLength={ORG_NAME_MAX} placeholder="e.g. North Region" aria-invalid={!!errors.name} onChange={(e) => set('name')(e.target.value)} />
        </Field>
        <Field label="Group Code" htmlFor="group-code">
          <Input id="group-code" value={group?.code ?? 'Assigned on save'} readOnly className="bg-muted/40 font-mono" />
        </Field>
        <Field label="Group Manager" htmlFor="group-manager" required error={errors.owner}>
          <select id="group-manager" className={SELECT_CLASS} value={f.managerId} aria-invalid={!!errors.owner} onChange={(e) => set('managerId')(e.target.value)}>
            <option value="">{options ? 'Select manager' : 'Loading…'}</option>
            {managers.map((m) => <option key={m.id} value={m.id}>{m.name}{roleLabel(m.roleId) ? ` · ${roleLabel(m.roleId)}` : ''}</option>)}
          </select>
        </Field>
        <Field label="Status" htmlFor="group-status" required>
          <select id="group-status" className={SELECT_CLASS} value={f.status} onChange={(e) => set('status')(e.target.value as OrgStatus)}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </Field>
        <Field label="Description" htmlFor="group-description" error={errors.description} className="sm:col-span-2">
          <textarea id="group-description" className={TEXTAREA_CLASS} rows={2} maxLength={ORG_DESCRIPTION_MAX} value={f.description} onChange={(e) => set('description')(e.target.value)} placeholder="Optional" />
        </Field>
      </div>
      {isCreate ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-foreground">Assign Teams</p>
            <span className="text-xs text-muted-foreground">{teams.size} selected</span>
          </div>
          <PickerList items={items} selected={teams} onToggle={(id) => setTeams(toggle(id))} placeholder="Search teams by name, ID or group" emptyText={options ? 'No teams yet.' : 'Loading teams…'} />
        </div>
      ) : null}
      <CounsellorPicker options={options} items={counsellorItems} selected={counsellors} onToggle={(id) => setCounsellors(toggle(id))} />
    </OrgDialog>
  );
}

/** "Assign Counsellors": counsellors filed directly under the group. */
function CounsellorPicker({ options, items, selected, onToggle }: {
  options: OrgOptions | null; items: ReturnType<typeof groupCounsellorPickerItems>; selected: Set<string>; onToggle: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-foreground">Assign Counsellors</p>
        <span className="text-xs text-muted-foreground">{selected.size} selected</span>
      </div>
      {options && !options.directReady ? (
        <p className="rounded-xl border border-dashed border-border bg-muted/30 p-3 text-xs text-muted-foreground">
          Adding counsellors directly to a group is not set up yet. Teams can still be assigned.
        </p>
      ) : (
        <>
          <PickerList items={items} selected={selected} onToggle={onToggle} placeholder="Search counsellors by name, email, team or group" emptyText={options ? 'No counsellors found.' : 'Loading counsellors…'} />
          <p className="text-[11px] text-muted-foreground">For counsellors who are not in any team. A counsellor belongs to one group only: through their team, or directly.</p>
        </>
      )}
    </div>
  );
}

export function ManageGroupCounsellorsDialog({ open, group, api, token, onClose, onSaved }: {
  open: boolean; group: { id: string; name: string }; api: AdminPortalApi; token: string; onClose: () => void; onSaved: () => void;
}) {
  const { options, error: loadError } = useOrgOptions(api, token, open);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (open) setSelected(new Set()); }, [open]);
  const items = useMemo(
    () => (options ? groupCounsellorPickerItems(options, group.id).filter((i) => !directMemberIds(options, group.id).includes(i.id)) : []),
    [options, group.id],
  );

  const save = async () => {
    setSaving(true);
    try {
      toast.success(await api.addCounsellorGroupCounsellors(token, group.id, [...selected]));
      onSaved();
      onClose();
    } catch (err) {
      toast.error(messageFromError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <OrgDialog
      open={open}
      title="Add Counsellors"
      description={`File counsellors who are not in any team directly under ${group.name}.`}
      saving={saving}
      saveLabel={selected.size > 0 ? `Add ${selected.size} Counsellor${selected.size === 1 ? '' : 's'}` : 'Add Counsellors'}
      saveIcon={<UserPlus aria-hidden="true" className="size-4" />}
      canSave={selected.size > 0 && options?.directReady === true}
      onClose={onClose}
      onSave={() => { void save(); }}
      width={600}
    >
      {loadError ? <p role="alert" className="text-sm text-destructive">{loadError}</p> : null}
      <CounsellorPicker options={options} items={items} selected={selected} onToggle={(id) => setSelected(toggle(id))} />
    </OrgDialog>
  );
}

export function ManageTeamsDialog({ open, group, api, token, onClose, onSaved }: {
  open: boolean; group: { id: string; name: string }; api: AdminPortalApi; token: string; onClose: () => void; onSaved: () => void;
}) {
  const { options, error: loadError } = useOrgOptions(api, token, open);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (open) setSelected(new Set()); }, [open]);
  const items = useMemo(() => (options ? teamPickerItems(options, group.id) : []), [options, group.id]);

  const save = async () => {
    setSaving(true);
    try {
      toast.success(await api.addCounsellorGroupTeams(token, group.id, [...selected]));
      onSaved();
      onClose();
    } catch (err) {
      toast.error(messageFromError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <OrgDialog
      open={open}
      title="Manage Teams"
      description={`Assign teams to ${group.name}. A team from another group moves here.`}
      saving={saving}
      saveLabel={selected.size > 0 ? `Assign ${selected.size} Team${selected.size === 1 ? '' : 's'}` : 'Assign Teams'}
      saveIcon={<UsersRound aria-hidden="true" className="size-4" />}
      canSave={selected.size > 0 && options?.ready !== false}
      onClose={onClose}
      onSave={() => { void save(); }}
      width={600}
    >
      {loadError ? <p role="alert" className="text-sm text-destructive">{loadError}</p> : null}
      {options && !options.ready ? <NotReadyNotice message={options.message} /> : null}
      <PickerList items={items} selected={selected} onToggle={(id) => setSelected(toggle(id))} placeholder="Search teams by name, ID or group" emptyText={options ? 'No other teams.' : 'Loading teams…'} />
    </OrgDialog>
  );
}
