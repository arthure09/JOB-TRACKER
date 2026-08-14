import { useEffect, useRef, useState } from 'react';
import { STATUSES, safeUrl } from './jobs';

function Field({ id, label, children }) {
  return (
    <div>
      <label htmlFor={id}>{label}</label>
      {children}
    </div>
  );
}

// Mounted only while open, so the form state starts from `job` and dies with it
// — no effect syncing props into state, no stale values on the next open.
export default function JobDialog({ job, onSave, onClose }) {
  const [form, setForm] = useState(job);
  const [error, setError] = useState('');
  const dialog = useRef(null);
  const editing = Boolean(job.id);

  useEffect(() => dialog.current.showModal(), []);

  const set = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.jobTitle.trim() || !form.company.trim()) {
      setError('Posisi dan perusahaan wajib diisi.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave({ ...form, jobUrl: safeUrl(form.jobUrl.trim()) });
      dialog.current.close();
    } catch (err) {
      // Stay open on failure so the typing survives a dropped connection.
      setError(`Gagal menyimpan: ${err.message}`);
      setSaving(false);
    }
  };

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      onClick={(e) => e.target === dialog.current && dialog.current.close()}
    >
      <div className="dialog-head">
        <h2>{editing ? 'Edit lamaran' : 'Tambah lamaran'}</h2>
        <p>{editing ? 'Perbarui detail lamaran ini.' : 'Catat lowongan yang kamu incar.'}</p>
      </div>
      <form onSubmit={submit}>
        <Field id="jobTitle" label="Posisi *">
          <input
            id="jobTitle"
            className="field"
            name="jobTitle"
            value={form.jobTitle}
            onChange={set}
            placeholder="mis. Frontend Engineer"
            autoFocus
          />
        </Field>
        <Field id="company" label="Perusahaan *">
          <input
            id="company"
            className="field"
            name="company"
            value={form.company}
            onChange={set}
            placeholder="mis. Tokopedia"
          />
        </Field>
        <div className="grid-2">
          <Field id="status" label="Status">
            <select id="status" className="field" name="status" value={form.status} onChange={set}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
          <Field id="dateApplied" label="Tanggal">
            <input
              id="dateApplied"
              className="field"
              type="date"
              name="dateApplied"
              value={form.dateApplied}
              onChange={set}
            />
          </Field>
        </div>
        <Field id="jobUrl" label="Tautan lowongan">
          <input
            id="jobUrl"
            className="field"
            type="url"
            name="jobUrl"
            value={form.jobUrl}
            onChange={set}
            placeholder="https://…"
          />
        </Field>
        <Field id="notes" label="Catatan">
          <textarea
            id="notes"
            className="field"
            name="notes"
            value={form.notes}
            onChange={set}
            placeholder="Nama recruiter, ekspektasi gaji, jadwal follow-up…"
          />
        </Field>
        {error && <p className="error">{error}</p>}
        <div className="dialog-actions">
          <button type="button" className="btn" onClick={() => dialog.current.close()}>
            Batal
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Menyimpan…' : editing ? 'Simpan perubahan' : 'Tambah lamaran'}
          </button>
        </div>
      </form>
    </dialog>
  );
}
