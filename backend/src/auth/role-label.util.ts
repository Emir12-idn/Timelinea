import { Role } from "@prisma/client";

/** Short role label shown in front of a person's name wherever they're identified. */
export const ROLE_LABEL: Record<Role, string> = {
  admin: "Admin",
  hrd_keuangan: "HRD",
  pic_proyek: "PIC",
  karyawan: "Staff",
};

/** e.g. displayName("Agus", "hrd_keuangan") -> "HRD Agus". Computed, never stored,
 * so it stays correct if the account's role changes later. */
export function displayName(name: string, role: Role): string {
  return `${ROLE_LABEL[role]} ${name}`;
}
