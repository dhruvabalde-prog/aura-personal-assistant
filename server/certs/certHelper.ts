import fs from 'fs';
import path from 'path';
import selfsigned from 'selfsigned';

const CERTS_DIR = path.resolve(process.cwd(), 'server', 'certs');
const KEY_PATH = path.join(CERTS_DIR, 'key.pem');
const CERT_PATH = path.join(CERTS_DIR, 'cert.pem');

export async function getOrCreateCert(): Promise<{ key: string; cert: string }> {
  if (!fs.existsSync(CERTS_DIR)) {
    fs.mkdirSync(CERTS_DIR, { recursive: true });
  }

  if (fs.existsSync(KEY_PATH) && fs.existsSync(CERT_PATH)) {
    const key = fs.readFileSync(KEY_PATH, 'utf-8');
    const cert = fs.readFileSync(CERT_PATH, 'utf-8');
    return { key, cert };
  }

  console.log('[SSL] Generating HTTPS certificate for localhost...');
  const attrs = [{ name: 'commonName', value: 'localhost' }];
  const pems: any = await (selfsigned as any).generate(attrs, {
    days: 365,
    keySize: 2048,
    algorithm: 'sha256',
  });

  fs.writeFileSync(KEY_PATH, pems.private, 'utf-8');
  fs.writeFileSync(CERT_PATH, pems.cert, 'utf-8');

  return { key: pems.private, cert: pems.cert };
}
