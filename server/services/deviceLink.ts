import crypto from "crypto";

type DeviceLinkStatus = "pending" | "approved" | "claimed";

type DeviceUserSnapshot = {
  id: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  profileImageUrl?: string | null;
};

type DeviceLinkRecord = {
  code: string;
  pollToken: string;
  deviceName?: string;
  status: DeviceLinkStatus;
  createdAt: number;
  expiresAt: number;
  user?: DeviceUserSnapshot;
};

const EXPIRATION_MS = 1000 * 60 * 5; // five minutes
const linksByPollToken = new Map<string, DeviceLinkRecord>();
const linksByCode = new Map<string, DeviceLinkRecord>();

const cleanupExpired = () => {
  const now = Date.now();
  for (const [pollToken, record] of linksByPollToken.entries()) {
    if (record.expiresAt <= now || record.status === "claimed") {
      linksByPollToken.delete(pollToken);
      linksByCode.delete(record.code);
    }
  }
};

setInterval(cleanupExpired, 30_000).unref?.();

const randomCode = () => {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i += 1) {
    const index = crypto.randomInt(0, alphabet.length);
    code += alphabet[index];
  }
  return code;
};

const randomToken = () => crypto.randomBytes(24).toString("hex");

export function initiateDeviceLink(deviceName?: string) {
  cleanupExpired();
  let code = randomCode();
  while (linksByCode.has(code)) {
    code = randomCode();
  }
  const pollToken = randomToken();
  const now = Date.now();
  const record: DeviceLinkRecord = {
    code,
    pollToken,
    deviceName,
    status: "pending",
    createdAt: now,
    expiresAt: now + EXPIRATION_MS,
  };
  linksByPollToken.set(pollToken, record);
  linksByCode.set(code, record);
  return {
    code,
    pollToken,
    expiresAt: record.expiresAt,
  };
}

export function approveDeviceLink(code: string, user: DeviceUserSnapshot, deviceName?: string): boolean {
  cleanupExpired();
  const record = linksByCode.get(code.toUpperCase());
  if (!record || record.status !== "pending") return false;
  record.status = "approved";
  record.user = user;
  if (deviceName) record.deviceName = deviceName;
  record.expiresAt = Date.now() + EXPIRATION_MS;
  return true;
}

export function claimDeviceLink(pollToken: string): { status: "pending" | "approved" | "expired" | "invalid"; record?: DeviceLinkRecord } {
  cleanupExpired();
  const record = linksByPollToken.get(pollToken);
  if (!record) return { status: "invalid" };
  if (record.expiresAt <= Date.now()) {
    linksByPollToken.delete(pollToken);
    linksByCode.delete(record.code);
    return { status: "expired" };
  }
  if (record.status === "pending") {
    return { status: "pending", record };
  }
  if (record.status === "approved") {
    record.status = "claimed";
    linksByPollToken.delete(pollToken);
    linksByCode.delete(record.code);
    return { status: "approved", record };
  }
  return { status: "invalid" };
}

export function getDeviceLinkStatus(pollToken: string) {
  cleanupExpired();
  const record = linksByPollToken.get(pollToken);
  if (!record) return { status: "invalid" as const };
  if (record.expiresAt <= Date.now()) {
    linksByPollToken.delete(pollToken);
    linksByCode.delete(record.code);
    return { status: "expired" as const };
  }
  return { status: record.status, expiresAt: record.expiresAt };
}
