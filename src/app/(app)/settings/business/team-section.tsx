"use client";

import { useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { inviteStaffMember, updateStaffRole, setStaffActive } from "./team-actions";
import type { TeamMemberData } from "./page";
import type { ProfileRole } from "@/types/database";

const inputClass =
  "rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-sm text-neutral-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50";

const ROLE_LABELS: Record<ProfileRole, string> = {
  owner: "Owner",
  admin: "Admin",
  technician: "Technician",
};

function StatusBadge({ active, accepted_at }: { active: boolean; accepted_at: string | null }) {
  if (!active) {
    return (
      <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-500 dark:bg-neutral-800">
        Inactive
      </span>
    );
  }
  if (!accepted_at) {
    return (
      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
        Pending
      </span>
    );
  }
  return (
    <span className="rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-medium text-green-700 dark:bg-green-500/10 dark:text-green-400">
      Active
    </span>
  );
}

function MemberRow({
  member,
  isSelf,
  canEdit,
}: {
  member: TeamMemberData;
  isSelf: boolean;
  canEdit: boolean;
}) {
  const [, startTransition] = useTransition();
  const [role, setRole] = useState(member.role);
  const [error, setError] = useState<string | null>(null);

  function changeRole(value: ProfileRole) {
    const previous = role;
    setRole(value);
    setError(null);
    startTransition(async () => {
      const result = await updateStaffRole(member.id, value);
      if (result.error) {
        setRole(previous);
        setError(result.error);
      }
    });
  }

  function toggleActive() {
    setError(null);
    startTransition(async () => {
      const result = await setStaffActive(member.id, !member.active);
      if (result.error) setError(result.error);
    });
  }

  return (
    <li className="flex flex-col gap-1.5 px-3 py-2.5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <span className="flex items-center gap-1.5 text-sm font-medium text-neutral-900 dark:text-neutral-50">
            {member.full_name || member.email || "Unnamed"}
            {isSelf ? <span className="text-xs font-normal text-neutral-400">(you)</span> : null}
            <StatusBadge active={member.active} accepted_at={member.accepted_at} />
          </span>
          <p className="truncate text-xs text-neutral-500">{member.email}</p>
        </div>

        {canEdit && !isSelf ? (
          <div className="flex shrink-0 items-center gap-3">
            <select
              value={role}
              onChange={(e) => changeRole(e.target.value as ProfileRole)}
              className={inputClass}
            >
              {(Object.keys(ROLE_LABELS) as ProfileRole[]).map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
            <button
              onClick={toggleActive}
              className="text-xs font-medium text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
            >
              {member.active ? "Deactivate" : "Reactivate"}
            </button>
          </div>
        ) : (
          <span className="shrink-0 text-xs text-neutral-400">{ROLE_LABELS[member.role]}</span>
        )}
      </div>
      {error ? <p className="text-xs text-red-600 dark:text-red-400">{error}</p> : null}
    </li>
  );
}

function InviteDialog({ onClose }: { onClose: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 dark:bg-neutral-900">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
            Invite a team member
          </h3>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {sent ? (
          <p className="text-sm text-green-600 dark:text-green-400">
            Invite sent. They&apos;ll get an email with a link to set their password.
          </p>
        ) : (
          <form
            action={(formData) => {
              setError(null);
              startTransition(async () => {
                const result = await inviteStaffMember(formData);
                if (result.error) setError(result.error);
                else setSent(true);
              });
            }}
            className="flex flex-col gap-3"
          >
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-neutral-500">Email</label>
              <input name="email" type="email" required className={inputClass} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-neutral-500">Name (optional)</label>
              <input name="full_name" className={inputClass} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-neutral-500">Role</label>
              <select name="role" defaultValue="technician" className={inputClass}>
                <option value="admin">Admin</option>
                <option value="technician">Technician</option>
              </select>
            </div>

            {error ? <p className="text-xs text-red-600 dark:text-red-400">{error}</p> : null}

            <button
              type="submit"
              disabled={pending}
              className="mt-1 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-60"
            >
              {pending ? "Sending..." : "Send invite"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export function TeamSection({
  teamMembers,
  currentUserId,
  canEdit,
}: {
  teamMembers: TeamMemberData[];
  currentUserId: string;
  canEdit: boolean;
}) {
  const [inviting, setInviting] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-neutral-500">
        Everyone here shares access to this business&apos;s data, scoped by role. Invited team
        members show as Pending until they set their password.
      </p>

      <ul className="flex flex-col divide-y divide-neutral-100 rounded-xl border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
        {teamMembers.map((member) => (
          <MemberRow
            key={member.id}
            member={member}
            isSelf={member.id === currentUserId}
            canEdit={canEdit}
          />
        ))}
      </ul>

      {canEdit ? (
        <button
          onClick={() => setInviting(true)}
          className="flex items-center gap-1.5 self-start rounded-lg border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          <Plus className="h-4 w-4" /> Invite team member
        </button>
      ) : null}

      {inviting ? <InviteDialog onClose={() => setInviting(false)} /> : null}
    </div>
  );
}
