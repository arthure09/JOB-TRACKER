import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  STATUSES,
  changeText,
  countByStatus,
  cvVersions,
  daysLate,
  didAssessment,
  earlierReach,
  followUpsDue,
  fromRow,
  funnel,
  jobsToCsv,
  loginEmail,
  loginError,
  monthlyCounts,
  progress,
  reachOf,
  reachOptions,
  safeUrl,
  sanitizeJobs,
  summary,
  toRow,
  visibleJobs,
  withStatus,
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
    follow_up_date: '2026-03-08',
    furthest_status: 'Interview',
    cv_version: 'CV v2',
    had_assessment: true,
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
    followUpDate: '2026-03-08',
    furthestStatus: 'Interview',
    cvVersion: 'CV v2',
    hadAssessment: true,
    notes: 'halo',
  });
  const back = toRow(job);
  assert.equal(Object.hasOwn(back, 'id'), false); // never overwrite the DB key
  assert.deepEqual({ ...back, id: row.id }, row); // every other column round-trips
});

const history = [
  { id: 'a', jobTitle: 'A', company: 'A', status: 'Rejected', furthestStatus: 'Interview', dateApplied: '2026-03-02' },
  { id: 'b', jobTitle: 'B', company: 'B', status: 'Applied', dateApplied: '2026-03-05' },
  { id: 'c', jobTitle: 'C', company: 'C', status: 'Interview', dateApplied: '2026-02-10' },
  { id: 'd', jobTitle: 'D', company: 'D', status: 'Wishlist', dateApplied: '2026-03-09' },
];

test('a job rejected after interview still counts as reaching interview', () => {
  const s = summary(history);
  assert.equal(s.submitted, 3);
  assert.equal(s.interview, 2);
  assert.equal(s.interviewRate, 67);
  assert.deepEqual(funnel(history).stages.map((x) => x.count), [4, 3, 2, 0]);
  assert.equal(funnel(history).rejected, 1); // still the exit, too
});

test('funnel bars and table filter agree once a job has left a stage', () => {
  for (const stage of funnel(history).stages) {
    assert.equal(visibleJobs(history, { status: stage.key }).length, stage.count, stage.key);
  }
  assert.deepEqual(visibleJobs(history, { status: 'Rejected' }).map((j) => j.id), ['a']); // bare status
});

test('withStatus keeps the furthest stage through any move', () => {
  const rejected = withStatus({ status: 'Offer', furthestStatus: '' }, 'Rejected');
  assert.equal(reachOf(rejected), 'Offer');
  assert.equal(reachOf(withStatus(rejected, 'Applied')), 'Offer'); // moving back forgets nothing
  assert.equal(reachOf(withStatus({ status: 'Wishlist' }, 'Interview')), 'Interview'); // moving up counts at once
});

test('a job with no recorded reach reads correctly from its status', () => {
  assert.equal(reachOf({ status: 'Interview', furthestStatus: null }), 'Interview');
  assert.equal(reachOf({ status: 'Rejected', furthestStatus: null }), 'Applied');
  assert.equal(reachOf({ status: 'Wishlist' }), 'Wishlist');
});

test('reach can be corrected by hand, but never below the current status', () => {
  assert.deepEqual(reachOptions({ status: 'Wishlist' }), ['Wishlist', 'Applied', 'Assessment', 'Interview', 'Offer']);
  assert.deepEqual(reachOptions({ status: 'Rejected' }), ['Applied', 'Assessment', 'Interview', 'Offer']);
  assert.deepEqual(reachOptions({ status: 'Offer' }), ['Offer']);
  assert.equal(reachOf({ status: 'Offer', furthestStatus: 'Applied' }), 'Offer');
});

test('earlierReach only speaks up when the status hides something', () => {
  assert.equal(earlierReach(history[0]), 'Interview');
  assert.equal(earlierReach({ status: 'Rejected' }), null); // Applied is all a rejection implies
  assert.equal(earlierReach({ status: 'Interview', furthestStatus: 'Interview' }), null);
});

test('progress for a month compares it against the month before', () => {
  const p = progress(history, '2026-03');
  assert.equal(p.submitted, 2); // Wishlist in March was not sent
  assert.equal(p.interviewRate, 50);
  assert.equal(p.growth, 1); // 2 in March, 1 in February
  assert.equal(p.interviewChange, -50); // 50% against 100%
  assert.equal(p.offerChange, 0);
});

test('progress for a month with nothing before it has no rate to compare', () => {
  const p = progress(history, '2026-02');
  assert.equal(p.growth, 1);
  assert.equal(p.interviewChange, null);
});

test('progress crosses the year boundary', () => {
  const p = progress([{ status: 'Applied', dateApplied: '2025-12-20' }, { status: 'Applied', dateApplied: '2026-01-05' }], '2026-01');
  assert.equal(p.growth, 0); // one in December, one in January
});

test('progress all time covers everything and reports this month against last', () => {
  const p = progress(history, null, new Date(2026, 2, 15));
  assert.equal(p.submitted, 3);
  assert.equal(p.interviewRate, 67);
  assert.equal(p.thisMonth, 2);
  assert.equal(p.growth, 1);
});

test('changeText words a change, and stays silent without a comparison', () => {
  assert.equal(changeText(2, 'Okt'), 'naik 2 dari Okt');
  assert.equal(changeText(-50, 'Okt', ' poin'), 'turun 50 poin dari Okt');
  assert.equal(changeText(0, 'bulan lalu'), 'sama dengan bulan lalu');
  assert.equal(changeText(null, 'Okt'), '');
});

test('Assessment counts as sent and active, but not as reaching interview', () => {
  const jobs = [
    { id: 'a', jobTitle: 'A', company: 'A', status: 'Assessment', dateApplied: '2026-03-01' },
    { id: 'b', jobTitle: 'B', company: 'B', status: 'Applied', dateApplied: '2026-03-02' },
  ];
  const s = summary(jobs);
  assert.equal(s.submitted, 2);
  assert.equal(s.active, 2);
  assert.equal(s.interview, 0);
  assert.deepEqual(funnel(jobs).stages.map((x) => x.count), [2, 2, 0, 0]); // no bar of its own
  for (const stage of funnel(jobs).stages) {
    assert.equal(visibleJobs(jobs, { status: stage.key }).length, stage.count, stage.key);
  }
});

test('leaving Assessment remembers it, and interview still ranks above it', () => {
  const rejected = withStatus({ status: 'Assessment' }, 'Rejected');
  assert.equal(earlierReach(rejected), 'Assessment');
  assert.equal(reachOf(withStatus({ status: 'Interview' }, 'Assessment')), 'Interview');
  assert.equal(sanitizeJobs([{ jobTitle: 'A', status: 'Assessment' }])[0].status, 'Assessment');
});

test('a job remembers its assessment after moving on, even once rejected', () => {
  const later = withStatus(withStatus(withStatus({ status: 'Applied' }, 'Assessment'), 'Interview'), 'Rejected');
  assert.equal(didAssessment(later), true);
  assert.equal(reachOf(later), 'Interview');
});

test('going straight to interview does not count as an assessment', () => {
  const direct = withStatus(withStatus({ status: 'Applied' }, 'Interview'), 'Rejected');
  assert.equal(didAssessment(direct), false);
  assert.equal(reachOf(direct), 'Interview');
});

test('the assessment number and its table filter agree', () => {
  const jobs = [
    { id: 'now', jobTitle: 'A', company: 'A', status: 'Assessment', dateApplied: '2026-03-01' },
    { id: 'past', jobTitle: 'B', company: 'B', status: 'Rejected', hadAssessment: true, dateApplied: '2026-03-02' },
    { id: 'direct', jobTitle: 'C', company: 'C', status: 'Interview', dateApplied: '2026-03-03' },
    { id: 'wish', jobTitle: 'D', company: 'D', status: 'Wishlist', dateApplied: '2026-03-04' },
  ];
  const shown = visibleJobs(jobs, { status: 'didAssessment' }).map((j) => j.id).sort();
  assert.deepEqual(shown, ['now', 'past']);
  assert.equal(funnel(jobs).assessment, shown.length);
  assert.equal(summary(jobs).assessment, shown.length);
  assert.equal(summary(jobs).assessmentRate, 67); // 2 of the 3 that were sent
});

test('marking an assessment by hand means the job was sent', () => {
  const s = summary([{ status: 'Wishlist', hadAssessment: true }]);
  assert.equal(s.submitted, 1);
  assert.equal(s.assessmentRate, 100); // can never exceed the jobs it is measured against
});

test('progress compares the assessment rate across months', () => {
  const p = progress(
    [
      { status: 'Assessment', dateApplied: '2026-02-10' },
      { status: 'Assessment', dateApplied: '2026-03-02' },
      { status: 'Applied', dateApplied: '2026-03-05' },
    ],
    '2026-03',
  );
  assert.equal(p.assessmentRate, 50);
  assert.equal(p.assessmentChange, -50);
});

test('only a real true counts when reading hadAssessment from outside', () => {
  const [yes, no, junk] = sanitizeJobs([
    { jobTitle: 'A', hadAssessment: true },
    { jobTitle: 'B', hadAssessment: null },
    { jobTitle: 'C', hadAssessment: 'false' },
  ]);
  assert.deepEqual([yes.hadAssessment, no.hadAssessment, junk.hadAssessment], [true, false, false]);
});

test('cvVersions lists each version once, sorted, without blanks', () => {
  assert.deepEqual(
    cvVersions([{ cvVersion: 'CV v2' }, { cvVersion: '' }, { cvVersion: 'CV v1' }, { cvVersion: 'CV v2' }]),
    ['CV v1', 'CV v2'],
  );
});

test('a CV version is searchable and a missing one becomes empty', () => {
  const [withCv, without] = sanitizeJobs([
    { jobTitle: 'A', company: 'X', cvVersion: 'CV Frontend' },
    { jobTitle: 'B', company: 'Y', cvVersion: null },
  ]);
  assert.equal(without.cvVersion, '');
  assert.deepEqual(visibleJobs([withCv, without], { q: 'frontend' }).map((j) => j.jobTitle), ['A']);
});

test('monthlyCounts leaves out Wishlist, which has not been sent', () => {
  const m = monthlyCounts(
    [
      { status: 'Wishlist', dateApplied: '2026-03-02' },
      { status: 'Applied', dateApplied: '2026-03-03' },
    ],
    1,
    new Date(2026, 2, 15),
  );
  assert.deepEqual(m.map((b) => b.count), [1]);
});

test('followUpsDue lists only what is due, oldest first, and skips Rejected', () => {
  const due = followUpsDue(
    [
      { id: 'today', status: 'Applied', followUpDate: '2026-03-10' },
      { id: 'late', status: 'Interview', followUpDate: '2026-03-01' },
      { id: 'future', status: 'Applied', followUpDate: '2026-03-11' },
      { id: 'closed', status: 'Rejected', followUpDate: '2026-03-01' },
      { id: 'none', status: 'Applied', followUpDate: '' },
    ],
    '2026-03-10',
  );
  assert.deepEqual(due.map((j) => j.id), ['late', 'today']);
});

test('daysLate counts whole days across a month boundary', () => {
  assert.equal(daysLate('2026-03-10', '2026-03-10'), 0);
  assert.equal(daysLate('2026-02-27', '2026-03-02'), 3);
});

test('a follow-up date survives the trip and a bad one becomes none', () => {
  const [good, bad, missing] = sanitizeJobs([
    { jobTitle: 'A', followUpDate: '2026-03-08' },
    { jobTitle: 'B', followUpDate: 'besok' },
    { jobTitle: 'C', followUpDate: null },
  ]);
  assert.equal(good.followUpDate, '2026-03-08');
  assert.equal(bad.followUpDate, '');
  assert.equal(toRow(missing).follow_up_date, null); // '' would be rejected by Postgres
});

test('jobsToCsv quotes separators and defuses spreadsheet formulas', () => {
  const [header, row] = jobsToCsv([
    { jobTitle: '=HYPERLINK("http://x")', company: 'A, "B"', status: 'Applied', dateApplied: '2026-01-02', followUpDate: '', jobUrl: '', notes: 'baris 1\nbaris 2' },
  ]).split('\r\n');
  assert.equal(header, '"Posisi","Perusahaan","Status","Tahap terjauh","Assessment","Tanggal","Follow-up","Versi CV","Tautan","Catatan"');
  assert.ok(row.startsWith(`"'=HYPERLINK(""http://x"")","A, ""B""","Applied"`));
  assert.ok(row.endsWith('"baris 1\nbaris 2"')); // the newline stays inside its quoted cell
});

test('loginEmail pins a bare name to the domain and keeps a full address', () => {
  assert.equal(loginEmail('  Budi '), 'budi@jobtracker.local');
  assert.equal(loginEmail(' Budi@Example.com '), 'budi@example.com');
});

test('loginError blames the password only when the server rejected it', () => {
  assert.match(loginError({ status: 400, message: 'Invalid login credentials' }), /kata sandi salah/);
  assert.equal(loginError({ status: 0, message: 'Failed to fetch' }), 'Tidak bisa masuk: Failed to fetch');
  assert.equal(loginError({ status: 401, message: 'Invalid API key' }), 'Tidak bisa masuk: Invalid API key');
});

test('a job without a date stays dateless on the way in and out', () => {
  const [job] = sanitizeJobs([fromRow({ id: 'a', job_title: 'Dev', company: 'X', date_applied: null })]);
  assert.equal(job.dateApplied, ''); // not silently stamped with today
  assert.equal(toRow(job).date_applied, null); // '' would be rejected by Postgres
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
