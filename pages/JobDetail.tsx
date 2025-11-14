import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import type { Job } from '../types';

const BUCKET = (import.meta.env.VITE_STORAGE_BUCKET as string) || 'resumes';
const FUNCTION_BASE = import.meta.env.VITE_FUNCTION_BASE as string; // e.g. https://<project>.functions.supabase.co

export default function JobDetail(): JSX.Element {
  const { slug } = useParams<{ slug: string }>();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [msg, setMsg] = useState<string | null>(null);

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone_number: '',
    location: '',
    how_heard: '',
    why_interested: '',
    experience: '',
    resume: null as File | null,
    cover_letter: null as File | null,
    agree_data_sharing: false
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!slug) return;
    fetchJob();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  async function fetchJob() {
    setLoading(true);
    setMsg(null);
    try {
      const { data, error } = await supabase
        .from<Job>('jobs')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        setMsg('Job not found');
        setJob(null);
      } else {
        setJob(data);
      }
    } catch (err: any) {
      setMsg(err.message || 'Error loading job');
    } finally {
      setLoading(false);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const target = e.target as HTMLInputElement;
    const { name, value, type, checked } = target as any;
    if (type === 'checkbox') {
      setForm(prev => ({ ...prev, [name]: checked }));
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const { name } = e.target;
    const file = e.target.files?.[0] ?? null;
    setForm(prev => ({ ...prev, [name]: file }));
  }

  async function uploadFile(file: File, folder = 'applications') {
    const ext = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.round(Math.random() * 1e6)}.${ext}`;
    const path = `${folder}/${fileName}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
      cacheControl: '3600',
      upsert: false
    });
    if (error) throw error;
    return path;
  }

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    setMsg(null);

    if (!job) {
      setMsg('Job is not loaded');
      return;
    }

    // Validation
    if (!form.agree_data_sharing) {
      setMsg('Please agree to share your data for recruitment purposes.');
      return;
    }
    if (!form.full_name || !form.email || !form.phone_number || !form.location || !form.how_heard || !form.why_interested || !form.experience || !form.resume) {
      setMsg('Please fill in all required fields and upload your resume.');
      return;
    }

    setSubmitting(true);

    try {
      // 1) Upload files to private bucket
      const resumePath = await uploadFile(form.resume as File, `applications/${job.slug}`);
      const coverLetterPath = form.cover_letter ? await uploadFile(form.cover_letter as File, `applications/${job.slug}`) : null;

      // 2) Insert application record (store paths, not public urls)
      const { error: insertError, data: inserted } = await supabase
        .from('applications')
        .insert([{
          job_id: job.id,
          full_name: form.full_name,
          email: form.email,
          phone_number: form.phone_number,
          location: form.location,
          how_heard: form.how_heard,
          why_interested: form.why_interested,
          experience: form.experience,
          resume_path: resumePath,
          cover_letter_path: coverLetterPath,
          agree_data_sharing: form.agree_data_sharing
        }])
        .select()
        .single();

      if (insertError) throw insertError;

      // 3) Call Edge Function to send email notification (server-side using SendGrid)
      try {
        if (FUNCTION_BASE) {
          await fetch(`${FUNCTION_BASE}/send-application-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              application: inserted,
              job
            })
          });
        }
      } catch (fnErr) {
        // Do not block the user if email fails; log and continue
        console.warn('send-application-email call failed', fnErr);
      }

      setMsg('Application submitted successfully. Thank you!');
      setForm({
        full_name: '',
        email: '',
        phone_number: '',
        location: '',
        how_heard: '',
        why_interested: '',
        experience: '',
        resume: null,
        cover_letter: null,
        agree_data_sharing: false
      });
    } catch (err: any) {
      setMsg(err.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="page"><p>Loading job...</p></div>;
  if (!job) return <div className="page"><p>{msg ?? 'No job found'}</p></div>;

  return (
    <div className="page job-detail-page">
      <header className="header job-hero">
        <button
          className="back-btn"
          onClick={() => {
            // go back to root in same tab
            try { window.history.replaceState({}, '', '/'); } catch {}
            window.location.href = '/';
          }}
        >
          ← Back to Jobs
        </button>
        <div className="job-head">
          <h1>{job.title}</h1>
          <div className="job-meta">
            {job.location && <span>📍 {job.location}</span>}
            {job.salary && <span>💰 {job.salary}</span>}
          </div>
        </div>
      </header>

      <main className="content-grid">
        <section className="job-info">
          {job.description && (
            <article className="section">
              <h2>Description</h2>
              <p>{job.description}</p>
            </article>
          )}

          {job.overview && (
            <article className="section">
              <h2>Overview</h2>
              <p>{job.overview}</p>
            </article>
          )}

          {job.position_summary && (
            <article className="section">
              <h2>Position Summary</h2>
              <p>{job.position_summary}</p>
            </article>
          )}

          {job.responsibilities && (
            <article className="section">
              <h2>Responsibilities</h2>
              <div className="rich-text">
                {job.responsibilities.split('\n').map((line, idx) => <p key={idx}>{line}</p>)}
              </div>
            </article>
          )}

          {job.requirements && (
            <article className="section">
              <h2>Requirements</h2>
              <div className="rich-text">
                {job.requirements.split('\n').map((line, idx) => <p key={idx}>{line}</p>)}
              </div>
            </article>
          )}

          {job.qualifications && (
            <article className="section">
              <h2>Qualifications</h2>
              <div className="rich-text">
                {job.qualifications.split('\n').map((line, idx) => <p key={idx}>{line}</p>)}
              </div>
            </article>
          )}

          {job.benefits && (
            <article className="section">
              <h2>Benefits</h2>
              <div className="rich-text">
                {job.benefits.split('\n').map((line, idx) => <p key={idx}>{line}</p>)}
              </div>
            </article>
          )}
        </section>

        <aside className="application-aside">
          <h2>Apply for this Position</h2>

          {msg && <div className={`message ${msg.toLowerCase().includes('error') ? 'error' : 'success'}`}>{msg}</div>}

          <form onSubmit={handleSubmit} className="application-form">
            <fieldset className="fieldset">
              <legend>Personal Details</legend>
              <label>
                Full Name *
                <input name="full_name" value={form.full_name} onChange={handleChange} required />
              </label>
              <label>
                Email Address *
                <input name="email" type="email" value={form.email} onChange={handleChange} required />
              </label>
              <label>
                Phone Number *
                <input name="phone_number" type="tel" value={form.phone_number} onChange={handleChange} required />
              </label>
              <label>
                Location / City *
                <input name="location" value={form.location} onChange={handleChange} required />
              </label>
            </fieldset>

            <fieldset className="fieldset">
              <legend>Job Info</legend>
              <label>
                How did you hear about this job? *
                <select name="how_heard" value={form.how_heard} onChange={handleChange} required>
                  <option value="">Select an option</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="indeed">Indeed</option>
                  <option value="company-website">Company Website</option>
                  <option value="referral">Referral</option>
                  <option value="job-board">Job Board</option>
                  <option value="other">Other</option>
                </select>
              </label>
            </fieldset>

            <fieldset className="fieldset">
              <legend>Motivation</legend>
              <label>
                Why are you interested in this job? *
                <textarea name="why_interested" value={form.why_interested} onChange={handleChange} rows={4} required />
              </label>
              <label>
                Relevant Experience *
                <textarea name="experience" value={form.experience} onChange={handleChange} rows={4} required />
              </label>
            </fieldset>

            <fieldset className="fieldset">
              <legend>Attachments</legend>
              <label>
                Upload Resume (PDF/DOC) *
                <input name="resume" type="file" accept=".pdf,.doc,.docx" onChange={handleFile} required />
              </label>
              <label>
                Upload Cover Letter (optional)
                <input name="cover_letter" type="file" accept=".pdf,.doc,.docx" onChange={handleFile} />
              </label>
            </fieldset>

            <label className="checkbox">
              <input name="agree_data_sharing" type="checkbox" checked={form.agree_data_sharing} onChange={handleChange} />
              I agree to share my data for recruitment purposes. *
            </label>

            <button type="submit" disabled={submitting}>{submitting ? 'Submitting...' : 'Submit Application'}</button>
          </form>
        </aside>
      </main>
    </div>
  );
}