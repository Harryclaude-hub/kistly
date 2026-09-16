-- =====================================================================
-- Kistly 0005_storage
-- Drei private Buckets. Der erste Ordner im Pfad ist immer die Projekt-ID
-- (bzw. die Nutzer-ID bei Avataren), daran haengt die Berechtigung.
--   item-photos/<project_id>/<item_id>/<datei>
--   chat-media/<project_id>/<datei>
--   avatars/<user_id>/<datei>
-- =====================================================================

-- Kaputte Pfade sollen keinen Fehler werfen, sondern schlicht nicht passen.
create or replace function public.try_uuid(t text)
returns uuid language plpgsql immutable as $fn$
begin
  return t::uuid;
exception when others then
  return null;
end $fn$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('item-photos','item-photos', false, 15728640,
   array['image/jpeg','image/png','image/webp','image/heic','image/heif']),
  ('chat-media','chat-media', false, 26214400,
   array['image/jpeg','image/png','image/webp','image/gif','image/heic','image/heif',
         'audio/webm','audio/ogg','audio/mpeg','audio/mp4','audio/aac','audio/wav',
         'application/pdf']),
  ('avatars','avatars', false, 5242880,
   array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ------------------------------------------------------- item-photos
drop policy if exists kistly_item_photos_read on storage.objects;
create policy kistly_item_photos_read on storage.objects for select to authenticated
using (
  bucket_id = 'item-photos'
  and public.is_member(public.try_uuid((storage.foldername(name))[1]))
);

drop policy if exists kistly_item_photos_write on storage.objects;
create policy kistly_item_photos_write on storage.objects for insert to authenticated
with check (
  bucket_id = 'item-photos'
  and public.is_editor(public.try_uuid((storage.foldername(name))[1]))
);

drop policy if exists kistly_item_photos_delete on storage.objects;
create policy kistly_item_photos_delete on storage.objects for delete to authenticated
using (
  bucket_id = 'item-photos'
  and public.is_editor(public.try_uuid((storage.foldername(name))[1]))
);

-- -------------------------------------------------------- chat-media
drop policy if exists kistly_chat_read on storage.objects;
create policy kistly_chat_read on storage.objects for select to authenticated
using (
  bucket_id = 'chat-media'
  and public.is_member(public.try_uuid((storage.foldername(name))[1]))
);

drop policy if exists kistly_chat_write on storage.objects;
create policy kistly_chat_write on storage.objects for insert to authenticated
with check (
  bucket_id = 'chat-media'
  and public.is_member(public.try_uuid((storage.foldername(name))[1]))
);

drop policy if exists kistly_chat_delete on storage.objects;
create policy kistly_chat_delete on storage.objects for delete to authenticated
using (
  bucket_id = 'chat-media'
  and owner = auth.uid()
);

-- ----------------------------------------------------------- avatars
drop policy if exists kistly_avatar_read on storage.objects;
create policy kistly_avatar_read on storage.objects for select to authenticated
using (
  bucket_id = 'avatars'
  and (
    public.try_uuid((storage.foldername(name))[1]) = auth.uid()
    or public.shares_project(public.try_uuid((storage.foldername(name))[1]))
  )
);

drop policy if exists kistly_avatar_write on storage.objects;
create policy kistly_avatar_write on storage.objects for insert to authenticated
with check (
  bucket_id = 'avatars'
  and public.try_uuid((storage.foldername(name))[1]) = auth.uid()
);

drop policy if exists kistly_avatar_update on storage.objects;
create policy kistly_avatar_update on storage.objects for update to authenticated
using (bucket_id = 'avatars' and public.try_uuid((storage.foldername(name))[1]) = auth.uid())
with check (bucket_id = 'avatars' and public.try_uuid((storage.foldername(name))[1]) = auth.uid());

drop policy if exists kistly_avatar_delete on storage.objects;
create policy kistly_avatar_delete on storage.objects for delete to authenticated
using (bucket_id = 'avatars' and public.try_uuid((storage.foldername(name))[1]) = auth.uid());
