/**
 * Splits a comma-separated email list (as passed to `invites`/`test-invites`)
 * into trimmed, non-empty, de-duplicated emails, preserving first-seen order.
 * De-duping client-side avoids inviting/enrolling the same address twice in
 * one call just because the caller listed it twice.
 */
export function parseEmailList(value: string): string[] {
  const seen = new Set<string>();
  const emails: string[] = [];

  for (const raw of value.split(',')) {
    const email = raw.trim();
    if (email.length === 0 || seen.has(email)) {
      continue;
    }
    seen.add(email);
    emails.push(email);
  }

  return emails;
}
