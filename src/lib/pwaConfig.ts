/**
 * Public configuration for Web Push.
 *
 * VAPID public keys are sent in plaintext to push services as part of every
 * subscription, so they are inherently public — committing this constant is
 * the standard pattern. The matching *private* key lives outside the repo
 * (Supabase Edge Function secret) and is required to sign every push the
 * server sends.
 *
 * Regenerate the pair with `npx web-push generate-vapid-keys`. If you do,
 * every existing `push_subscriptions` row becomes invalid — push services
 * reject pushes signed by a different VAPID key than the one used at
 * subscribe time.
 */
export const VAPID_PUBLIC_KEY =
  'BG9FPxYr93FpuJRhdfs6xCuc3KKwVHM3r7IHRrvzJOwYcWjfj841sJswaowQNWJc_q4KxCbZxUlb0f7zoO0Vei4';

/**
 * Convert a URL-safe base64 VAPID key to the Uint8Array format that
 * `PushManager.subscribe({ applicationServerKey })` expects.
 */
export function vapidPublicKeyToUint8Array(): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (VAPID_PUBLIC_KEY.length % 4)) % 4);
  const base64 = (VAPID_PUBLIC_KEY + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  // Allocate an explicit ArrayBuffer rather than the default ArrayBufferLike
  // so the result is accepted as `BufferSource` by `pushManager.subscribe`.
  const buffer = new ArrayBuffer(raw.length);
  const out = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}
