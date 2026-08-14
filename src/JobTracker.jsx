import { useEffect, useState } from 'react';
import Dashboard from './Dashboard';
import Icon from './Icon';
import JobDialog from './JobDialog';
import JobTable from './JobTable';
import { supabase } from './supabase';
import { applyTheme, readTheme } from './theme';
import { blankJob, countByStatus, fromRow, sanitizeJobs, summary, toRow } from './jobs';

const LEGACY_KEY = 'jobTrackerData';

// Jobs saved before this app had accounts. Moved into the account on first
// sign-in, then the key is dropped so it can only ever happen once.
//
// Order matters: the key is the ONLY copy of this data, so it is deleted after
// the insert is confirmed, never before. A failed upload must leave it in place
// to be retried on the next sign-in.
async function adoptLocalJobs(userId) {
  const raw = localStorage.getItem(LEGACY_KEY);
  if (!raw) return;

  let jobs;
  try {
    jobs = sanitizeJobs(JSON.parse(raw));
  } catch {
    localStorage.removeItem(LEGACY_KEY); // unreadable, so there is nothing to lose
    return;
  }

  if (jobs.length) {
    const { error } = await supabase
      .from('jobs')
      .insert(jobs.map((j) => ({ ...toRow(j), user_id: userId })));
    if (error) {
      alert(`Gagal memindahkan data lama ke akunmu: ${error.message}\nData lamamu masih aman, akan dicoba lagi nanti.`);
      return;
    }
  }
  localStorage.removeItem(LEGACY_KEY);
}

export default function JobTracker({ user }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState(readTheme);
  const [filter, setFilter] = useState({ q: '', status: 'All', sort: 'newest' });
  // null = closed. An object = the dialog is open on that draft.
  const [editing, setEditing] = useState(null);

  useEffect(() => applyTheme(theme), [theme]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await adoptLocalJobs(user.id);
      const { data, error } = await supabase.from('jobs').select('*');
      if (cancelled) return;
      // The rows come off the network, so they are untrusted like any import.
      if (error) alert(`Gagal memuat lamaran: ${error.message}`);
      else setJobs(sanitizeJobs((data ?? []).map(fromRow)));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user.id]);

  const counts = countByStatus(jobs);
  const stats = summary(jobs);

  // ponytail: every mutation waits for the database and takes its answer as
  // truth — one round trip of lag, but never a UI that disagrees with storage.
  // Add optimistic updates only if the lag becomes annoying in practice.
  // Throws rather than alerts: the dialog already has a place to show an error,
  // and a failed save must keep the dialog open so the typing isn't lost.
  const save = async (job) => {
    if (job.id) {
      const { error } = await supabase.from('jobs').update(toRow(job)).eq('id', job.id);
      if (error) throw error;
      setJobs((js) => js.map((j) => (j.id === job.id ? job : j)));
    } else {
      const { data, error } = await supabase
        .from('jobs')
        .insert({ ...toRow(job), user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      setJobs((js) => [...js, fromRow(data)]);
    }
  };

  const setStatusOf = async (id, status) => {
    const { error } = await supabase.from('jobs').update({ status }).eq('id', id);
    if (error) return alert(`Gagal mengubah status: ${error.message}`);
    setJobs((js) => js.map((j) => (j.id === id ? { ...j, status } : j)));
  };

  const remove = async (job) => {
    if (!confirm(`Hapus "${job.jobTitle}" di ${job.company}?`)) return;
    const { error } = await supabase.from('jobs').delete().eq('id', job.id);
    if (error) return alert(`Gagal menghapus: ${error.message}`);
    setJobs((js) => js.filter((j) => j.id !== job.id));
  };

  if (loading)
    return (
      <div className="gate">
        <span className="spinner spinner-lg" />
      </div>
    );

  return (
    <div className="page">
      <header className="head">
        <div>
          <p className="eyebrow">Perburuan kerja</p>
          <h1>Job Tracker</h1>
          <p>
            {jobs.length === 0
              ? 'Belum ada lamaran. Catat yang pertama untuk mulai melihat corongnya.'
              : `${stats.active} masih berjalan · ${counts.Interview} sedang interview · ${counts.Offer} offer`}
          </p>
        </div>
        <div className="head-actions">
          <button
            className="btn btn-ghost"
            onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
            title={theme === 'dark' ? 'Mode terang' : 'Mode gelap'}
            aria-label={theme === 'dark' ? 'Mode terang' : 'Mode gelap'}
          >
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
          </button>
          {/* The browser's own print dialog is the PDF writer — "Save as PDF"
              exists on every desktop OS, so no export library has to. What is
              printed is what is on screen: filter first, then export. */}
          <button className="btn" onClick={() => window.print()} disabled={jobs.length === 0}>
            Ekspor PDF
          </button>
          <button className="btn btn-primary" onClick={() => setEditing(blankJob())}>
            <Icon name="plus" /> Tambah lamaran
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => supabase.auth.signOut()}
            title={user.email}
          >
            Keluar
          </button>
        </div>
      </header>

      <Dashboard
        jobs={jobs}
        status={filter.status}
        onStatus={(status) => setFilter((f) => ({ ...f, status }))}
      />

      <JobTable
        jobs={jobs}
        filter={filter}
        onFilter={setFilter}
        onAdd={() => setEditing(blankJob())}
        onEdit={(job) => setEditing({ ...job })}
        onRemove={remove}
        onStatus={setStatusOf}
      />

      {editing && <JobDialog job={editing} onSave={save} onClose={() => setEditing(null)} />}
    </div>
  );
}
