-- Uji firewall Studio (dijalankan 2026-11-20 lewat MCP execute_sql, hasil: 12/12 lulus).
-- Semua dalam satu transaksi lalu ROLLBACK — tidak meninggalkan data.
-- Uji alur lengkap (undangan → bid → kontrak → deliverable → payout, EDU publish/ACK, Connect) juga lulus 27/27;
-- polanya sama: set local role authenticated + request.jwt.claims per aktor.
begin;
create temp table _r (t text, ok boolean, info text) on commit drop;
grant all on _r to authenticated;
insert into auth.users (id, email, aud, role) values
 ('00000000-0000-0000-0000-0000000000c1','cmd-test@x.test','authenticated','authenticated'),
 ('00000000-0000-0000-0000-0000000000a1','rangerA@x.test','authenticated','authenticated'),
 ('00000000-0000-0000-0000-0000000000b1','rangerB@x.test','authenticated','authenticated'),
 ('00000000-0000-0000-0000-0000000000d1','opc@x.test','authenticated','authenticated');
insert into public.st_profiles (id,email,display_name,active_role) values
 ('00000000-0000-0000-0000-0000000000a1','rangerA@x.test','A','ranger'),
 ('00000000-0000-0000-0000-0000000000b1','rangerB@x.test','B','ranger'),
 ('00000000-0000-0000-0000-0000000000d1','opc@x.test','D','opc_founder');
insert into public.st_role_grants (person_id, role) values
 ('00000000-0000-0000-0000-0000000000a1','ranger'),('00000000-0000-0000-0000-0000000000b1','ranger'),
 ('00000000-0000-0000-0000-0000000000a1','opc_founder'),('00000000-0000-0000-0000-0000000000d1','opc_founder');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c1","email":"cmd-test@x.test","role":"authenticated","app_metadata":{"role":"admin"}}';
select public.st_bootstrap();
insert into public.st_missions (id,title,brief) values ('00000000-0000-0000-0000-00000000aaaa','Landing page','Brief sanitasi panjang untuk ranger tanpa kontak klien.');
insert into public.st_mission_private (mission_id, client_quote, cost_ceiling) values ('00000000-0000-0000-0000-00000000aaaa', 10000000, 4000000);
select public.st_offer_mission('00000000-0000-0000-0000-00000000aaaa', array['00000000-0000-0000-0000-0000000000a1'::uuid]);

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","email":"rangerA@x.test","role":"authenticated"}';
insert into _r select 'A sees mission', count(*)=1, count(*)::text from public.st_missions;
insert into _r select 'A cannot see private quote', count(*)=0, count(*)::text from public.st_mission_private;
insert into public.st_bids (mission_id, ranger_id, kind, amount, duration_days) values ('00000000-0000-0000-0000-00000000aaaa','00000000-0000-0000-0000-0000000000a1','bid',3000000,7);
insert into _r select 'A bid ok', count(*)=1, '' from public.st_bids;
insert into _r select 'A (ranger ctx) no Connect orgs', count(*)=0, count(*)::text from public.st_orgs;
insert into _r select 'A business ctx false', not public.st_business_ctx(), '';
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b1","email":"rangerB@x.test","role":"authenticated"}';
insert into _r select 'B cannot see mission', count(*)=0, count(*)::text from public.st_missions;
insert into _r select 'B cannot see A bid', count(*)=0, count(*)::text from public.st_bids;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000d1","email":"opc@x.test","role":"authenticated"}';
insert into public.st_orgs (name, visibility) values ('OPC D','discoverable');
insert into _r select 'D sees own org', count(*)=1, '' from public.st_orgs;
insert into _r select 'D cannot see missions', count(*)=0, '' from public.st_missions;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","email":"rangerA@x.test","role":"authenticated"}';
insert into _r select 'A ranger ctx cannot discover D', count(*)=0, count(*)::text from public.st_orgs;
select public.st_switch_role('opc_founder');
insert into _r select 'A in OPC ctx discovers D', count(*)=1, count(*)::text from public.st_orgs;
insert into _r select 'A in OPC ctx loses mission view', count(*)=0, count(*)::text from public.st_missions;
reset role;
select * from _r;
rollback;
