import type { PGlite } from "@electric-sql/pglite";

// PGlite does not include Supabase Storage. This models only its SQL surface,
// not uploads, object bytes, service-side MIME limits or signed URL behaviour.
export async function installStorageStub(db: PGlite) {
  await db.exec(`create schema storage;
    create table storage.buckets(id text primary key,name text,public boolean default false,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text not null,metadata jsonb,unique(bucket_id,name));
    alter table storage.objects enable row level security;
    grant usage on schema storage to authenticated,anon;
    grant select,insert,update,delete on storage.objects to authenticated,anon;`);
}
