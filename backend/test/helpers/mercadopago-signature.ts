import { createHmac } from 'crypto';

// Mercado Pago signs `id:<data.id>;request-id:<x-request-id>;ts:<timestamp>;`
// with HMAC-SHA256 and sends it as `ts=<timestamp>,v1=<hash>`.
export function signNotification(params: {
  dataId: string;
  requestId: string;
  secret: string;
}): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const manifest = `id:${params.dataId};request-id:${params.requestId};ts:${timestamp};`;
  const hash = createHmac('sha256', params.secret)
    .update(manifest)
    .digest('hex');

  return `ts=${timestamp},v1=${hash}`;
}
