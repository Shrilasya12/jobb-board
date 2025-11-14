import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import type { Job } from '../types';

export default function JobsList() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchJobs();
  }, []);

  async function fetchJobs() {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from<Job>('jobs')
      .select('id,slug,title,short_description,location,salary')
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) setError(error.message);
    else setJobs(data || []);
    setLoading(false);
  }

  function openJobNewTab(slug: string) {
    const url = `${window.location.origin}/jobs/${encodeURIComponent(slug)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  return (
    <div className="page">
      <header className="header">
        <h1>Job Board</h1>
        <p>Open roles — click a job to view details and apply (opens in a new tab).</p>
      </header>

      {error && <div className="message error">{error}</div>}
      {loading ? (
        <div>Loading jobs...</div>
      ) : jobs.length === 0 ? (
        <div>No jobs available</div>
      ) : (
        <div className="cards">
          {jobs.map((job) => (
            <div className="card" key={job.id}>
              <h3>{job.title}</h3>
              <p className="muted">{job.short_description}</p>
              <div className="meta">
                {job.location && <span>📍 {job.location}</span>}
                {job.salary && <span>💰 {job.salary}</span>}
              </div>
              <div className="actions">
                <button onClick={() => openJobNewTab(job.slug)}>View Details & Apply</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <footer className="footer">
        <small>Admin: append <code>#admin-secret-panel</code> to the app URL (UI prompt). For production use Auth + RLS.</small>
      </footer>
    </div>
  );
}