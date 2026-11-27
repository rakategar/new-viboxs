import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from '@viboxs/shared/icons';
import { useMotion } from '@viboxs/shared/motion';
import Status from '../components/Status';
import NotifyForm from '../components/NotifyForm';
import { CATALOG_FILLED, PROGRAMS, TYPE, byDate, ctaFor, hrefOf, priceOf, whenOf, type Program, isDigital } from '../lib/data';

const TZ = 'Asia/Jakarta';
const DOW = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const todayJkt = () => new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const pad = (n: number) => String(n).padStart(2, '0');
const monthLabel = (y: number, m: number) => new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m, 1)));
const dayLabel = (d: string) => new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${d}T00:00:00Z`));

/**
 * /events — kalender bulanan (PRD §04.3, QA EDU-007..010).
 * Hanya tanggal yang benar-benar punya sesi bisa diklik; tanggal lain bukan tombol.
 * Tanggal dihitung dalam Asia/Jakarta, tidak bergantung zona waktu perangkat pengunjung.
 */
export default function Events() {
  const ref = useRef<HTMLDivElement>(null);
  useMotion(ref);
  const sessions = CATALOG_FILLED ? PROGRAMS.filter((p) => !isDigital(p.type)) : [];
  const dated = sessions.filter((p) => ISO_DAY.test(p.sortDate));
  const byDay = useMemo(() => {
    const m = new Map<string, Program[]>();
    for (const p of dated) m.set(p.sortDate, [...(m.get(p.sortDate) || []), p]);
    return m;
  }, [dated]);
  const today = todayJkt();
  const upcoming = sessions.filter((p) => !p.past && p.status !== 'CANCELLED').sort(byDate);
  const cancelled = sessions.filter((p) => !p.past && p.status === 'CANCELLED').sort(byDate);
  const past = sessions.filter((p) => p.past).sort((a, b) => byDate(b, a));

  const first = upcoming.find((p) => ISO_DAY.test(p.sortDate))?.sortDate || today;
  const [ym, setYm] = useState<[number, number]>([+first.slice(0, 4), +first.slice(5, 7) - 1]);
  const [sel, setSel] = useState<string | null>(byDay.has(first) ? first : null);
  const [y, m] = ym;
  const lead = (new Date(Date.UTC(y, m, 1)).getUTCDay() + 6) % 7; // Senin = kolom pertama
  const days = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const shift = (d: number) => { const t = new Date(Date.UTC(y, m + d, 1)); setYm([t.getUTCFullYear(), t.getUTCMonth()]); setSel(null); };
  const selList = sel ? byDay.get(sel) || [] : [];

  return (
    <div ref={ref}>
      <section className="page-top">
        <div className="container stack-20">
          <nav aria-label="Breadcrumb" className="crumbs"><Link to="/">EDU</Link><span>/</span><span aria-current="page">Event</span></nav>
          <h1 className="h1-sm">Kalender event</h1>
          <p className="body-17 muted maxw-620">Webinar dan workshop yang sudah terjadwal. Tanggal bertanda memiliki sesi — klik untuk melihat daftarnya. Semua jam dalam WIB (Asia/Jakarta).</p>
        </div>
      </section>
      <div className="light pad-page">
        <div className="container stack-48">
          <section className="cal-wrap" aria-labelledby="cal-h" data-build="Kalender · Event">
            <div className="cal">
              <div className="cal__bar">
                <button type="button" className="round-btn" aria-label="Bulan sebelumnya" onClick={() => shift(-1)}>←</button>
                <h2 id="cal-h" className="strong body-16 cal__m" aria-live="polite">{monthLabel(y, m)}</h2>
                <button type="button" className="round-btn" aria-label="Bulan berikutnya" onClick={() => shift(1)}>→</button>
              </div>
              <div className="cal__grid" role="grid" aria-labelledby="cal-h">
                {DOW.map((d) => <span key={d} className="cal__dow" role="columnheader">{d}</span>)}
                {Array.from({ length: lead }, (_, i) => <span key={`e${i}`} aria-hidden="true" />)}
                {Array.from({ length: days }, (_, i) => {
                  const key = `${y}-${pad(m + 1)}-${pad(i + 1)}`;
                  const list = byDay.get(key);
                  const cls = `cal__d ${key === today ? 'is-today' : ''} ${key === sel ? 'is-sel' : ''}`;
                  return list ? (
                    <button key={key} type="button" role="gridcell" className={`${cls} has`} aria-pressed={key === sel} aria-label={`${dayLabel(key)}: ${list.length} sesi`} onClick={() => setSel(key)}>
                      {i + 1}<span className="cal__dot" aria-hidden="true" />
                    </button>
                  ) : <span key={key} role="gridcell" className={cls}>{i + 1}</span>;
                })}
              </div>
            </div>
            <div className="cal__list" aria-live="polite">
              {sel ? (
                <>
                  <span className="mono-label ink-muted">{dayLabel(sel).toUpperCase()}</span>
                  {selList.map((p) => <SessionRow key={p.slug} p={p} />)}
                </>
              ) : (
                <div className="empty-box">
                  <span className="h4">{byDay.size ? 'Pilih tanggal bertanda.' : 'Belum ada sesi pada bulan ini.'}</span>
                  <span className="body ink-muted">{byDay.size ? 'Tanggal dengan titik memiliki sesi terjadwal.' : 'Belum ada sesi pada tanggal ini. Pilih tanggal lain atau lihat semua program.'}</span>
                  <Link to="/programs" className="link-arrow ink">Lihat semua program <ArrowRight size={14} /></Link>
                </div>
              )}
            </div>
          </section>

          {upcoming.length > 0 ? (
            <section className="stack-16">
              <h2 className="h2-block">Mendatang</h2>
              {upcoming.map((p) => <SessionRow key={p.slug} p={p} />)}
            </section>
          ) : (
            <div className="empty-box maxw-720">
              <span className="h4">Jadwal berikutnya belum diumumkan.</span>
              <span className="body ink-muted">Event tampil setelah topik, kontributor, tanggal, dan platformnya pasti.</span>
              <NotifyForm label="Email untuk pemberitahuan" consent="Saya setuju menerima email pemberitahuan event EDU." />
            </div>
          )}
          {cancelled.length > 0 && (
            <section className="stack-16">
              <h2 className="h2-block">Dibatalkan</h2>
              <p className="small ink-muted">Peserta terdaftar dihubungi terkait pengembalian dana atau jadwal pengganti.</p>
              {cancelled.map((p) => <SessionRow key={p.slug} p={p} />)}
            </section>
          )}
          {past.length > 0 && (
            <section className="stack-16">
              <h2 className="h2-block">Arsip</h2>
              {past.map((p) => (
                <Link key={p.slug} to={hrefOf(p, 'events')} className="archive" data-build="Arsip · Sesi">
                  <span className="stack-4"><span className="strong">{p.title}</span><span className="small ink-muted">{[whenOf(p), p.time].filter(Boolean).join(' · ')}</span></span>
                  <Status code={p.status} size="sm" />
                </Link>
              ))}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function SessionRow({ p }: { p: Program }) {
  const strike = p.status === 'CANCELLED';
  return (
    <Link to={hrefOf(p, 'events')} className={`tl__card tl__card--row ${['CLOSED', 'CANCELLED'].includes(p.status) ? 'is-dim' : ''}`}>
      <span className="stack-6 min0">
        <span className="row-8"><span className="pcard__type">{TYPE[p.type]}</span><Status code={p.status} size="sm" /></span>
        <span className={`strong lg-18 ${strike ? 'strike' : ''}`}>{p.title}</span>
        <span className="small ink-muted">{[whenOf(p), p.time, p.mode].filter(Boolean).join(' · ')}</span>
        {p.status === 'RESCHEDULED' && p.prevDate && <span className="resched-pill">↻ Jadwal berubah · sebelumnya <s>{p.prevDate}</s></span>}
      </span>
      <span className="tl__end"><b>{priceOf(p)}</b><span className="pcard__cta">{ctaFor(p)}<ArrowRight size={14} /></span></span>
    </Link>
  );
}
