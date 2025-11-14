import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import type { Job, Application } from '../types';
import AdminJobForm from '../components/AdminJobForm';

const FUNCTION_BASE = import.meta.env.VITE_FUNCTION_BASE as string;
const BUCKET = (import.meta.env.VITE_STORAGE_BUCKET as string) || 'resumes';
const ADMIN_SECRET = (import.meta.env.VITE_ADMIN_SECRET as string) || '';

export default function AdminPanel(): JSX.Element {
  const [authorized, setAuthorized] = useState<boolean>(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobTypes, setJobTypes] = useState<{ id: string; name: string }[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(false);
  const [showJobForm, setShowJobForm] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [selectedApp, setSelectedApp] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | string>('all');

  useEffect(() => {
    // Show prompt only if URL has the admin hash or user navigated to /admin
    const hash = window.location.hash;
    if (hash === '#admin-secret-panel' || window.location.pathname === '/admin') {
      promptForSecret();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function promptForSecret() {
    const attempt = window.prompt('Enter admin secret to continue:');
    if (attempt && ADMIN_SECRET && attempt === ADMIN_SECRET) {
      setAuthorized(true);
      await fetchAll();
    } else {
      setAuthorized(false);
      alert('Incorrect admin secret.');
    }
  }

  async function fetchAll() {
    setLoading(true);
    try {
      const [{ data: jobsData }, { data: typesData }, { data: appsData }] = await Promise.all([
        supabase.from<Job>('jobs').select('*').order('created_at', { ascending: false }),
        supabase.from('job_types').select('*').order('created_at', { ascending: false }),
        supabase.from<Application>('applications').select('*').order('created_at', { ascending: false })
      ]);
      setJobs(jobsData || []);
      setJobTypes((typesData || []) as { id: string; name: string }[]);
      setApplications(appsData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function openCreateJob() {
    setEditingJob(null);
    setShowJobForm(true);
  }

  function openEditJob(job: Job) {
    setEditingJob(job);
    setShowJobForm(true);
  }

  async function deleteJob(id: string) {
    if (!confirm('Delete this job?')) return;
    const { error } = await supabase.from('jobs').delete().eq('id', id);
    if (error) alert('Delete failed: ' + error.message);
    else fetchAll();
  }

  async function createJobType() {
    const name = window.prompt('New job type name:');
    if (!name) return;
    const { error } = await supabase.from('job_types').insert([{ name }]);
    if (error) alert('Create failed: ' + error.message);
    else fetchAll();
  }

  async function deleteApplication(id: string) {
    if (!confirm('Delete this application?')) return;
    const { error } = await supabase.from('applications').delete().eq('id', id);
    if (error) alert('Delete failed: ' + error.message);
    else fetchAll();
  }

  async function getSignedUrl(path: string) {
    if (!FUNCTION_BASE) {
      alert('No function base configured (VITE_FUNCTION_BASE).');
      return;
    }
    try {
      const res = await fetch(`${FUNCTION_BASE}/get-signed-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, expires: 120 })
      });
      const json = await res.json();
      if (json?.signedUrl) {
        window.open(json.signedUrl, '_blank', 'noopener,noreferrer');
      } else {
        alert('Could not get signed URL');
      }
    } catch (err) {
      console.error(err);
      alert('Signed URL request failed');
    }
  }

  async function onJobSaved() {
    setShowJobForm(false);
    setEditingJob(null);
    await fetchAll();
  }

  const filteredApps = applications.filter(app => {
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      (app.full_name && app.full_name.toLowerCase().includes(q)) ||
      (app.email && app.email.toLowerCase().includes(q)) ||
      (app.position && app.position.toLowerCase().includes(q));
    const matchesStatus = filterStatus === 'all' || app.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  if (!authorized) {
    return (
      <div className="page">
        <h2>Admin</h2>
        <p>Admin access is protected by a secret. Append <code>#admin-secret-panel</code> to the URL or visit /admin to be prompted.</p>
        <button onClick={promptForSecret}>Enter Admin Secret</button>
      </div>
    );
  }

  return (
    <div className="page admin-page">
      <header className="header">
        <h1>Admin Dashboard</h1>
        <div className="admin-actions">
          <button onClick={openCreateJob}>+ Create Job</button>
          <button onClick={createJobType}>+ Create Job Type</button>
          <button onClick={() => { setAuthorized(false); window.location.hash = ''; }}>Lock Admin</button>
        </div>
      </header>

      <section className="admin-grid">
        <div className="admin-column">
          <h3>Jobs</h3>
          {loading ? <p>Loading...</p> : (
            <div className="list">
              {jobs.map(j => (
                <div key={j.id} className="list-item">
                  <div>
                    <strong>{j.title}</strong>
                    <div className="muted">/{j.slug} • {j.status}</div>
                  </div>
                  <div className="item-actions">
                    <button onClick={() => openEditJob(j)}>Edit</button>
                    <button onClick={() => deleteJob(j.id)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="admin-column">
          <h3>Applications</h3>
          <div className="admin-controls">
            <input placeholder="Search name/email/position" value={search} onChange={e => setSearch(e.target.value)} />
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)}>
              <option value="all">All status</option>
              <option value="submitted">submitted</option>
              <option value="reviewing">reviewing</option>
              <option value="rejected">rejected</option>
              <option value="accepted">accepted</option>
            </select>
            <button onClick={() => { navigator.clipboard?.writeText(JSON.stringify(filteredApps)); alert('Copied JSON of filtered apps to clipboard (quick export)'); }}>Quick Export (JSON)</button>
          </div>

          {filteredApps.length === 0 ? <p>No applications found.</p> : (
            <div className="list">
              {filteredApps.map(app => (
                <div key={app.id} className="list-item">
                  <div>
                    <strong>{app.full_name}</strong>
                    <div className="muted">{app.email} • {app.position} • {app.status}</div>
                    <div className="muted small">Applied: {new Date(app.created_at || '').toLocaleString()}</div>
                    {selectedApp === app.id && (
                      <div className="app-details">
                        <p><strong>Why interested:</strong> {app.why_interested}</p>
                        <p><strong>Experience:</strong> {app.experience}</p>
                      </div>
                    )}
                  </div>

                  <div className="item-actions">
                    <button onClick={() => setSelectedApp(selectedApp === app.id ? null : app.id)}>{selectedApp === app.id ? 'Hide' : 'View'}</button>
                    {app.resume_path && <button onClick={() => getSignedUrl(app.resume_path)}>Download Resume</button>}
                    {app.cover_letter_path && <button onClick={() => getSignedUrl(app.cover_letter_path)}>Download Cover</button>}
                    <button onClick={() => deleteApplication(app.id)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="admin-column">
          <h3>Job Types</h3>
          <div className="list">
            {jobTypes.map(t => (
              <div key={t.id} className="list-item">
                <div>
                  <strong>{t.name}</strong>
                </div>
                <div className="item-actions">
                  <button onClick={async () => {
                    if (!confirm('Delete job type? This will not delete jobs but may leave job_type_id null.')) return;
                    const { error } = await supabase.from('job_types').delete().eq('id', t.id);
                    if (error) alert('Delete failed: ' + error.message);
                    else fetchAll();
                  }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {showJobForm && (
        <div className="modal">
          <div className="modal-inner">
            <button className="modal-close" onClick={() => setShowJobForm(false)}>×</button>
            <AdminJobForm
              job={editingJob}
              jobTypes={jobTypes}
              onSaved={onJobSaved}
              onCancel={() => { setShowJobForm(false); setEditingJob(null); }}
            />
          </div>
        </div>
      )}
    </div>
  );
}