import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  STATUSES,
  countByStatus,
  fromRow,
  funnel,
  monthlyCounts,
  safeUrl,
  sanitizeJobs,
  summary,
  toRow,
  visibleJobs,
} from './jobs.js';

const sample = [
  { id: '1', jobTitle: 'Frontend Engineer', company: 'Zeta', status: 'Applied', dateApplied: '2026-01-10', notes: 'recruiter Budi' },
  { id: '2', jobTitle: 'Backend Engineer', company: 'Alpha', status: 'Offer', dateApplied: '2026-03-02', notes: '' },
  { id: '3', jobTitle: 'Designer', company: 'Mira', status: 'Applied', dateApplied: '2026-02-01', notes: '' },
];

test('counts every status plus a total', () => {
  const c = countByStatus(sample);
  assert.equal(c.All, 3);
  assert.equal(c.Applied, 2);
  assert.equal(c.Offer, 1);
  assert.equal(c.Rejected, 0); // statuses with no jobs still report 0
});

test('countByStatus ignores statuses that are not real statuses', () => {
  const c = countByStatus([
    ...sample,
    { id: 'x', jobTitle: 'A', company: 'B', status: 'toString' }, // inherited key
    { id: 'y', jobTitle: 'C', company: 'D', status: 'All' }, // collides with the total
  ]);
  assert.equal(c.All, 5); // the total counts every job, once
  assert.equal(c.Applied, 2); // real statuses unaffected
  for (const s of STATUSES) assert.equal(typeof c[s], 'number');
  assert.equal(Object.hasOwn(c, 'toString'), false); // no junk key written
});

test('filters by status, free text, and sorts', () => {
  assert.deepEqual(visibleJobs(sample, { status: 'Applied' }).map((j) => j.id), ['3', '1']);
  assert.deepEqual(visibleJobs(sample, { q: 'budi' }).map((j) => j.id), ['1']); // matches notes
  assert.deepEqual(visibleJobs(sample, { q: '  ENGINEER ' }).map((j) => j.id), ['2', '1']);
  assert.deepEqual(visibleJobs(sample, { sort: 'oldest' }).map((j) => j.id), ['1', '3', '2']);
  assert.deepEqual(visibleJobs(sample, { sort: 'company' }).map((j) => j.id), ['2', '3', '1']);
});

test('visibleJobs does not mutate its input', () => {
  const before = sample.map((j) => j.id);
  visibleJobs(sample, { sort: 'company' });
  assert.deepEqual(sample.map((j) => j.id), before);
});

test('summary excludes Wishlist from the rate denominator', () => {
  const s = summary([
    ...sample, // Applied, Offer, Applied  -> 3 submitted
    { id: '4', jobTitle: 'PM', company: 'Nine', status: 'Wishlist', dateApplied: '2026-03-09' },
  ]);
  assert.equal(s.total, 4);
  assert.equal(s.submitted, 3); // Wishlist is not a submitted application
  assert.equal(s.active, 3); // Wishlist + 2 Applied; an Offer is a resolved outcome, not "still running"
  assert.equal(s.interview, 1); // an Offer implies an interview happened
  assert.equal(s.interviewRate, 33);
  assert.equal(s.offerRate, 33);
});

test('summary reports no rate rather than dividing by zero', () => {
  const s = summary([{ id: '1', jobTitle: 'A', company: 'B', status: 'Wishlist', dateApplied: '2026-01-01' }]);
  assert.equal(s.submitted, 0);
  assert.equal(s.interviewRate, null);
  assert.equal(s.offerRate, null);
});

test('funnel stages never widen as you go down', () => {
  const f = funnel([
    ...sample, // Applied, Offer, Applied
    { id: '4', jobTitle: 'PM', company: 'Nine', status: 'Wishlist', dateApplied: '2026-03-09' },
    { id: '5', jobTitle: 'QA', company: 'Ten', status: 'Rejected', dateApplied: '2026-03-09' },
    { id: '6', jobTitle: 'SRE', company: 'Ubi', status: 'Interview', dateApplied: '2026-03-09' },
  ]);
  assert.deepEqual(f.stages.map((s) => s.count), [6, 5, 2, 1]);
  const counts = f.stages.map((s) => s.count);
  assert.deepEqual([...counts].sort((a, b) => b - a), counts); // monotonic: a real funnel
  assert.equal(f.stages[0].ofPrev, null); // nothing precedes the top
  assert.equal(f.stages[2].ofPrev, 40); // 2 of the 5 that were sent
  assert.equal(f.rejected, 1);
});

test('clicking a funnel stage shows exactly the jobs that stage counted', () => {
  const set = [
    ...sample, // Applied, Offer, Applied
    { id: '4', jobTitle: 'PM', company: 'Nine', status: 'Wishlist', dateApplied: '2026-03-09' },
    { id: '5', jobTitle: 'QA', company: 'Ten', status: 'Rejected', dateApplied: '2026-03-09' },
    { id: '6', jobTitle: 'SRE', company: 'Ubi', status: 'Interview', dateApplied: '2026-03-09' },
  ];
  for (const stage of funnel(set).stages) {
    assert.equal(visibleJobs(set, { status: stage.key }).length, stage.count, stage.key);
  }
});

test('funnel divides by zero nowhere', () => {
  const f = funnel([]);
  assert.deepEqual(f.stages.map((s) => s.count), [0, 0, 0, 0]);
  assert.deepEqual(f.stages.map((s) => s.pct), [0, 0, 0, 0]);
  assert.deepEqual(f.stages.map((s) => s.ofPrev), [null, null, null, null]);
});

test('monthlyCounts buckets by calendar month and keeps empty months', () => {
  const m = monthlyCounts(sample, 4, new Date(2026, 2, 15)); // Dec-25 .. Mar-26
  assert.deepEqual(m.map((b) => b.key), ['2025-12', '2026-01', '2026-02', '2026-03']);
  assert.deepEqual(m.map((b) => b.count), [0, 1, 1, 1]);
});

test('monthlyCounts ignores jobs outside the window', () => {
  const m = monthlyCounts(sample, 1, new Date(2026, 2, 15));
  assert.deepEqual(m.map((b) => b.count), [1]); // only the 2026-03 job
});

test('fromRow/toRow survive a round trip and keep id out of the payload', () => {
  const row = {
    id: 'abc',
    job_title: 'Dev',
    company: 'X',
    status: 'Applied',
    job_url: 'https://x.test/1',
    date_applied: '2026-03-01',
    notes: 'halo',
  };
  const job = fromRow(row);
  assert.deepEqual(job, {
    id: 'abc',
    jobTitle: 'Dev',
    company: 'X',
    status: 'Applied',
    jobUrl: 'https://x.test/1',
    dateApplied: '2026-03-01',
    notes: 'halo',
  });
  const back = toRow(job);
  assert.equal(Object.hasOwn(back, 'id'), false); // never overwrite the DB key
  assert.deepEqual({ ...back, id: row.id }, row); // every other column round-trips
});

test('safeUrl only lets http(s) through', () => {
  assert.equal(safeUrl('https://jobs.example/1'), 'https://jobs.example/1');
  assert.equal(safeUrl('javascript:alert(1)'), '');
  assert.equal(safeUrl(undefined), '');
});

test('sanitizeJobs repairs untrusted records', () => {
  const [job] = sanitizeJobs([
    { jobTitle: 'Dev', company: 'X', status: 'Bogus', jobUrl: 'javascript:alert(1)', dateApplied: 'yesterday' },
  ]);
  assert.equal(job.status, 'Wishlist'); // unknown status falls back
  assert.equal(job.jobUrl, ''); // xss payload stripped
  assert.match(job.dateApplied, /^\d{4}-\d{2}-\d{2}$/); // bad date replaced
  assert.equal(typeof job.id, 'string'); // missing id generated
  assert.equal(job.notes, '');
});

test('sanitizeJobs drops junk and rejects non-arrays', () => {
  assert.deepEqual(sanitizeJobs([null, {}, { notes: 'orphan' }]), []);
  assert.throws(() => sanitizeJobs({ jobs: [] }));
});
