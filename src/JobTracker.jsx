import React, { useState, useEffect } from 'react';

export default function JobTracker() {
  const [jobs, setJobs] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  // PERUBAHAN: Dark mode sekarang permanen (hardcoded true)
  const darkMode = true; 

  const [formData, setFormData] = useState({
    jobTitle: '',
    company: '',
    status: 'Wishlist',
    jobUrl: '',
    dateApplied: new Date().toISOString().split('T')[0],
  });

  // Load from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('jobTrackerData');
      if (stored) {
        setJobs(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load data');
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('jobTrackerData', JSON.stringify(jobs));
  }, [jobs]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveJob = (e) => {
    e.preventDefault();
    if (!formData.jobTitle.trim() || !formData.company.trim()) {
      alert('Please fill in job title and company');
      return;
    }

    if (editingId) {
      setJobs(jobs.map(job => 
        job.id === editingId ? { ...formData, id: editingId } : job
      ));
      setEditingId(null);
    } else {
      setJobs([...jobs, { ...formData, id: Date.now() }]);
    }

    setFormData({
      jobTitle: '',
      company: '',
      status: 'Wishlist',
      jobUrl: '',
      dateApplied: new Date().toISOString().split('T')[0],
    });
    setShowModal(false);
  };

  const handleEditJob = (job) => {
    setFormData(job);
    setEditingId(job.id);
    setShowModal(true);
  };

  const handleDeleteJob = (id) => {
    if (window.confirm('Are you sure you want to delete this job?')) {
      setJobs(jobs.filter(job => job.id !== id));
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingId(null);
    setFormData({
      jobTitle: '',
      company: '',
      status: 'Wishlist',
      jobUrl: '',
      dateApplied: new Date().toISOString().split('T')[0],
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Wishlist': return 'slate-500';
      case 'Applied': return 'blue-500';
      case 'Interview': return 'yellow-400';
      case 'Offer': return 'green-500';
      case 'Rejected': return 'red-500';
      default: return 'slate-500';
    }
  };

  const stats = {
    total: jobs.length,
    applied: jobs.filter(j => j.status === 'Applied').length,
    interview: jobs.filter(j => j.status === 'Interview').length,
    offers: jobs.filter(j => j.status === 'Offer').length,
  };

  return (
    <div style={{
      fontFamily: "'Inter', sans-serif",
      backgroundColor: '#0a0a0a', // Hardcoded Dark Color
      color: '#e2e8f0',           // Hardcoded Light Text
      minHeight: '100vh',
      width: '100%',              // Memastikan lebar penuh
      padding: '0',
      margin: '0',
      boxSizing: 'border-box'
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700;800&family=Inter:wght@400;500;600&display=swap');
      `}</style>

      <div style={{ maxWidth: '80rem', margin: '0 auto', padding: '2.5rem 1rem' }}>
        
        {/* Header */}
        <header style={{ 
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          borderBottom: '2px solid #facc15',
          paddingBottom: '1rem',
          marginBottom: '2rem'
        }}>
          <h1 style={{
            fontSize: '2.25rem',
            fontWeight: 800,
            fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: '-0.025em',
            color: '#facc15',
            margin: 0
          }}>
            JOB TRACKER
          </h1>
          <button 
            onClick={() => setShowModal(true)}
            style={{
              backgroundColor: '#facc15',
              color: '#000',
              fontWeight: 'bold',
              padding: '0.5rem 1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'background-color 0.3s',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.875rem',
              border: 'none',
              cursor: 'pointer',
              borderRadius: '0'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#eab308'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#facc15'}
          >
            <span style={{ fontSize: '1.125rem' }}>+</span>
            ADD JOB
          </button>
        </header>

        {/* Stats Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 0,
          marginBottom: '2.5rem',
          border: '1px solid #262626',
          backgroundColor: '#171717'
        }}>
          {[
            { label: 'Total', value: stats.total, color: '#facc15' },
            { label: 'Applied', value: stats.applied, color: '#3b82f6' },
            { label: 'Interview', value: stats.interview, color: '#facc15' },
            { label: 'Offers', value: stats.offers, color: '#10b981' }
          ].map((stat, idx) => (
            <div key={idx} style={{
              padding: '1.5rem',
              borderRight: idx < 3 ? '1px solid #262626' : 'none'
            }}>
              <div style={{
                fontSize: '1.875rem',
                fontWeight: 'bold',
                fontFamily: "'JetBrains Mono', monospace",
                color: stat.color
              }}>
                {stat.value}
              </div>
              <div style={{
                fontSize: '0.625rem',
                fontWeight: 'bold',
                color: '#94a3b8',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                marginTop: '0.25rem'
              }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%',
            textAlign: 'left',
            borderCollapse: 'collapse'
          }}>
            <thead>
              <tr style={{
                borderBottom: '1px solid #262626'
              }}>
                {['Job Title', 'Company', 'Status', 'Date Applied', 'Link', 'Actions'].map((header) => (
                  <th key={header} style={{
                    padding: '0.75rem 1rem',
                    fontSize: '0.625rem',
                    fontWeight: 'bold',
                    color: '#94a3b8',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    fontFamily: "'JetBrains Mono', monospace"
                  }}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{
                    padding: '2rem 1rem',
                    textAlign: 'center',
                    color: '#64748b'
                  }}>
                    No jobs added yet. Click "Add Job" to get started!
                  </td>
                </tr>
              ) : (
                jobs.map((job) => (
                  <tr 
                    key={job.id}
                    style={{
                      borderBottom: '1px solid #262626',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1a1a1a'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td style={{
                      padding: '1rem',
                      fontWeight: 'bold',
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: '0.875rem'
                    }}>
                      {job.jobTitle}
                    </td>
                    <td style={{
                      padding: '1rem',
                      fontSize: '0.875rem',
                      fontFamily: "'JetBrains Mono', monospace"
                    }}>
                      {job.company}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{
                        padding: '2px 8px',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        letterSpacing: '0.05em',
                        textTransform: 'uppercase',
                        border: `1px solid ${getStatusColor(job.status) === 'slate-500' ? '#64748b' : getStatusColor(job.status) === 'blue-500' ? '#3b82f6' : getStatusColor(job.status) === 'yellow-400' ? '#facc15' : getStatusColor(job.status) === 'green-500' ? '#10b981' : '#ef4444'}`,
                        color: getStatusColor(job.status) === 'slate-500' ? '#64748b' : getStatusColor(job.status) === 'blue-500' ? '#3b82f6' : getStatusColor(job.status) === 'yellow-400' ? '#facc15' : getStatusColor(job.status) === 'green-500' ? '#10b981' : '#ef4444',
                        fontFamily: "'JetBrains Mono', monospace",
                        display: 'inline-block'
                      }}>
                        {job.status}
                      </span>
                    </td>
                    <td style={{
                      padding: '1rem',
                      fontSize: '0.875rem',
                      fontFamily: "'JetBrains Mono', monospace",
                      color: '#64748b'
                    }}>
                      {job.dateApplied}
                    </td>
                    <td style={{
                      padding: '1rem',
                      fontSize: '0.875rem',
                      fontFamily: "'JetBrains Mono', monospace"
                    }}>
                      {job.jobUrl ? (
                        <a 
                          href={job.jobUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{
                            color: '#facc15',
                            textDecoration: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                          onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                        >
                          Link
                        </a>
                      ) : (
                        <span>—</span>
                      )}
                    </td>
                    <td style={{
                      padding: '1rem',
                      color: '#64748b'
                    }}>
                      <div style={{
                        display: 'flex',
                        gap: '0.75rem'
                      }}>
                        <button 
                          onClick={() => handleEditJob(job)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'inherit',
                            transition: 'color 0.2s',
                            fontSize: '1.125rem',
                            padding: 0
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.color = '#facc15'}
                          onMouseLeave={(e) => e.currentTarget.style.color = '#64748b'}
                        >
                          edit
                        </button>
                        <button 
                          onClick={() => handleDeleteJob(job.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'inherit',
                            transition: 'color 0.2s',
                            fontSize: '1.125rem',
                            padding: 0
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                          onMouseLeave={(e) => e.currentTarget.style.color = '#64748b'}
                        >
                          delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(4px)',
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: '#171717',
            width: '100%',
            maxWidth: '28rem',
            border: '1px solid #262626',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            borderRadius: '4px'
          }}>
            <div style={{
              padding: '1.5rem 1.5rem 0 1.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start'
            }}>
              <div>
                <h2 style={{
                  fontSize: '1.5rem',
                  fontWeight: 800,
                  fontFamily: "'JetBrains Mono', monospace",
                  color: '#facc15',
                  letterSpacing: '-0.025em',
                  textTransform: 'uppercase',
                  margin: 0
                }}>
                  {editingId ? 'EDIT JOB' : 'ADD NEW JOB'}
                </h2>
                <p style={{
                  fontSize: '0.75rem',
                  color: '#94a3b8',
                  fontFamily: "'JetBrains Mono', monospace",
                  margin: '0.25rem 0 0 0'
                }}>
                  {editingId ? 'Update job details' : 'Track a new job application'}
                </p>
              </div>
              <button 
                onClick={handleCloseModal}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#64748b',
                  fontSize: '1.5rem',
                  transition: 'color 0.2s',
                  padding: 0
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#64748b'}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveJob} style={{
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem'
            }}>
              {[
                { label: 'Job Title *', name: 'jobTitle', type: 'text', placeholder: 'e.g. Senior Software Engineer' },
                { label: 'Company *', name: 'company', type: 'text', placeholder: 'e.g. Google' },
                { label: 'Job URL', name: 'jobUrl', type: 'url', placeholder: 'https://...' },
                { label: 'Date Applied', name: 'dateApplied', type: 'date' }
              ].map((field) => (
                <div key={field.name}>
                  <label style={{
                    fontSize: '0.625rem',
                    fontWeight: 'bold',
                    color: '#94a3b8',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    fontFamily: "'JetBrains Mono', monospace",
                    marginBottom: '0.5rem',
                    display: 'block'
                  }}>
                    {field.label}
                  </label>
                  <input 
                    type={field.type}
                    name={field.name}
                    value={formData[field.name]}
                    onChange={handleInputChange}
                    placeholder={field.placeholder}
                    style={{
                      width: '100%',
                      backgroundColor: '#000',
                      border: '1px solid #262626',
                      borderRadius: '4px',
                      padding: '0.75rem',
                      fontSize: '0.875rem',
                      fontFamily: "'JetBrains Mono', monospace",
                      outline: 'none',
                      color: '#fff',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#facc15'}
                    onBlur={(e) => e.target.style.borderColor = '#262626'}
                  />
                </div>
              ))}

              {/* Status Dropdown */}
              <div>
                <label style={{
                  fontSize: '0.625rem',
                  fontWeight: 'bold',
                  color: '#94a3b8',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  fontFamily: "'JetBrains Mono', monospace",
                  marginBottom: '0.5rem',
                  display: 'block'
                }}>
                  Status
                </label>
                <div style={{ position: 'relative' }}>
                  <select 
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    style={{
                      width: '100%',
                      backgroundColor: '#000',
                      border: '1px solid #262626',
                      borderRadius: '4px',
                      padding: '0.75rem',
                      fontSize: '0.875rem',
                      fontFamily: "'JetBrains Mono', monospace",
                      outline: 'none',
                      color: '#fff',
                      appearance: 'none',
                      boxSizing: 'border-box',
                      paddingRight: '2rem'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#facc15'}
                    onBlur={(e) => e.target.style.borderColor = '#262626'}
                  >
                    <option>Wishlist</option>
                    <option>Applied</option>
                    <option>Interview</option>
                    <option>Offer</option>
                    <option>Rejected</option>
                  </select>
                  <span style={{
                    position: 'absolute',
                    right: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none',
                    color: '#94a3b8',
                    fontSize: '0.875rem'
                  }}>
                    ▼
                  </span>
                </div>
              </div>

              {/* Buttons */}
              <div style={{
                display: 'flex',
                gap: '1rem',
                paddingTop: '0.5rem'
              }}>
                <button 
                  type="submit"
                  style={{
                    flex: 1,
                    backgroundColor: '#facc15',
                    color: '#000',
                    fontWeight: 800,
                    fontFamily: "'JetBrains Mono', monospace",
                    padding: '0.75rem',
                    fontSize: '0.875rem',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                    borderRadius: '0'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#eab308'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#facc15'}
                >
                  {editingId ? 'UPDATE JOB' : 'SAVE JOB'}
                </button>
                <button 
                  type="button"
                  onClick={handleCloseModal}
                  style={{
                    flex: 1,
                    border: '1px solid #262626',
                    backgroundColor: 'transparent',
                    color: '#fff',
                    fontWeight: 800,
                    fontFamily: "'JetBrains Mono', monospace",
                    padding: '0.75rem',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                    borderRadius: '0'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#1a1a1a'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                >
                  CANCEL
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}