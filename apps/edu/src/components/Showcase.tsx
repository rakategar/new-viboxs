import { useEffect, useState } from 'react';
import { publicRpc } from '@viboxs/shared/backend';
import { rupiah } from '../lib/data';

interface Item {
  kind: 'ranger' | 'opc'; display_name: string; specialization: string; summary: string; evidence: { label: string; url: string }[];
  image_url: string | null; link: string | null; product_status: string | null; income_amount: number | null; income_period: string | null; edu_graduate: boolean;
}

/**
 * Showcase Ranger & OPC (PRD §11). Data hanya dari edu_showcase(): profil PUBLIC_APPROVED dengan bukti & consent,
 * maks 5 per jenis. Kosong/gagal → section tidak dirender (tanpa kartu placeholder, SHO-007). Tidak ada tombol "hire".
 */
export default function Showcase() {
  const [items, setItems] = useState<Item[]>([]);
  useEffect(() => {
    const ac = new AbortController();
    publicRpc<Item[]>('edu_showcase', {}, ac.signal).then((x) => setItems(Array.isArray(x) ? x : [])).catch(() => {});
    return () => ac.abort();
  }, []);
  if (!items.length) return null;
  const group = (k: Item['kind']) => items.filter((x) => x.kind === k);
  return (
    <section className="section section--line" aria-labelledby="sc-h">
      <div className="container stack-32">
        <div className="stack-8">
          <span className="eyebrow">Bukti, bukan janji</span>
          <h2 id="sc-h" className="h2">Karya dari ekosistem VIBOXS</h2>
          <p className="body muted maxw-460">Profil tampil hanya setelah identitas, bukti karya, dan persetujuan pemiliknya diverifikasi. Bukan jaminan hasil untuk peserta lain.</p>
        </div>
        {(['ranger', 'opc'] as const).map((k) => group(k).length > 0 && (
          <div key={k} className="stack-12">
            <span className="mono xs ls-08 muted">{k === 'ranger' ? 'RANGERS' : 'PRODUK & OPC'}</span>
            <div className="sc-grid">
              {group(k).map((x) => (
                <article key={x.display_name + x.specialization} className="sc-card">
                  {x.image_url && <img src={x.image_url} alt="" className="sc-card__img" loading="lazy" />}
                  <span className="strong lg-17">{x.display_name}</span>
                  <span className="small muted">{x.specialization}{x.product_status ? ` · ${x.product_status}` : ''}</span>
                  {x.edu_graduate && <span className="sc-tag">Lulus asesmen EDU</span>}
                  {x.summary && <p className="small">{x.summary}</p>}
                  {x.income_amount != null && x.income_period && <span className="xs-13 muted">Pendapatan terverifikasi {rupiah(x.income_amount)} · {x.income_period}</span>}
                  {x.evidence.length > 0 && (
                    <ul className="sc-ev">{x.evidence.slice(0, 3).map((e) => <li key={e.url}><a href={e.url} target="_blank" rel="noopener noreferrer nofollow">{e.label || 'Lihat bukti'} ↗</a></li>)}</ul>
                  )}
                  {x.link && <a href={x.link} target="_blank" rel="noopener noreferrer nofollow" className="xs-13 strong">Kunjungi ↗</a>}
                </article>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
