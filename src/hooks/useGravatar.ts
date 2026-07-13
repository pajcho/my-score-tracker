import { useEffect, useState } from 'react';

async function getGravatarUrl(email: string): Promise<string> {
  const normalizedEmail = email.toLowerCase().trim();
  const emailBytes = new TextEncoder().encode(normalizedEmail);
  const hashBuffer = await crypto.subtle.digest('SHA-256', emailBytes);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hash = hashArray.map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return `https://www.gravatar.com/avatar/${hash}?d=404&s=64`;
}

/** Resolves the Gravatar URL for an email, or '' while hashing / when absent. */
export function useGravatarUrl(email: string | undefined): string {
  const [resolved, setResolved] = useState<{ email: string; url: string } | null>(null);

  useEffect(() => {
    if (!email) return;

    let cancelled = false;
    void getGravatarUrl(email).then((url) => {
      if (!cancelled) setResolved({ email, url });
    });
    return () => {
      cancelled = true;
    };
  }, [email]);

  // Pairing the URL with its email means a stale avatar for a previous
  // address is never returned while the new hash resolves.
  return email && resolved?.email === email ? resolved.url : '';
}
