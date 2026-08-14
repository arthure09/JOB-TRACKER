import Icon from './Icon';
import { SORTS, STATUSES, visibleJobs } from './jobs';

const prettyDate = (iso) =>
  iso
    ? new Date(`${iso}T00:00:00`).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '—';

function Empty({ hasJobs, onAdd, onReset }) {
  return (
    <div className="empty">
      <h3>{hasJobs ? 'Tidak ada yang cocok' : 'Corongnya masih kosong'}</h3>
      <p>
        {hasJobs
          ? 'Ubah kata kuncinya, atau tampilkan semua lamaran.'
          : 'Catat lowongan pertama yang kamu incar. Corong di atas mulai terisi begitu ada satu.'}
      </p>
      {hasJobs ? (
        <button className="btn" onClick={onReset}>
          Tampilkan semua
        </button>
      ) : (
        <button className="btn btn-primary" onClick={onAdd}>
          <Icon name="plus" /> Tambah lamaran
        </button>
      )}
    </div>
  );
}

function Row({ job, onEdit, onRemove, onStatus }) {
  return (
    <tr>
      <td className="cell-title">
        {job.jobTitle}
        {job.notes && <small>{job.notes}</small>}
      </td>
      <td data-label="Perusahaan">{job.company}</td>
      <td data-label="Status">
        <select
          className="pill"
          value={job.status}
          onChange={(e) => onStatus(job.id, e.target.value)}
          aria-label={`Status ${job.jobTitle}`}
          style={{
            '--pill-bg': `var(--${job.status}-bg)`,
            '--pill-fg': `var(--${job.status}-fg)`,
          }}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </td>
      <td className="muted" data-label="Tanggal">
        {prettyDate(job.dateApplied)}
      </td>
      <td data-label="Tautan">
        {job.jobUrl ? (
          <a className="link" href={job.jobUrl} target="_blank" rel="noopener noreferrer">
            Buka ↗
          </a>
        ) : (
          <span className="muted">—</span>
        )}
      </td>
      <td>
        <div className="row-actions">
          <button
            className="btn btn-ghost"
            onClick={() => onEdit(job)}
            aria-label={`Edit ${job.jobTitle}`}
          >
            <Icon name="edit" /> Edit
          </button>
          <button
            className="btn btn-ghost danger"
            onClick={() => onRemove(job)}
            aria-label={`Hapus ${job.jobTitle}`}
          >
            <Icon name="trash" />
          </button>
        </div>
      </td>
    </tr>
  );
}

// Owns the search/sort controls because they scope nothing but this table.
export default function JobTable({ jobs, filter, onFilter, onAdd, onEdit, onRemove, onStatus }) {
  const rows = visibleJobs(jobs, filter);

  return (
    <>
      {/* Nothing to search or sort until there is a first application. */}
      <div className="toolbar" hidden={jobs.length === 0}>
        <div className="search">
          <Icon name="search" />
          <input
            type="search"
            value={filter.q}
            onChange={(e) => onFilter({ ...filter, q: e.target.value })}
            placeholder="Cari posisi, perusahaan, atau catatan…"
            aria-label="Cari lamaran"
          />
        </div>
        <select
          value={filter.sort}
          onChange={(e) => onFilter({ ...filter, sort: e.target.value })}
          aria-label="Urutkan"
        >
          {Object.entries(SORTS).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {rows.length === 0 ? (
        <Empty
          hasJobs={jobs.length > 0}
          onAdd={onAdd}
          onReset={() => onFilter({ ...filter, q: '', status: 'All' })}
        />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Posisi</th>
                <th>Perusahaan</th>
                <th>Status</th>
                <th>Tanggal</th>
                <th>Tautan</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((job) => (
                <Row
                  key={job.id}
                  job={job}
                  onEdit={onEdit}
                  onRemove={onRemove}
                  onStatus={onStatus}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
