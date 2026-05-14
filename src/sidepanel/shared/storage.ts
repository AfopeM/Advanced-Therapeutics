import { z } from "zod";
import { PatientSchema, type Patient } from "./schemas/patient.schema";
import { SessionSchema, type Session } from "./schemas/session.schema";
import { UserSchema, type User } from "./schemas/user.schema";

// Add this import at the top of storage.ts, alongside the existing schema imports:
import {
  UserTemplateSchema,
  type UserTemplate,
} from "./schemas/userTemplate.schema";

// --- Helpers ---

async function get<T>(key: string, schema: z.ZodType<T>): Promise<T | null> {
  const result = await chrome.storage.local.get(key);
  const raw = result[key];
  if (raw === undefined) return null;
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    console.error(`Storage validation failed for key "${key}":`, parsed.error);
    return null;
  }
  return parsed.data;
}

async function set(key: string, value: unknown): Promise<void> {
  await chrome.storage.local.set({ [key]: value });
}

// --- User ---

export async function loadUser(): Promise<User | null> {
  return get("user", UserSchema);
}

export async function saveUser(user: User): Promise<void> {
  return set("user", user);
}

// --- Patients ---

const PatientsMapSchema = z.record(z.string(), PatientSchema);

export async function loadPatients(): Promise<Record<string, Patient>> {
  return (await get("patients", PatientsMapSchema)) ?? {};
}

export async function savePatients(
  patients: Record<string, Patient>,
): Promise<void> {
  return set("patients", patients);
}

// --- Sessions ---

const SessionsMapSchema = z.record(z.string(), SessionSchema);

export async function loadSessions(): Promise<Record<string, Session>> {
  return (await get("sessions", SessionsMapSchema)) ?? {};
}

export async function saveSessions(
  sessions: Record<string, Session>,
): Promise<void> {
  return set("sessions", sessions);
}

// --- User Templates ---
// Add these two functions at the bottom of storage.ts:

const UserTemplatesMapSchema = z.record(z.string(), UserTemplateSchema);

export async function loadUserTemplates(): Promise<
  Record<string, UserTemplate>
> {
  return (await get("userTemplates", UserTemplatesMapSchema)) ?? {};
}

export async function saveUserTemplates(
  templates: Record<string, UserTemplate>,
): Promise<void> {
  return set("userTemplates", templates);
}
