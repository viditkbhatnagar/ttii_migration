import type { FastifyInstance, FastifyReply, FastifyRequest, preHandlerAsyncHookHandler } from 'fastify';

import { CounsellorGroupsService } from '../operations/counsellor-groups-service.js';
import { toIdList, type Outcome } from '../operations/counsellor-teams-model.js';
import { CounsellorTeamsService } from '../operations/counsellor-teams-service.js';

// Counsellor Management → Teams and Groups (Naji 2026-10-12). Admin / Subadmin
// only. ORGANISATIONAL ONLY: no counsellor-portal route reads these tables.
// Writes answer 200 with { status: 0, message } when refused (validation, a
// duplicate membership, a group that still has teams, tables not migrated),
// so the page can toast the reason.

export interface CounsellorTeamsRouteDeps {
  requireAuth: preHandlerAsyncHookHandler;
  requireAdminOnlyRole: preHandlerAsyncHookHandler;
  teamsService?: CounsellorTeamsService;
  groupsService?: CounsellorGroupsService;
}

function payloadOf(request: FastifyRequest): Record<string, unknown> {
  const source = request.method === 'GET' ? request.query : request.body;
  return source && typeof source === 'object' && !Array.isArray(source) ? (source as Record<string, unknown>) : {};
}

function intOf(value: unknown): number {
  const n = typeof value === 'number' ? value : Number.parseInt(typeof value === 'string' ? value : '', 10);
  return Number.isInteger(n) && n > 0 ? n : 0;
}

function actorOf(request: FastifyRequest): number | null {
  const id = intOf(request.authContext?.user.id);
  return id > 0 ? id : null;
}

/** Unexpected failures: logged in full server-side, a generic message to the client. */
function sendError(reply: FastifyReply, error: unknown): void {
  reply.log.error({ err: error }, 'counsellor teams/groups request failed');
  reply.code(500).send({ status: 0, message: 'Something went wrong. Please try again.', data: {} });
}

function sendOutcome<T>(reply: FastifyReply, outcome: Outcome<T>): void {
  reply.code(200).send({ status: outcome.status, message: outcome.message, data: outcome.data ?? {} });
}

export function registerCounsellorTeamsRoutes(app: FastifyInstance, deps: CounsellorTeamsRouteDeps): void {
  const teams = deps.teamsService ?? new CounsellorTeamsService();
  const groups = deps.groupsService ?? new CounsellorGroupsService();
  const guard = { preHandler: [deps.requireAuth, deps.requireAdminOnlyRole] };

  const read = (fn: (p: Record<string, unknown>) => Promise<unknown>) =>
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      try {
        const data = await fn(payloadOf(request));
        reply.code(200).send({ status: 1, message: 'success', data });
      } catch (error: unknown) { sendError(reply, error); }
    };
  const write = <T>(fn: (p: Record<string, unknown>, actor: number | null) => Promise<Outcome<T>>) =>
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      try {
        sendOutcome(reply, await fn(payloadOf(request), actorOf(request)));
      } catch (error: unknown) { sendError(reply, error); }
    };

  // Lists return { ready, message, ... }: ready=false (tables not migrated yet)
  // still answers 200 with empty rows and the reason.
  app.get('/admin/teams/index', guard, read(() => teams.list()));
  app.get('/admin/teams/options', guard, read(() => teams.options()));
  app.get('/admin/teams/membership', guard, read((p) => teams.membershipOf(intOf(p.user_id))));
  app.get('/admin/teams/view', guard, write((p) => teams.detail(intOf(p.id))));
  app.post('/admin/teams/create', guard, write((p, actor) => teams.create(actor, p, toIdList(p.member_ids))));
  app.post('/admin/teams/update', guard, write((p, actor) => teams.update(actor, intOf(p.id), p)));
  app.post('/admin/teams/delete', guard, write((p, actor) => teams.remove(actor, intOf(p.id))));
  app.post('/admin/teams/add_members', guard, write((p, actor) => teams.addMembers(actor, intOf(p.team_id), toIdList(p.user_ids))));
  app.post('/admin/teams/remove_member', guard, write((p) => teams.removeMember(intOf(p.team_id), intOf(p.user_id))));

  app.get('/admin/groups/index', guard, read(() => groups.list()));
  app.get('/admin/groups/view', guard, write((p) => groups.detail(intOf(p.id))));
  app.post('/admin/groups/create', guard, write((p, actor) => groups.create(actor, p, toIdList(p.team_ids), toIdList(p.counsellor_ids))));
  // counsellor_ids ABSENT = leave the direct counsellors alone; PRESENT (even
  // empty) = they become exactly that list.
  app.post('/admin/groups/update', guard, write((p, actor) => groups.update(
    actor, intOf(p.id), p, 'counsellor_ids' in p ? toIdList(p.counsellor_ids) : undefined,
  )));
  app.post('/admin/groups/add_counsellors', guard, write((p, actor) => groups.addCounsellors(actor, intOf(p.group_id), toIdList(p.user_ids))));
  app.post('/admin/groups/remove_counsellor', guard, write((p) => groups.removeCounsellor(intOf(p.group_id), intOf(p.user_id))));
  app.post('/admin/groups/delete', guard, write((p, actor) => groups.remove(actor, intOf(p.id))));
  app.post('/admin/groups/add_teams', guard, write((p, actor) => groups.addTeams(actor, intOf(p.group_id), toIdList(p.team_ids))));
  app.post('/admin/groups/remove_team', guard, write((p, actor) => groups.removeTeam(actor, intOf(p.group_id), intOf(p.team_id))));
}
