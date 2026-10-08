import "server-only";
import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

// Local-disk photo storage. Photos are private (served through an
// access-checked route), so they never live under /public. Swap this module
// for S3/R2 when deploying to a host without a persistent disk.

export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

const root = () => path.resolve(process.env.UPLOAD_DIR || "./uploads");

/** Identify an image by its magic bytes; never trust the browser's type. */
export function sniffImage(buf: Uint8Array): string | null {
  const b = (i: number) => buf[i];
  if (buf.length < 12) return null;
  if (b(0) === 0xff && b(1) === 0xd8 && b(2) === 0xff) return "image/jpeg";
  if (b(0) === 0x89 && b(1) === 0x50 && b(2) === 0x4e && b(3) === 0x47) return "image/png";
  const ascii = (s: number, e: number) => String.fromCharCode(...buf.slice(s, e));
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  return null;
}

const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export async function savePhoto(buf: Uint8Array, mime: string): Promise<string> {
  const now = new Date();
  const key = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${randomBytes(16).toString("hex")}.${EXT[mime]}`;
  const file = path.join(root(), key);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, buf);
  return key;
}

export async function readPhoto(key: string): Promise<Buffer> {
  const file = path.resolve(root(), key);
  if (!file.startsWith(root() + path.sep)) throw new Error("bad key");
  return readFile(file);
}
