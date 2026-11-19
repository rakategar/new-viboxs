import { createClient } from '@supabase/supabase-js';
import { SUPABASE_KEY, SUPABASE_URL } from '@viboxs/shared/backend';
import type { Program } from '../lib/data';

/** Klien Supabase khusus dashboard (sesi admin disimpan terpisah dari situs publik). */
export const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: 'viboxs-edu-admin' },
});

/** Username "admin" dipetakan ke akun email admin. */
export const usernameToEmail = (u: string) => (u.includes('@') ? u.trim() : `${u.trim().toLowerCase()}@viboxs.com`);

export interface ProgramRow { slug: string; data: Program; published: boolean; position: number; updated_at: string }
export type SubKind = 'contact' | 'mission' | 'collab' | 'help' | 'notify' | 'register';
export type SubStatus = 'new' | 'review' | 'accepted' | 'rejected' | 'done' | 'spam';
export interface Submission {
  id: string; ref: string; kind: SubKind; site: string; name: string | null; email: string | null; phone: string | null; subject: string | null;
  payload: Record<string, unknown>; status: SubStatus; admin_note: string | null; email_status: string; created_at: string; updated_at: string;
}

export const KIND_LABEL: Record<SubKind, string> = {
  contact: 'Kontak (viboxs.com)', mission: 'Start a Mission (Services)', collab: 'Kolaborator EDU', help: 'Bantuan EDU', notify: 'Pemberitahuan EDU', register: 'Pendaftaran program',
};
export const STATUS_LABEL: Record<SubStatus, string> = { new: 'Baru', review: 'Ditinjau', accepted: 'Diterima', rejected: 'Ditolak', done: 'Selesai', spam: 'Spam' };

export async function getContent<T>(key: string): Promise<T | null> {
  const { data, error } = await sb.from('edu_content').select('value').eq('key', key).maybeSingle();
  if (error) throw error;
  return (data?.value as T) ?? null;
}
export async function setContent(key: string, value: unknown) {
  const { error } = await sb.from('edu_content').upsert({ key, value });
  if (error) throw error;
}
