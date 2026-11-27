-- v4 WP04 × WP00: dengan demo_publish_sandbox ON, program akun demo tetap dikirim ke EDU tetapi TIDAK tayang
-- (published=false → status Studio publish_queued). Tanpa patch ini auto-publish v4 mencoba published=true lalu ditolak
-- edu_program_qa_guard sehingga draft demo selalu publish_failed. Sandbox OFF tidak berubah (ditolak sebelum kirim).
-- Rollback: terapkan ulang st_send_to_edu dari 20261127f.
do $$
declare def text; n int := 0;
begin
  def := pg_get_functiondef('public.st_send_to_edu(uuid)'::regprocedure);
  if position('v_live boolean' in def) > 0 then return; end if;
  def := replace(def, 'v_digital boolean;', 'v_digital boolean; v_live boolean;');
  def := replace(def, $o$v_digital := d.type in ('ebook','kit');$o$, $n$v_digital := d.type in ('ebook','kit');
  v_live := not public.st_is_demo(d.owner_id); -- demo (sandbox ON) dikirim tanpa tayang$n$);
  def := replace(def, $o$contributor_id = d.owner_id, published = true where id = v_pid;$o$, $n$contributor_id = d.owner_id, published = v_live where id = v_pid;$n$);
  def := replace(def, $o$values (v_slug, v_data || jsonb_build_object('slug', v_slug), true, 999, d.id, d.owner_id)$o$, $n$values (v_slug, v_data || jsonb_build_object('slug', v_slug), v_live, 999, d.id, d.owner_id)$n$);
  n := (length(def) - length(replace(def, 'v_live', ''))) / length('v_live');
  if n <> 4 then raise exception 'Patch st_send_to_edu tidak lengkap (% kemunculan v_live).', n; end if;
  execute def;
end $$;
