// Pure job-list logic. No React, no DOM — so `node --test` can check it.

export const STATUSES = ['Wishlist', 'Applied', 'Assessment', 'Interview', 'Offer', 'Rejected'];

// The ladder a job climbs. Rejected isn't on it: it is an exit, and it says
// nothing about how far the job got before leaving.
const REACH = ['Wishlist', 'Applied', 'Assessment', 'Interview', 'Offer'];

// A rejection implies the application was sent, so Rejected counts as Applied.
const rank = (s) => (s === 'Rejected' ? 1 : Math.max(0, REACH.indexOf(s)));

// The further of where the job is now and where it has been. Taking the max means
// a row with no recorded history still reads correctly from its status alone.
export const reachOf = (j) =>
  REACH[Math.max(rank(j.status), rank(j.furthestStatus), j.hadAssessment ? rank('Assessment') : 0)];

// Reach can't answer this: a job that went straight to Interview outranks Assessment
// without ever having one, so having done it is remembered on its own.
export const didAssessment = (j) => j.status === 'Assessment' || Boolean(j.hadAssessment);

// Always remembers the reach so far, so leaving a stage can't erase having been there.
export const withStatus = (job, status) => ({
  ...job,
  status,
  furthestStatus: reachOf(job),
  hadAssessment: didAssessment(job) || status === 'Assessment',
});

// What the reach can be set to by hand: never below the current status.
export const reachOptions = (job) => REACH.slice(rank(job.status));

// The stage worth pointing out because the status no longer shows it, or null.
export const earlierReach = (job) => {
  const reach = reachOf(job);
  return rank(reach) > rank(job.status) ? reach : null;
};

export const SORTS = {
  newest: 'Terbaru',
  oldest: 'Terlama',
  company: 'Perusahaan A-Z',
  title: 'Posisi A-Z',
};

// toISOString() is UTC and rolls the date over early for UTC+N users. en-CA is
// YYYY-MM-DD in local time.
export const today = () => new Date().toLocaleDateString('en-CA');

export const blankJob = () => ({
  jobTitle: '',
  company: '',
  status: 'Wishlist',
  jobUrl: '',
  dateApplied: today(),
  followUpDate: '',
  furthestStatus: '',
  cvVersion: '',
  hadAssessment: false,
  notes: '',
});

// Offered as suggestions, so "CV v2" doesn't drift into "cv-2" and split the history.
export const cvVersions = (jobs) =>
  [...new Set(jobs.map((j) => j.cvVersion).filter(Boolean))].sort((a, b) => a.localeCompare(b));

// Oldest first, so what has waited longest is on top. Rejected jobs are closed,
// so a date left on one is noise.
export const followUpsDue = (jobs, now = today()) =>
  jobs
    .filter((j) => j.followUpDate && j.followUpDate <= now && j.status !== 'Rejected')
    .sort((a, b) => a.followUpDate.localeCompare(b.followUpDate));

// Both sides parse as UTC midnight, so the difference is always whole days.
export const daysLate = (date, now = today()) => (Date.parse(now) - Date.parse(date)) / 86400000;

// A cell starting with = + - @ runs as a formula when the file opens in a
// spreadsheet, and notes and titles can hold pasted text from anywhere.
const csvCell = (value) => {
  const text = String(value ?? '');
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
};

export const jobsToCsv = (jobs) =>
  [
    ['Posisi', 'Perusahaan', 'Status', 'Tahap terjauh', 'Assessment', 'Tanggal', 'Follow-up', 'Versi CV', 'Tautan', 'Catatan'],
    ...jobs.map((j) => [j.jobTitle, j.company, j.status, reachOf(j), didAssessment(j) ? 'Ya' : 'Tidak', j.dateApplied, j.followUpDate, j.cvVersion, j.jobUrl, j.notes]),
  ]
    .map((row) => row.map(csvCell).join(','))
    .join('\r\n');

export function countByStatus(jobs) {
  const counts = { All: jobs.length };
  for (const s of STATUSES) counts[s] = 0;
  // `includes`, not `j.status in counts`: `in` walks the prototype chain, so a
  // status of "toString" would pass and corrupt the tally. It also keeps a job
  // from ever incrementing the "All" bucket.
  for (const j of jobs) if (STATUSES.includes(j.status)) counts[j.status] += 1;
  return counts;
}

export function visibleJobs(jobs, { q = '', status = 'All', sort = 'newest' } = {}) {
  const needle = q.trim().toLowerCase();
  // `status` may be a funnel stage (a set of reaches), the assessment side path,
  // or a bare status.
  const stage = STAGE_REACH[status];
  const inFilter = (j) => {
    if (status === 'All') return true;
    if (status === 'didAssessment') return didAssessment(j);
    return stage ? stage.includes(reachOf(j)) : j.status === status;
  };
  const matches = jobs.filter(
    (j) =>
      inFilter(j) &&
      (!needle ||
        `${j.jobTitle} ${j.company} ${j.cvVersion || ''} ${j.notes || ''}`.toLowerCase().includes(needle)),
  );
  const cmp = {
    newest: (a, b) => (b.dateApplied || '').localeCompare(a.dateApplied || ''),
    oldest: (a, b) => (a.dateApplied || '').localeCompare(b.dateApplied || ''),
    company: (a, b) => a.company.localeCompare(b.company),
    title: (a, b) => a.jobTitle.localeCompare(b.jobTitle),
  };
  return matches.sort(cmp[sort] || cmp.newest);
}

// Headline numbers. Rates are measured against lamaran yang benar-benar dikirim
// (Wishlist belum dilamar, jadi tidak boleh ikut jadi penyebut).
export function summary(jobs) {
  const c = countByStatus(jobs);
  const submitted = reached(jobs, 'reachedApplied');
  const interview = reached(jobs, 'reachedInterview'); // reaching Offer implies an interview
  const offer = reached(jobs, 'reachedOffer');
  const assessment = jobs.filter(didAssessment).length;
  const pct = (n) => (submitted ? Math.round((n / submitted) * 100) : null);
  return {
    total: c.All,
    active: c.Wishlist + c.Applied + c.Assessment + c.Interview,
    submitted,
    assessment,
    assessmentRate: pct(assessment),
    interview,
    interviewRate: pct(interview),
    offer,
    offerRate: pct(offer),
  };
}

const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const monthBefore = (key) => {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 2, 1);
};

// Months group by the date the job was sent, because that is the only date stored:
// an interview in March on a February application credits February. So the newest
// months can still rise. Comparing against a month with no rate gives null, not 0.
export function progress(jobs, month = null, now = new Date()) {
  const sentIn = (key) => jobs.filter((j) => String(j.dateApplied || '').slice(0, 7) === key);
  const diff = (a, b) => (a === null || b === null ? null : a - b);

  if (!month) {
    const thisMonth = summary(sentIn(monthKey(now))).submitted;
    const lastMonth = summary(sentIn(monthKey(monthBefore(monthKey(now))))).submitted;
    return { ...summary(jobs), thisMonth, growth: thisMonth - lastMonth };
  }
  const prev = monthBefore(month);
  const current = summary(sentIn(month));
  const before = summary(sentIn(monthKey(prev)));
  return {
    ...current,
    prevLabel: prev.toLocaleDateString('id-ID', { month: 'short' }),
    growth: current.submitted - before.submitted,
    assessmentChange: diff(current.assessmentRate, before.assessmentRate),
    interviewChange: diff(current.interviewRate, before.interviewRate),
    offerChange: diff(current.offerRate, before.offerRate),
  };
}

export const changeText = (n, label, unit = '') => {
  if (n === null) return '';
  if (n === 0) return `sama dengan ${label}`;
  return `${n > 0 ? 'naik' : 'turun'} ${Math.abs(n)}${unit} dari ${label}`;
};

// The funnel reads CUMULATIVE REACH, not current status: "how many applications
// ever got this far". Current-status counts can't be stacked into a funnel —
// a job sitting in Offer left Applied long ago, so those bars aren't nested.
//
// ponytail: a job stores how far it got, not when, so stages can't be dated. Store
// a dated stage history if time-in-stage ever matters.
// A stage IS a set of reaches. Both the funnel bars and the table filter read this
// one map, so clicking a stage can only ever show exactly the jobs that stage
// counted.
// Stage keys are deliberately NOT the status names: "Applied" the status means
// "sitting in Applied right now", while "reachedApplied" the stage means "was
// sent at all". Same word, different question — so they get different keys.
// Assessment stays out of the taper: many jobs go straight to interview, so it
// can't nest between the stages. funnel() reports it separately as a side path.
const STAGE_REACH = {
  All: REACH,
  reachedApplied: ['Applied', 'Assessment', 'Interview', 'Offer'],
  reachedInterview: ['Interview', 'Offer'],
  reachedOffer: ['Offer'],
};

const reached = (jobs, stage) => jobs.filter((j) => STAGE_REACH[stage].includes(reachOf(j))).length;

const STAGES = [
  { key: 'All', label: 'Semua lamaran', drop: null },
  { key: 'reachedApplied', label: 'Dilamar', drop: 'dikirim' },
  { key: 'reachedInterview', label: 'Interview', drop: 'dipanggil' },
  { key: 'reachedOffer', label: 'Offer', drop: 'tembus' },
];

export function funnel(jobs) {
  const c = countByStatus(jobs);
  const reach = Object.fromEntries(Object.keys(STAGE_REACH).map((k) => [k, reached(jobs, k)]));
  const top = reach.All;
  return {
    stages: STAGES.map((s, i) => ({
      ...s,
      count: reach[s.key],
      // Width is share of the whole, so the taper itself shows the attrition.
      pct: top ? (reach[s.key] / top) * 100 : 0,
      // Share of the PREVIOUS stage — the number that actually answers
      // "how good am I at getting past this step".
      ofPrev: i === 0 || !reach[STAGES[i - 1].key]
        ? null
        : Math.round((reach[s.key] / reach[STAGES[i - 1].key]) * 100),
    })),
    assessment: jobs.filter(didAssessment).length,
    assessmentPct: top ? (jobs.filter(didAssessment).length / top) * 100 : 0,
    rejected: c.Rejected,
    rejectedPct: top ? (c.Rejected / top) * 100 : 0,
  };
}

// Last `months` calendar months, oldest first. Empty months are kept — a gap is
// information for someone tracking how consistently they apply. Wishlist is left
// out because nothing has been sent yet.
export function monthlyCounts(jobs, months = 6, now = new Date()) {
  const buckets = [];
  for (let i = months - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({
      key: monthKey(d),
      label: d.toLocaleDateString('id-ID', { month: 'short' }),
      count: 0,
    });
  }
  const byKey = new Map(buckets.map((b) => [b.key, b]));
  for (const j of jobs) {
    const bucket = byKey.get(String(j.dateApplied || '').slice(0, 7));
    if (bucket && STAGE_REACH.reachedApplied.includes(reachOf(j))) bucket.count += 1;
  }
  return buckets;
}

// Only http(s) reaches an href. Blocks `javascript:` payloads from imported or
// hand-typed URLs — every render routes through here.
export const safeUrl = (url) => (/^https?:\/\//i.test(url || '') ? url : '');

// Supabase Auth has no username mode, so a bare name is pinned to one domain that
// is never shown. A full address passes through, for an account that already
// exists on a Supabase instance shared with another app.
// ponytail: single fixed domain, no real mail behind it. Add an email field only
// if a bare-name user ever needs to receive a password reset.
export const loginEmail = (name) => {
  const n = name.trim().toLowerCase();
  return n.includes('@') ? n : `${n}@jobtracker.local`;
};

// Only a 400 means the credentials were rejected. A dead network, a wrong key or
// a server error can't be fixed by retyping the password, so they say what happened.
export const loginError = (error) =>
  error.status === 400
    ? 'Email, nama pengguna, atau kata sandi salah.'
    : `Tidak bisa masuk: ${error.message}`;

// Postgres columns are snake_case, the app is camelCase. Two small pure
// functions instead of quoted "camelCase" identifiers in every SQL statement.
export const fromRow = (r) => ({
  id: r.id,
  jobTitle: r.job_title,
  company: r.company,
  status: r.status,
  jobUrl: r.job_url,
  dateApplied: r.date_applied,
  followUpDate: r.follow_up_date,
  furthestStatus: r.furthest_status,
  cvVersion: r.cv_version,
  hadAssessment: r.had_assessment,
  notes: r.notes,
});

// `id` is left out on purpose: the database generates it on insert, and on
// update it travels in the .eq() filter, never in the payload.
export const toRow = (j) => ({
  job_title: j.jobTitle,
  company: j.company,
  status: j.status,
  job_url: j.jobUrl,
  // The date is optional, and Postgres rejects '' for a date column.
  date_applied: j.dateApplied || null,
  follow_up_date: j.followUpDate || null,
  furthest_status: j.furthestStatus || null,
  cv_version: j.cvVersion,
  had_assessment: Boolean(j.hadAssessment),
  notes: j.notes,
});

// Trust boundary: a JSON file, a stale localStorage, or a network response can
// hold anything. Used by every path that brings records in from outside.
export function sanitizeJobs(raw) {
  if (!Array.isArray(raw)) throw new Error('File harus berisi daftar (array) lowongan.');
  return raw
    .filter((j) => j && typeof j === 'object' && (j.jobTitle || j.company))
    .map((j) => ({
      id: ['string', 'number'].includes(typeof j.id) ? String(j.id) : crypto.randomUUID(),
      jobTitle: String(j.jobTitle ?? '').slice(0, 200),
      company: String(j.company ?? '').slice(0, 200),
      status: STATUSES.includes(j.status) ? j.status : 'Wishlist',
      jobUrl: safeUrl(String(j.jobUrl ?? '')).slice(0, 2000),
      // No date stays no date; only a malformed one is replaced.
      dateApplied: !j.dateApplied
        ? ''
        : /^\d{4}-\d{2}-\d{2}$/.test(j.dateApplied)
          ? j.dateApplied
          : today(),
      // A guessed date here would fire a reminder nobody set, so bad means none.
      followUpDate: /^\d{4}-\d{2}-\d{2}$/.test(j.followUpDate ?? '') ? j.followUpDate : '',
      furthestStatus: REACH.includes(j.furthestStatus) ? j.furthestStatus : '',
      cvVersion: String(j.cvVersion ?? '').slice(0, 100),
      hadAssessment: j.hadAssessment === true,
      notes: String(j.notes ?? '').slice(0, 2000),
    }));
}
