-- Fix CHE-017: chargeback setelah refund parsial membalik basis PENUH (bukan sisa bersih) → ledger kontributor minus
-- (dipotong dua kali). Kini chargeback membalik saldo bersih order (sale + refund yang sudah tercatat); bila sudah nol, tidak ada baris.
-- Diterapkan sebagai penggantian teks persis pada definisi live agar bagian lain fungsi tidak berubah.
do $$
declare def text; old_sql text; new_sql text;
begin
  def := pg_get_functiondef('public.edu_apply_payment(text,text,text,numeric,text,text,text,boolean,jsonb)'::regprocedure);
  old_sql := $o$select order_id, program_id, contributor_id, 'chargeback', -basis, -contributor_share, -platform_fee, -reserve, -token_value, -contributor_cash, rule_version
        from public.edu_order_splits where order_id = o.id and kind = 'sale';$o$;
  new_sql := $n$select order_id, max(program_id::text)::uuid, max(contributor_id::text)::uuid, 'chargeback', -sum(basis), -sum(contributor_share), -sum(platform_fee), -sum(reserve), -sum(token_value), -sum(contributor_cash), max(rule_version)
        from public.edu_order_splits where order_id = o.id group by order_id having sum(basis) <> 0;$n$;
  if position(old_sql in def) = 0 then
    if position('having sum(basis) <> 0' in def) > 0 then return; end if;
    raise exception 'Blok chargeback tidak ditemukan — periksa definisi edu_apply_payment.';
  end if;
  execute replace(def, old_sql, new_sql);
end $$;
