import { useEffect, useState } from 'react';
import { I } from '../../ui/kit';
import type { IconKey } from './content';
import { reduced, useInView } from './motion';

/**
 * "Lensa peran": satu misi contoh dilihat dari kursi peran berbeda.
 * Kolom yang tidak boleh dibaca peran itu disensor, dan panel kanan menunjukkan
 * apa yang benar-benar dikirim server. Ilustrasi — tanpa angka atau data nyata.
 */
type Vis = 'show' | 'own' | 'hide';
type Field = { k: string; l: string; col: string };
type Lens = { k: string; t: string; icon: IconKey; vis?: Record<string, Vis>; block?: [string, string]; note: string; from: number };

const FIELDS: Field[] = [
  { k: 'brief', l: 'Brief tersanitasi', col: 'brief' },
  { k: 'kontak', l: 'Kontak klien', col: 'kontak_klien' },
  { k: 'harga', l: 'Harga klien & margin', col: 'harga_klien' },
  { k: 'fee', l: 'Fee tawaran', col: 'fee_tawaran' },
  { k: 'bid', l: 'Bid', col: 'bid' },
  { k: 'deliv', l: 'Deliverable', col: 'deliverable' },
];

const STOPS = ['Lead', 'Brief', 'Offer', 'Bid', 'Kontrak', 'Deliverable', 'Diterima', 'Payable'];
const NOW = 3; // misi contoh sedang di tahap Bid

const LENSES: Lens[] = [
  { k: 'commander', t: 'Commander', icon: 'shield', from: 0, note: 'Melihat semuanya — dan setiap keputusannya tercatat di audit.',
    vis: { brief: 'show', kontak: 'show', harga: 'show', fee: 'show', bid: 'show', deliv: 'show' } },
  { k: 'ranger_terpilih', t: 'Ranger terpilih', icon: 'target', from: 2, note: 'Melihat brief dan fee — tidak pernah kontak atau harga klien.',
    vis: { brief: 'show', kontak: 'hide', harga: 'hide', fee: 'show', bid: 'own', deliv: 'show' } },
  { k: 'ranger_lain', t: 'Ranger lain', icon: 'user', from: -1, block: ['Tidak ditargetkan', 'Penawaran ini tidak pernah muncul di daftarnya.'], note: 'Bukan sasaran penawaran — misinya tidak terlihat sama sekali.' },
  { k: 'opc_founder', t: 'OPC Founder', icon: 'box', from: -1, block: ['Missions tertutup', 'Firewall Connect ↔ Missions.'], note: 'Dunia Connect dan Missions tidak saling membaca.' },
];

const VAL: Record<string, Record<Vis, string>> = {
  bid: { show: 'semua bid · privat per Ranger', own: 'hanya bid milik sendiri', hide: '' },
};

export default function RoleLens() {
  const [i, setI] = useState(0);
  const [hold, setHold] = useState(false);
  const [box, seen] = useInView<HTMLDivElement>(0.35, false);
  useEffect(() => {
    if (hold || !seen || reduced()) return;
    const t = window.setTimeout(() => setI((x) => (x + 1) % LENSES.length), 4600);
    return () => window.clearTimeout(t);
  }, [i, hold, seen]);

  const L = LENSES[i];
  const rows = FIELDS.map((f) => ({ ...f, v: (L.vis?.[f.k] ?? 'hide') as Vis }));
  const sent = rows.filter((r) => r.v !== 'hide').length;

  return (
    <div ref={box} className="lz" onMouseEnter={() => setHold(true)} onMouseLeave={() => setHold(false)} onFocus={() => setHold(true)} onBlur={() => setHold(false)}>
      <div className="lz__bar">
        <span className="nx-label lz__lbl">Lihat sebagai</span>
        <div className="lz__seg" role="tablist" aria-label="Pilih peran">
          {LENSES.map((x, n) => {
            const Ico = I[x.icon];
            return (
              <button key={x.k} type="button" role="tab" aria-selected={n === i} className={`lz__role ${n === i ? 'is-on' : ''}`} onClick={() => setI(n)}>
                <Ico size={15} />{x.t}
                {n === i && seen && !hold && !reduced() && <span className="lz__tick" key={i} />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="lz__body">
        {/* kartu misi */}
        <article className={`lz__doc ${L.block ? 'is-blocked' : ''}`} aria-label={`Misi contoh dilihat sebagai ${L.t}`}>
          <span className="lz__scan" key={`s${i}`} aria-hidden="true" />
          <header className="lz__head">
            <span className="lz__id">MISI · CONTOH</span>
            <b>Landing page produk</b>
            <span className="lz__by">dibuat Commander · dari lead Services</span>
          </header>

          <ol className="lz__rail" aria-label="Tahap misi">
            {STOPS.map((s, n) => (
              <li key={s} className={`${n <= NOW ? 'is-past' : ''} ${n === NOW ? 'is-now' : ''} ${L.from < 0 || n < L.from ? 'is-off' : ''}`}><i /><span>{s}</span></li>
            ))}
          </ol>

          <dl className="lz__rows">
            {rows.map((r, n) => (
              <div key={r.k} className={`lz__row is-${r.v}`} style={{ ['--i' as string]: n }}>
                <dt>{r.l}</dt>
                <dd>
                  {r.v === 'hide' ? (
                    <span className="lz__red"><I.lock size={13} />disaring server</span>
                  ) : r.k === 'brief' ? (
                    <span className="lz__txt">tujuan · ruang lingkup · aset yang diizinkan</span>
                  ) : r.k === 'bid' ? (
                    <span className="lz__txt">{VAL.bid[r.v]}</span>
                  ) : r.k === 'deliv' ? (
                    <span className="lz__chips"><em>v1</em><em>v2</em></span>
                  ) : (
                    <span className="lz__bars" aria-label="terlihat"><i style={{ width: r.k === 'kontak' ? '62%' : '44%' }} /><i style={{ width: '22%' }} /></span>
                  )}
                </dd>
              </div>
            ))}
          </dl>

          {L.block && (
            <div className="lz__stamp" key={`b${i}`} role="note">
              <I.eyeOff size={22} />
              <b>{L.block[0]}</b>
              <span>{L.block[1]}</span>
            </div>
          )}
        </article>

        {/* respons server */}
        <aside className="lz__term" aria-label="Apa yang dikirim server">
          <div className="lz__term-top"><i /><i /><i /><span>respons server</span></div>
          <div className="lz__term-body" key={`t${i}`}>
            <p className="lz__cmd"><span>›</span> baca misi/contoh <em>sebagai {L.k}</em></p>
            {L.block ? (
              <>
                <p className="lz__ln is-x" style={{ ['--i' as string]: 1 }}><span>✕</span>misi<small>0 baris</small></p>
                <p className="lz__ln is-dim" style={{ ['--i' as string]: 2 }}>row-level security menyaring di database — bukan cuma menu yang disembunyikan.</p>
              </>
            ) : (
              rows.map((r, n) => (
                <p key={r.k} className={`lz__ln ${r.v === 'hide' ? 'is-x' : r.v === 'own' ? 'is-own' : ''}`} style={{ ['--i' as string]: n + 1 }}>
                  <span>{r.v === 'hide' ? '✕' : r.v === 'own' ? '◐' : '✓'}</span>{r.col}<small>{r.v === 'hide' ? 'tidak dikirim' : r.v === 'own' ? 'milik sendiri' : 'dikirim'}</small>
                </p>
              ))
            )}
            <p className="lz__sum" style={{ ['--i' as string]: 8 }}>{L.block ? '0 kolom terlihat' : `${sent} kolom terlihat · ${FIELDS.length - sent} disaring`}</p>
          </div>
          <p className="lz__note" key={`n${i}`}>{L.note}</p>
        </aside>
      </div>
    </div>
  );
}
