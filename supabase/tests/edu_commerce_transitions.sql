-- Uji transisi pembayaran (dijalankan 2026-11-24 terhadap order QA sandbox nyata; hasil 16/16 lulus). ROLLBACK.
-- Butuh: satu order FULFILLED (:paid) dan satu PAYMENT_PENDING (:pending) dari fixture qa-sandbox-webinar.
begin;
create temp table _r (t text, ok boolean, info text) on commit drop;
\set paid 'EDU261124-7BA7ED5C'
\set pending 'EDU261124-59A592CA'
insert into _r select 'CHE-009 dup settlement → noop', (x->>'transition') = 'noop_already_paid', x::text from (select public.edu_apply_payment(:'paid','settlement','accept',15000,'t1','bank_transfer','webhook',true,'{}') x) q;
insert into _r select 'CHE-009 still 1 entitlement', count(*)=1, '' from edu_entitlements e join edu_orders o on o.id=e.order_id where o.order_no=:'paid';
insert into _r select 'CHE-009 still 1 sale split', count(*)=1, '' from edu_order_splits s join edu_orders o on o.id=s.order_id where o.order_no=:'paid' and kind='sale';
insert into _r select 'amount mismatch → not paid', (x->>'transition') = 'amount_mismatch', x::text from (select public.edu_apply_payment(:'pending','settlement','accept',1000,'t2','bank_transfer','webhook',true,'{}') x) q;
insert into _r select 'CHE-011 expire → no entitlement', (x->>'transition') = 'expired', x::text from (select public.edu_apply_payment(:'pending','expire',null,15000,'t2','bank_transfer','webhook',true,'{}') x) q;
insert into _r select 'CHE-015 refund revokes access', (x->>'transition') = 'refund', x::text from (select public.edu_apply_payment(:'paid','refund',null,15000,'t1','bank_transfer','webhook',true,'{"refund_amount":"15000","refund_key":"rk1"}') x) q;
insert into _r select 'refund webhook idempotent', (x->>'transition') = 'noop', x::text from (select public.edu_apply_payment(:'paid','refund',null,15000,'t1','bank_transfer','webhook',true,'{"refund_amount":"15000","refund_key":"rk1"}') x) q;
insert into _r select 'split nets to zero after refund', sum(basis)=0 and sum(contributor_share)=0, '' from edu_order_splits s join edu_orders o on o.id=s.order_id where o.order_no=:'paid';
insert into _r select 'anon no select orders', not has_table_privilege('anon','public.edu_orders','select'), '';
insert into _r select 'auth cannot exec apply_payment', not has_function_privilege('authenticated','public.edu_apply_payment(text,text,text,numeric,text,text,text,boolean,jsonb)','execute'), '';
select * from _r;
rollback;

-- CHE-016/017 (2026-11-24, 9/9 lulus setelah fix 20261125j_chargeback_net): refund parsial lalu chargeback
-- → chargeback hanya membalik sisa bersih; ledger nol di semua kolom; chargeback ganda = noop.
begin;
create temp table _r (t text, ok boolean, info text) on commit drop;
insert into _r select 'CHE-016 partial refund → PARTIALLY_REFUNDED', (x->>'status') = 'PARTIALLY_REFUNDED', x::text from (select public.edu_apply_payment(:'paid','partial_refund',null,15000,'t1','bank_transfer','webhook',true,'{"refund_amount":"5000","refund_key":"rk-p1"}') x) q;
insert into _r select 'CHE-016 entitlement kept on partial refund', count(*) = 1, '' from edu_entitlements e join edu_orders o on o.id = e.order_id where o.order_no = :'paid' and e.revoked_at is null;
insert into _r select 'CHE-017 chargeback → CHARGEBACK', (x->>'status') = 'CHARGEBACK', x::text from (select public.edu_apply_payment(:'paid','chargeback',null,15000,'t1','bank_transfer','webhook',true,'{}') x) q;
insert into _r select 'CHE-017 chargeback reverses remaining only', sum(basis) = -10000, sum(basis)::text from edu_order_splits s join edu_orders o on o.id = s.order_id where o.order_no = :'paid' and kind = 'chargeback';
insert into _r select 'CHE-017 ledger nets to zero', sum(basis) = 0 and sum(contributor_share) = 0 and sum(platform_fee) = 0 and sum(reserve) = 0, '' from edu_order_splits s join edu_orders o on o.id = s.order_id where o.order_no = :'paid';
insert into _r select 'CHE-017 duplicate chargeback = noop', (x->>'transition') = 'noop', x::text from (select public.edu_apply_payment(:'paid','chargeback',null,15000,'t1','bank_transfer','webhook',true,'{}') x) q;
select * from _r;
rollback;
