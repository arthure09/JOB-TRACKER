import { useEffect, useRef, useState } from 'react';
import { STATUSES, didAssessment, reachOf, reachOptions, safeUrl, withStatus } from './jobs';

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
export default function JobDialog({ job, versions, onSave, onClose }) {
  const [form, setForm] = useState(job);
  const [error, setError] = useState('');
  const dialog = useRef(null);
  const editing = Boolean(job.id);

  useEffect(() => dialog.current.showModal(), []);

  const set = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  const setStatus = (e) => setForm((f) => withStatus(f, e.target.value));

  // Every way out except a successful save comes through here, so a stray click
  // on the backdrop can't discard what was typed.
  const requestClose = () => {
    const dirty = JSON.stringify(form) !== JSON.stringify(job);
    if (!dirty || confirm('Buang perubahan yang belum disimpan?')) dialog.current.close();
  };

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
      await onSave({
        ...form,
        jobUrl: safeUrl(form.jobUrl.trim()),
        cvVersion: form.cvVersion.trim(),
      });
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
      onCancel={(e) => {
        e.preventDefault();
        requestClose();
      }}
      onClick={(e) => e.target === dialog.current && requestClose()}
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
            <select id="status" className="field" name="status" value={form.status} onChange={setStatus}>
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
        <Field id="cvVersion" label="Versi CV">
          <input
            id="cvVersion"
            className="field"
            name="cvVersion"
            list="cv-versions"
            maxLength={100}
            value={form.cvVersion}
            onChange={set}
            placeholder="mis. CV Frontend v2"
          />
          <datalist id="cv-versions">
            {versions.map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
        </Field>
        <div className="grid-2">
          {/* The only way to tell the funnel about the past, or to undo a mis-click:
              a job rejected before this field existed, or one set to Interview by mistake. */}
          <Field id="furthestStatus" label="Tahap terjauh">
            <select
              id="furthestStatus"
              className="field"
              name="furthestStatus"
              value={reachOf(form)}
              onChange={set}
            >
              {reachOptions(form).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
          <Field id="followUpDate" label="Follow-up berikutnya">
            <input
              id="followUpDate"
              className="field"
              type="date"
              name="followUpDate"
              value={form.followUpDate}
              onChange={set}
            />
          </Field>
        </div>
        {/* For an assessment done before this status existed, or to undo a mis-click. */}
        <label className="check">
          <input
            type="checkbox"
            checked={didAssessment(form)}
            disabled={form.status === 'Assessment'}
            onChange={(e) => setForm((f) => ({ ...f, hadAssessment: e.target.checked }))}
          />
          Pernah melewati assessment
        </label>
        <Field id="notes" label="Catatan">
          <textarea
            id="notes"
            className="field"
            name="notes"
            value={form.notes}
            onChange={set}
            placeholder="Nama recruiter, ekspektasi gaji…"
          />
        </Field>
        {error && <p className="error">{error}</p>}
        <div className="dialog-actions">
          <button type="button" className="btn" onClick={requestClose}>
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
