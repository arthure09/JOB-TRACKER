import { daysLate, followUpsDue } from './jobs';

// Renders nothing when nothing is due, so it only takes space when it has
// something to ask of you.
export default function FollowUps({ jobs, onEdit, onDone }) {
  const due = followUpsDue(jobs);
  if (due.length === 0) return null;

  return (
    <section className="follow-ups" aria-label="Perlu ditindaklanjuti">
      <h2 className="panel-title">Perlu ditindaklanjuti</h2>
      <ul>
        {due.map((job) => {
          const late = daysLate(job.followUpDate);
          return (
            <li key={job.id}>
              <span className="follow-job">
                <b>{job.jobTitle}</b> · {job.company}
              </span>
              <span className={late > 0 ? 'follow-late' : 'follow-today'}>
                {late > 0 ? `terlambat ${late} hari` : 'hari ini'}
              </span>
              <button
                className="btn btn-ghost"
                onClick={() => onEdit(job)}
                aria-label={`Edit ${job.jobTitle}`}
              >
                Edit
              </button>
              <button
                className="btn"
                onClick={() => onDone(job.id)}
                aria-label={`Selesaikan follow-up ${job.jobTitle}`}
              >
                Selesai
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
