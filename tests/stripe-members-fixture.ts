import { createHash } from "node:crypto"
import { scriptFixture } from "./order-script-fixture"
export const MEMBER_EMAIL = "member@example.invalid"
export const MEMBER_CODE = "GGPC-OG-" + Buffer.alloc(32, 61).toString("base64url")
export const MEMBER_DIGEST = createHash("sha256").update("ggpc-og-member-code:v1\0" + MEMBER_CODE).digest("hex")
export const MEMBER_CREDENTIAL = { version: 1 as const, digest: MEMBER_DIGEST }
// Actual issuer action in the in-memory Apps Script only, never an ops command/provider.
export function codedFixture(options: Parameters<typeof scriptFixture>[0] = {}) {
  const members = options.og ?? options.waitlist ?? [MEMBER_EMAIL]
  const f = scriptFixture({ ...options, og: members })
  if (members.includes(MEMBER_EMAIL) && members.length <= 100) f.dispatch("member_code_issue", { version: 1, email: MEMBER_EMAIL, digest: MEMBER_DIGEST, issuanceId: "dddddddd-1111-4111-8111-111111111111" })
  return f
}
