// Envio de notificações (Web Push) sem bibliotecas externas: VAPID (RFC 8292) e cifra aes128gcm (RFC 8291).
import { createECDH, createHmac, createCipheriv, randomBytes, createPrivateKey, sign } from 'node:crypto';

export const b64u = (buf) => Buffer.from(buf).toString('base64url');
export const deb64u = (s) => Buffer.from(String(s || ''), 'base64url');
const hmac = (k, d) => createHmac('sha256', k).update(d).digest();

export function novasChavesVapid() {
  const ecdh = createECDH('prime256v1');
  ecdh.generateKeys();
  return { publica: b64u(ecdh.getPublicKey()), privada: b64u(ecdh.getPrivateKey()) };
}

export function jwtVapid(aud, v, assunto) {
  const pub = deb64u(v.publica);
  const jwk = { kty: 'EC', crv: 'P-256', d: v.privada, x: b64u(pub.subarray(1, 33)), y: b64u(pub.subarray(33, 65)) };
  const chave = createPrivateKey({ key: jwk, format: 'jwk' });
  const cab = b64u(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
  const corpo = b64u(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: assunto }));
  const assinatura = sign('sha256', Buffer.from(cab + '.' + corpo), { key: chave, dsaEncoding: 'ieee-p1363' });
  return `${cab}.${corpo}.${b64u(assinatura)}`;
}

export function cifrar(keys, texto, fixo) {
  const uaPub = deb64u(keys.p256dh), auth = deb64u(keys.auth);
  const ecdh = createECDH('prime256v1');
  if (fixo) ecdh.setPrivateKey(deb64u(fixo.privada)); else ecdh.generateKeys(); // fixo: só para o teste do padrão
  const asPub = ecdh.getPublicKey();
  const segredo = ecdh.computeSecret(uaPub);
  const salt = fixo ? deb64u(fixo.salt) : randomBytes(16);
  const ikm = hmac(hmac(auth, segredo), Buffer.concat([Buffer.from('WebPush: info\0'), uaPub, asPub, Buffer.from([1])]));
  const prk = hmac(salt, ikm);
  const cek = hmac(prk, Buffer.from('Content-Encoding: aes128gcm\0\x01', 'binary')).subarray(0, 16);
  const nonce = hmac(prk, Buffer.from('Content-Encoding: nonce\0\x01', 'binary')).subarray(0, 12);
  const c = createCipheriv('aes-128-gcm', cek, nonce);
  const cifrado = Buffer.concat([c.update(Buffer.concat([Buffer.from(texto, 'utf8'), Buffer.from([2])])), c.final(), c.getAuthTag()]);
  const rs = Buffer.alloc(4);
  rs.writeUInt32BE(4096);
  return Buffer.concat([salt, rs, Buffer.from([asPub.length]), asPub, cifrado]);
}

// Só aceita endereços dos serviços de notificação conhecidos (Google, Mozilla, Microsoft, Apple).
export function endpointValido(u) {
  try {
    const x = new URL(u);
    return x.protocol === 'https:' && /(^|\.)(googleapis\.com|mozilla\.com|mozaws\.net|notify\.windows\.com|push\.apple\.com)$/.test(x.hostname);
  } catch (e) { return false; }
}

// Devolve o status HTTP do serviço de notificação (201 = entregue; 404/410 = inscrição expirada).
export async function enviarPush(sub, dados, v, opc = {}) {
  if (!endpointValido(sub?.endpoint) || !sub.keys?.p256dh || !sub.keys?.auth) return 400;
  const url = new URL(sub.endpoint);
  const jwt = jwtVapid(url.origin, v, 'https://amendoim-brasil.netlify.app');
  const corpo = cifrar(sub.keys, JSON.stringify(dados));
  try {
    const r = await fetch(sub.endpoint, {
      method: 'POST',
      headers: {
        'Content-Encoding': 'aes128gcm',
        'Content-Type': 'application/octet-stream',
        TTL: String(opc.ttl ?? 86400),
        Urgency: opc.urgencia || 'normal',
        Authorization: `vapid t=${jwt}, k=${v.publica}`
      },
      body: corpo
    });
    return r.status;
  } catch (e) { return 0; }
}
