import { Fragment, useState } from 'react';
import { changeText, funnel, monthlyCounts, progress } from './jobs';

// The clay ramp deepens stage by stage, then Offer breaks it with the only gold
// on the page. Index-aligned with funnel().stages.
const STAGE_MARK = ['Wishlist', 'Applied', 'Interview', 'Offer'];

function Stage({ label, pct, count, mark, pressed, onClick, className = '' }) {
  return (
    <button
      className={`stage ${className}`.trim()}
      aria-pressed={pressed}
      onClick={onClick}
    >
      <span className="stage-label">{label}</span>
      {/* Count rides the end of the bar, so the number travels inward with the
          taper instead of sitting in a straight right-hand column that flattens it. */}
      <span className="stage-track">
        <span
          className="stage-bar"
          style={{ '--pct': pct, ...(mark && { '--mark': `var(--${mark}-mark)` }) }}
        />
        <span className="stage-count">{count}</span>
      </span>
    </button>
  );
}

function Rate({ label, value, detail, unit = '%' }) {
  return (
    <div className="rate">
      <span className="rate-label">{label}</span>
      <span className="rate-value">
        {value ?? 0}
        {unit && <small>{unit}</small>}
      </span>
      <span className="rate-note">{detail}</span>
    </div>
  );
}

function Months({ months }) {
  const max = Math.max(...months.map((m) => m.count));
  return (
    <div>
      <h2 className="panel-title">Enam bulan terakhir</h2>
      <div className="plot">
        {months.map((m) => (
          <div className="col" key={m.key} title={`${m.label}: ${m.count} lamaran`}>
            {m.count > 0 && <span className="col-val">{m.count}</span>}
            {/* Months with nothing keep a baseline stub so the gap reads as
                "zero here", not as "no data". */}
            <span
              className={`col-bar${m.count === 0 ? ' is-empty' : ''}`}
              style={m.count > 0 ? { height: `${(m.count / max) * 100}%` } : undefined}
            />
          </div>
        ))}
      </div>
      <div className="axis" aria-hidden="true">
        {months.map((m) => (
          <span key={m.key}>{m.label}</span>
        ))}
      </div>
    </div>
  );
}

// The funnel always summarises the whole dataset, so a bar's number can only ever
// match the rows it filters to. The period picker scopes the numbers on the right.
export default function Dashboard({ jobs, status, onStatus }) {
  const [period, setPeriod] = useState('all');
  const monthly = period !== 'all';
  const stats = progress(jobs, monthly ? period : null);
  const months = monthlyCounts(jobs);
  const pipe = funnel(jobs);
  const toggle = (key) => onStatus(status === key ? 'All' : key);
  const rateDetail = (n, change) =>
    stats.submitted === 0
      ? 'belum ada lamaran terkirim'
      : [
          `${n} dari ${stats.submitted} lamaran terkirim`,
          monthly && changeText(change, stats.prevLabel, ' poin'),
        ]
          .filter(Boolean)
          .join(' · ');

  return (
    <section className="dash" aria-label="Ringkasan">
      <div>
        <h2 className="panel-title">
          Corong lamaran
          {status !== 'All' && (
            <button className="btn btn-ghost" onClick={() => onStatus('All')}>
              Tampilkan semua
            </button>
          )}
        </h2>

        <div className="funnel">
          {pipe.stages.map((s, i) => (
            <Fragment key={s.key}>
              {/* The attrition sits in the gap between two stages, which is
                  exactly where the loss happens. */}
              {s.ofPrev !== null && (
                <p className="drop">
                  <b>{s.ofPrev}%</b> {s.drop}
                </p>
              )}
              <Stage
                label={s.label}
                pct={s.pct}
                count={s.count}
                mark={STAGE_MARK[i]}
                className={i === pipe.stages.length - 1 ? 'is-offer' : ''}
                // 'All' is the absence of a filter, so it never reads as selected.
                pressed={status === s.key && s.key !== 'All'}
                onClick={() => toggle(s.key)}
              />
            </Fragment>
          ))}
        </div>

        {/* Beside the taper, not in it: many jobs skip assessment entirely. */}
        <Stage
          className="aside"
          label="Melewati assessment — jalur samping"
          pct={pipe.assessmentPct}
          count={pipe.assessment}
          mark="Applied"
          pressed={status === 'didAssessment'}
          onClick={() => toggle('didAssessment')}
        />

        <Stage
          className="exit"
          label="Ditolak — keluar jalur"
          pct={pipe.rejectedPct}
          count={pipe.rejected}
          pressed={status === 'Rejected'}
          onClick={() => toggle('Rejected')}
        />
      </div>

      <div className="rail">
        <div className="period">
          <label htmlFor="period">Progres</label>
          <select
            id="period"
            className="field"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            <option value="all">Sepanjang waktu</option>
            {[...months].reverse().map((m) => (
              <option key={m.key} value={m.key}>
                {m.label} {m.key.slice(0, 4)}
              </option>
            ))}
          </select>
          {monthly && (
            <p className="rate-note">
              Dihitung dari bulan lamaran dikirim, jadi bulan terbaru masih bisa naik.
            </p>
          )}
        </div>
        <Rate
          label="Lamaran terkirim"
          value={stats.submitted}
          unit=""
          detail={
            monthly
              ? changeText(stats.growth, stats.prevLabel)
              : `bulan ini ${stats.thisMonth} · ${changeText(stats.growth, 'bulan lalu')}`
          }
        />
        <Rate
          label="Sampai assessment"
          value={stats.assessmentRate}
          detail={rateDetail(stats.assessment, stats.assessmentChange)}
        />
        <Rate
          label="Sampai interview"
          value={stats.interviewRate}
          detail={rateDetail(stats.interview, stats.interviewChange)}
        />
        <Rate
          label="Dapat offer"
          value={stats.offerRate}
          detail={rateDetail(stats.offer, stats.offerChange)}
        />
        <Months months={months} />
      </div>
    </section>
  );
}
