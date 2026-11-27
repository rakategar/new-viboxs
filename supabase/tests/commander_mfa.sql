-- Uji MFA Commander (AUT-016). 2026-11-24: 10/10. 2026-11-27 (v4 WP01/02, +4 RPC): 12/12. Satu transaksi → ROLLBACK.
begin;
create temp table _r (t text, ok boolean, info text) on commit drop;
grant all on _r to authenticated;
create or replace function pg_temp.expect_fail(q text) returns text language plpgsql as $$
begin execute q; return 'NO ERROR'; exception when others then return sqlerrm; end $$;
insert into _r select 'all 21 RPC guarded', count(*) = 21, string_agg(p.proname, ',' order by p.proname) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prokind = 'f' and pg_get_functiondef(p.oid) like '%perform public.st_require_mfa()%';
insert into auth.users (id, email, aud, role, email_confirmed_at) values ('00000000-0000-0000-0000-0000000000c7','cmd7@x.test','authenticated','authenticated', now());
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c7","email":"cmd7@x.test","role":"authenticated","aal":"aal1","app_metadata":{"role":"admin"}}';
select public.st_bootstrap();
insert into _r select 'flag OFF → commander aal1 passes MFA gate', r not like '%MFA%', r from (select pg_temp.expect_fail($$select public.st_company_decide(gen_random_uuid(), 'REVIEW', '')$$) r) q;
insert into _r select 'aal1 cannot turn MFA flag on', r like '%authenticator%', r from (select pg_temp.expect_fail($$update public.st_flags set enabled = true where key = 'commander_mfa_required'$$) r) q;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c7","email":"cmd7@x.test","role":"authenticated","aal":"aal2","app_metadata":{"role":"admin"}}';
update public.st_flags set enabled = true where key = 'commander_mfa_required';
insert into _r select 'aal2 can turn MFA flag on', enabled, '' from public.st_flags where key = 'commander_mfa_required';
insert into _r select 'flag ON + aal2 → passes gate', r not like '%MFA%', r from (select pg_temp.expect_fail($$select public.st_payable_decide(gen_random_uuid(), true, 'catatan approval uji')$$) r) q;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c7","email":"cmd7@x.test","role":"authenticated","aal":"aal1","app_metadata":{"role":"admin"}}';
insert into _r select 'AUT-016 flag ON + aal1 → payout blocked', r like '%butuh verifikasi MFA%', r from (select pg_temp.expect_fail($$select public.st_record_payment(gen_random_uuid(), 1000, 'ref', current_date, 'bank_transfer', null, null)$$) r) q;
insert into _r select 'AUT-016 flag ON + aal1 → refund blocked', r like '%butuh verifikasi MFA%', r from (select pg_temp.expect_fail($$select public.edu_record_refund(gen_random_uuid(), 1000, 'alasan refund uji coba')$$) r) q;
insert into _r select 'AUT-016 flag ON + aal1 → invite blocked', r like '%butuh verifikasi MFA%', r from (select pg_temp.expect_fail($$select public.st_create_invite('x@x.test', array['trainer'], null, 24, false)$$) r) q;
insert into _r select 'V4 flag ON + aal1 → approve & aktivasi blocked', r like '%butuh verifikasi MFA%', r from (select pg_temp.expect_fail($$select public.st_application_approve(gen_random_uuid(), null)$$) r) q;
insert into _r select 'V4 flag ON + aal1 → verifikasi perusahaan blocked', r like '%butuh verifikasi MFA%', r from (select pg_temp.expect_fail($$select public.st_company_decide(gen_random_uuid(), 'VERIFIED', 'catatan cukup panjang')$$) r) q;
insert into _r select 'AUT-016 flag ON + aal1 → approval blocked', r like '%butuh verifikasi MFA%', r from (select pg_temp.expect_fail($$select public.st_assessment_decide(gen_random_uuid(), true, '')$$) r) q;
insert into _r select 'aal1 cannot turn MFA flag off', r like '%authenticator%', r from (select pg_temp.expect_fail($$update public.st_flags set enabled = false where key = 'commander_mfa_required'$$) r) q;
reset role;
select * from _r;
rollback;
