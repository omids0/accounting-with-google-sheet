import { registryOf, type MemberKind, type WorkspaceMember } from './memberRegistry'

/**
 * What a member may do and what Drive must let them do, from the kind's registry alone. Kept apart
 * from the member writers (`buildingMembers.ts`) so the Drive side (`buildingMemberDrive.ts`) reads
 * it without an import cycle; `buildingMembers.ts` re-exports both.
 */
export function effectivePermission(
  member: WorkspaceMember,
  permission: string,
  kind: MemberKind = 'building'
): boolean {
  return (
    member.overrides[permission] ??
    registryOf(kind).rolePermissions[member.role]?.[permission] ??
    false
  )
}

/** A read-only member (Drive: view only) who was given a permission that writes. */
export function viewerCanWrite(member: WorkspaceMember, kind: MemberKind = 'building'): boolean {
  const registry = registryOf(kind)

  return (
    registry.driveRole[member.role] === 'reader' &&
    registry.writePermissions.some(permission => effectivePermission(member, permission, kind))
  )
}
