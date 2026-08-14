// Pure job-list logic. No React, no DOM — so `node --test` can check it.

export const STATUSES = ['Wishlist', 'Applied', 'Interview', 'Offer', 'Rejected'];

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
  notes: '',
});

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
  // `status` may be a funnel stage (a set of statuses) or a bare status.
  const allow = STAGE_STATUSES[status] ?? [status];
  const matches = jobs.filter(
    (j) =>
      (status === 'All' || allow.includes(j.status)) &&
      (!needle ||
        `${j.jobTitle} ${j.company} ${j.notes || ''}`.toLowerCase().includes(needle)),
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
  const submitted = c.Applied + c.Interview + c.Offer + c.Rejected;
  const pct = (n) => (submitted ? Math.round((n / submitted) * 100) : null);
  return {
    total: c.All,
    active: c.Wishlist + c.Applied + c.Interview,
    submitted,
    interview: c.Interview + c.Offer, // reaching Offer implies an interview happened
    interviewRate: pct(c.Interview + c.Offer),
    offer: c.Offer,
    offerRate: pct(c.Offer),
  };
}

// The funnel reads CUMULATIVE REACH, not current status: "how many applications
// ever got this far". Current-status counts can't be stacked into a funnel —
// a job sitting in Offer left Applied long ago, so those bars aren't nested.
//
// ponytail: a job only records where it is now, not where it has been, so a
// rejection is credited to Applied but never to Interview — post-interview
// rejections undercount the Interview stage. Store a stage history if that gap
// starts mattering.
// A stage IS a set of current statuses. Both the funnel bars and the table
// filter read this one map, so clicking a stage can only ever show exactly the
// jobs that stage counted.
// Stage keys are deliberately NOT the status names: "Applied" the status means
// "sitting in Applied right now", while "reachedApplied" the stage means "was
// sent at all". Same word, different question — so they get different keys.
const STAGE_STATUSES = {
  All: STATUSES,
  reachedApplied: ['Applied', 'Interview', 'Offer', 'Rejected'],
  reachedInterview: ['Interview', 'Offer'],
  reachedOffer: ['Offer'],
};

const STAGES = [
  { key: 'All', label: 'Semua lamaran', drop: null },
  { key: 'reachedApplied', label: 'Dilamar', drop: 'dikirim' },
  { key: 'reachedInterview', label: 'Interview', drop: 'dipanggil' },
  { key: 'reachedOffer', label: 'Offer', drop: 'tembus' },
];

export function funnel(jobs) {
  const c = countByStatus(jobs);
  const reach = Object.fromEntries(
    Object.entries(STAGE_STATUSES).map(([k, ss]) => [k, ss.reduce((n, s) => n + c[s], 0)]),
  );
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
    rejected: c.Rejected,
    rejectedPct: top ? (c.Rejected / top) * 100 : 0,
  };
}

// Last `months` calendar months, oldest first. Empty months are kept — a gap is
// information for someone tracking how consistently they apply.
export function monthlyCounts(jobs, months = 6, now = new Date()) {
  const buckets = [];
  for (let i = months - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('id-ID', { month: 'short' }),
      count: 0,
    });
  }
  const byKey = new Map(buckets.map((b) => [b.key, b]));
  for (const j of jobs) {
    const bucket = byKey.get(String(j.dateApplied || '').slice(0, 7));
    if (bucket) bucket.count += 1;
  }
  return buckets;
}

// Only http(s) reaches an href. Blocks `javascript:` payloads from imported or
// hand-typed URLs — every render routes through here.
export const safeUrl = (url) => (/^https?:\/\//i.test(url || '') ? url : '');

// Postgres columns are snake_case, the app is camelCase. Two small pure
// functions instead of quoted "camelCase" identifiers in every SQL statement.
export const fromRow = (r) => ({
  id: r.id,
  jobTitle: r.job_title,
  company: r.company,
  status: r.status,
  jobUrl: r.job_url,
  dateApplied: r.date_applied,
  notes: r.notes,
});

// `id` is left out on purpose: the database generates it on insert, and on
// update it travels in the .eq() filter, never in the payload.
export const toRow = (j) => ({
  job_title: j.jobTitle,
  company: j.company,
  status: j.status,
  job_url: j.jobUrl,
  date_applied: j.dateApplied,
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
      dateApplied: /^\d{4}-\d{2}-\d{2}$/.test(j.dateApplied ?? '') ? j.dateApplied : today(),
      notes: String(j.notes ?? '').slice(0, 2000),
    }));
}
