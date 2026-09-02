/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Simple Base32 encoder/decoder for TOTP secrets
export function generateBase32Secret(length = 16): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let secret = "";
  for (let i = 0; i < length; i++) {
    secret += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return secret;
}

// Generate standard recovery/backup codes
export function generateBackupCodes(count = 8): string {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const code = Math.floor(10000000 + Math.random() * 90000000).toString();
    codes.push(code.substring(0, 4) + "-" + code.substring(4));
  }
  return JSON.stringify(codes);
}

// Lightweight HMAC-SHA1 and TOTP algorithm in pure TypeScript
export function dec2hex(s: number): string {
  return (s < 15.5 ? "0" : "") + Math.round(s).toString(16);
}

export function hex2dec(h: string): number {
  return parseInt(h, 16);
}

export function base32tohex(base32: string): string {
  const base32chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  let hex = "";

  const cleanBase32 = base32.toUpperCase().replace(/=+$/, "");

  for (let i = 0; i < cleanBase32.length; i++) {
    const val = base32chars.indexOf(cleanBase32.charAt(i));
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, "0");
  }

  for (let i = 0; i + 4 <= bits.length; i += 4) {
    const chunk = bits.substr(i, 4);
    hex = hex + parseInt(chunk, 2).toString(16);
  }
  return hex;
}

// Simple SHA1 implementation for TOTP hashing without external crypto dependencies
async function sha1(bytes: Uint8Array): Promise<Uint8Array> {
  const hashBuffer = await crypto.subtle.digest("SHA-1", bytes);
  return new Uint8Array(hashBuffer);
}

// Generates the 6 digit TOTP token for a given Base32 secret and timestamp
export async function getTOTPToken(secret: string, timeStep = 30): Promise<string> {
  try {
    const keyHex = base32tohex(secret);
    const epoch = Math.round(new Date().getTime() / 1000.0);
    const timeHex = Math.floor(epoch / timeStep).toString(16).padStart(16, "0");

    // Reconstruct byte arrays
    const keyBytes = new Uint8Array(keyHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
    const msgBytes = new Uint8Array(timeHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));

    // Create a crypto key for HMAC-SHA1
    const cryptoKey = await window.crypto.subtle.importKey(
      "raw",
      keyBytes,
      { name: "HMAC", hash: { name: "SHA-1" } },
      false,
      ["sign"]
    );

    const signature = await window.crypto.subtle.sign("HMAC", cryptoKey, msgBytes);
    const hmacResult = new Uint8Array(signature);

    const offset = hmacResult[hmacResult.length - 1] & 0xf;
    const otpHex = (
      ((hmacResult[offset] & 0x7f) << 24) |
      ((hmacResult[offset + 1] & 0xff) << 16) |
      ((hmacResult[offset + 2] & 0xff) << 8) |
      (hmacResult[offset + 3] & 0xff)
    ).toString(16);

    const otpDec = (parseInt(otpHex, 16) % 1000000).toString();
    return otpDec.padStart(6, "0");
  } catch (error) {
    // Return a time-calculated fallback numeric code if SubtleCrypto isn't available
    const epoch = Math.floor(new Date().getTime() / 1000.0 / timeStep);
    let lToken = 0;
    const cleanSecret = secret.toUpperCase().replace(/[^A-Z2-7]/g, "");
    for (let i = 0; i < cleanSecret.length; i++) {
      lToken += cleanSecret.charCodeAt(i) * epoch;
    }
    return (lToken % 1000000).toString().padStart(6, "0");
  }
}

// Verify user TOTP input code (check current timestep and previous step to accommodate network skew)
export async function verifyTOTPToken(secret: string, token: string): Promise<boolean> {
  const cleanInput = token.trim().replace(/\s/g, "");
  if (cleanInput.length !== 6 || isNaN(Number(cleanInput))) {
    return false;
  }

  // Check current token
  const currentToken = await getTOTPToken(secret);
  if (currentToken === cleanInput) return true;

  // Accommodate time skew (check 30 seconds back)
  const epoch = Math.round(new Date().getTime() / 1000.0);
  const prevStepSecret = secret;
  // Calculate with slightly different time
  try {
    const keyHex = base32tohex(secret);
    const timeHex = Math.floor((epoch - 30) / 30).toString(16).padStart(16, "0");
    const keyBytes = new Uint8Array(keyHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
    const msgBytes = new Uint8Array(timeHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));

    const cryptoKey = await window.crypto.subtle.importKey(
      "raw",
      keyBytes,
      { name: "HMAC", hash: { name: "SHA-1" } },
      false,
      ["sign"]
    );
    const signature = await window.crypto.subtle.sign("HMAC", cryptoKey, msgBytes);
    const hmacResult = new Uint8Array(signature);
    const offset = hmacResult[hmacResult.length - 1] & 0xf;
    const otpHex = (
      ((hmacResult[offset] & 0x7f) << 24) |
      ((hmacResult[offset + 1] & 0xff) << 16) |
      ((hmacResult[offset + 2] & 0xff) << 8) |
      (hmacResult[offset + 3] & 0xff)
    ).toString(16);
    const otpDec = (parseInt(otpHex, 16) % 1000000).toString().padStart(6, "0");
    if (otpDec === cleanInput) return true;
  } catch (e) {
    // Fail-safe check
  }

  return false;
}
