import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Save, UserPlus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { AdminPortalApi } from '../../admin-portal-api.js';
import { messageFromError } from '../../shared/utils/admin-data-utils.js';
import { Field, OrgDialog, SELECT_CLASS, TEXTAREA_CLASS } from './org-dialog-kit.js';
import { useOrgOptions } from './use-org-options.js';
import {
  ORG_DESCRIPTION_MAX, ORG_NAME_MAX, counsellorPickerItems, roleLabel, validateOrgForm,
  type OrgFormErrors, type OrgStatus, type TeamRow,
} from './org-model.js';
import { NotReadyNotice, PickerList } from './org-ui.js';

// Create / Edit Team and Manage Members (Naji's CreateTeamDialog,
// EditTeamDialog, ManageMembersDialog). A counsellor is in at most one team:
// counsellors already in another team are listed but cannot be ticked.

interface TeamFormProps {
  open: boolean;
  /** null = create. */
  team: TeamRow | null;
  api: AdminPortalApi;
  token: string;
  onClose: () => void;
  onSaved: (id: string) => void;
}

interface FormState { name: string; leaderId: string; groupId: string; status: OrgStatus; description: string }

export function TeamFormDialog({ open, team, api, token, onClose, onSaved }: TeamFormProps) {
  const { options, error: loadError } = useOrgOptions(api, token, open);
  const [f, setF] = useState<FormState>({ name: '', leaderId: '', groupId: '', status: 'active', description: '' });
  const [members, setMembers] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<OrgFormErrors>({});
  const [saving, setSaving] = useState(false);
  const isCreate = team === null;

  useEffect(() => {
    if (!open) return;
    setF(team
      ? { name: team.name, leaderId: team.leaderId, groupId: team.groupId, status: team.status, description: team.description }
      : { name: '', leaderId: '', groupId: '', status: 'active', description: '' });
    setMembers(new Set());
    setErrors({});
  }, [open, team]);

  const set = <K extends keyof FormState>(k: K) => (v: FormState[K]) => {
    setF((s) => ({ ...s, [k]: v }));
    setErrors((e) => ({ ...e, [k === 'leaderId' ? 'owner' : k]: undefined }));
  };
  const leaders = useMemo(() => {
    const list = options?.leaders ?? [];
    if (team?.leaderId && !list.some((l) => l.id === team.leaderId)) {
      return [{ id: team.leaderId, name: `${team.leaderName} (no longer eligible)`, roleId: 0 }, ...list];
    }
    return list;
  }, [options, team]);
  const pickerItems = useMemo(() => (options ? counsellorPickerItems(options, '') : []), [options]);

  const save = async () => {
    const found = validateOrgForm('Team', f.name, f.leaderId, f.description);
    if (Object.keys(found).length > 0) { setErrors(found); return; }
    setSaving(true);
    try {
      const res = await api.saveCounsellorTeam(token, {
        ...(team ? { id: team.id } : { member_ids: [...members] }),
        name: f.name.trim(), leader_user_id: f.leaderId, group_id: f.groupId || 0, status: f.status, description: f.description.trim(),
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
      title={isCreate ? 'Create Team' : 'Edit Team'}
      description={isCreate ? 'Set up a new counsellor team and assign a team leader.' : `Update details for ${team?.name ?? 'this team'}.`}
      saving={saving}
      saveLabel={isCreate ? 'Create Team' : 'Save Changes'}
      saveIcon={isCreate ? <Plus aria-hidden="true" className="size-4" /> : <Save aria-hidden="true" className="size-4" />}
      canSave={!!options && ready}
      onClose={onClose}
      onSave={() => { void save(); }}
    >
      {loadError ? <p role="alert" className="text-sm text-destructive">{loadError}</p> : null}
      {options && !ready ? <NotReadyNotice message={options.message} /> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Team Name" htmlFor="team-name" required error={errors.name}>
          <Input id="team-name" value={f.name} maxLength={ORG_NAME_MAX} placeholder="e.g. Team Phoenix" aria-invalid={!!errors.name} onChange={(e) => set('name')(e.target.value)} />
        </Field>
        <Field label="Team Code" htmlFor="team-code">
          <Input id="team-code" value={team?.code ?? 'Assigned on save'} readOnly className="bg-muted/40 font-mono" />
        </Field>
        <Field label="Team Leader" htmlFor="team-leader" required error={errors.owner}>
          <select id="team-leader" className={SELECT_CLASS} value={f.leaderId} aria-invalid={!!errors.owner} onChange={(e) => set('leaderId')(e.target.value)}>
            <option value="">{options ? 'Select team leader' : 'Loading…'}</option>
            {leaders.map((l) => <option key={l.id} value={l.id}>{l.name}{roleLabel(l.roleId) ? ` · ${roleLabel(l.roleId)}` : ''}</option>)}
          </select>
        </Field>
        <Field label="Parent Group" htmlFor="team-group">
          <select id="team-group" className={SELECT_CLASS} value={f.groupId} onChange={(e) => set('groupId')(e.target.value)}>
            <option value="">No group</option>
            {(options?.groups ?? []).map((g) => <option key={g.id} value={g.id}>{g.name} ({g.code})</option>)}
            {team?.groupId && options && !options.groups.some((g) => g.id === team.groupId) ? <option value={team.groupId}>{team.groupName || 'Current group'}</option> : null}
          </select>
        </Field>
        <Field label="Status" htmlFor="team-status" required>
          <select id="team-status" className={SELECT_CLASS} value={f.status} onChange={(e) => set('status')(e.target.value as OrgStatus)}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </Field>
        <Field label="Description" htmlFor="team-description" error={errors.description} className="sm:col-span-2">
          <textarea id="team-description" className={TEXTAREA_CLASS} rows={2} maxLength={ORG_DESCRIPTION_MAX} value={f.description} onChange={(e) => set('description')(e.target.value)} placeholder="Optional" />
        </Field>
      </div>
      {isCreate ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-foreground">Add Team Members</p>
            <span className="text-xs text-muted-foreground">{members.size} selected</span>
          </div>
          <PickerList
            items={pickerItems}
            selected={members}
            onToggle={(id) => setMembers((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; })}
            placeholder="Search counsellors by name, email or team"
            emptyText={options ? 'No counsellors found.' : 'Loading counsellors…'}
          />
          <p className="text-[11px] text-muted-foreground">A counsellor can be in one team only. Counsellors already in a team are shown but locked.</p>
        </div>
      ) : null}
    </OrgDialog>
  );
}

export function ManageMembersDialog({ open, team, api, token, onClose, onSaved }: {
  open: boolean; team: { id: string; name: string }; api: AdminPortalApi; token: string; onClose: () => void; onSaved: () => void;
}) {
  const { options, error: loadError } = useOrgOptions(api, token, open);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (open) setSelected(new Set()); }, [open]);
  const items = useMemo(() => (options ? counsellorPickerItems(options, team.id) : []), [options, team.id]);

  const save = async () => {
    setSaving(true);
    try {
      toast.success(await api.addCounsellorTeamMembers(token, team.id, [...selected]));
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
      title="Manage Members"
      description={`Add counsellors to ${team.name}. To move someone from another team, remove them there first.`}
      saving={saving}
      saveLabel={selected.size > 0 ? `Add ${selected.size} Member${selected.size === 1 ? '' : 's'}` : 'Add Members'}
      saveIcon={<UserPlus aria-hidden="true" className="size-4" />}
      canSave={selected.size > 0 && options?.ready !== false}
      onClose={onClose}
      onSave={() => { void save(); }}
      width={600}
    >
      {loadError ? <p role="alert" className="text-sm text-destructive">{loadError}</p> : null}
      {options && !options.ready ? <NotReadyNotice message={options.message} /> : null}
      <PickerList
        items={items}
        selected={selected}
        onToggle={(id) => setSelected((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; })}
        placeholder="Search counsellors by name, email or team"
        emptyText={options ? 'No other counsellors.' : 'Loading counsellors…'}
      />
    </OrgDialog>
  );
}
