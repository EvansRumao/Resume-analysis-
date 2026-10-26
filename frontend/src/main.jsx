import React, { useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Upload, FileText, Sparkles, Search, Download, CheckCircle2, AlertCircle, LoaderCircle, BriefcaseBusiness, BrainCircuit, Trash2 } from 'lucide-react'
import './styles.css'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000'

function App() {
  const [jobDescription, setJobDescription] = useState('')
  const [files, setFiles] = useState([])
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const average = useMemo(() => results.length
    ? Math.round(results.reduce((sum, r) => sum + (r.match_score_heuristic || 0), 0) / results.length)
    : 0, [results])
  const topScore = results.length ? Math.max(...results.map(r => r.match_score_heuristic || 0)) : 0

  function addFiles(incoming) {
    const accepted = Array.from(incoming).filter(f => /\.(pdf|docx|txt)$/i.test(f.name))
    setFiles(prev => [...prev, ...accepted.filter(f => !prev.some(p => p.name === f.name && p.size === f.size))])
    setError('')
    setNotice('')
  }

  async function analyze() {
    setError('')
    setNotice('')
    setResults([])
    if (!jobDescription.trim()) return setError('Add a job description before analyzing resumes.')
    if (!files.length) return setError('Upload at least one PDF, DOCX, or TXT resume.')
    setLoading(true)
    try {
      const body = new FormData()
      body.append('job_description', jobDescription)
      files.forEach(file => body.append('files', file))
      const response = await fetch(`${API_BASE}/api/rank`, { method: 'POST', body })
      const data = await response.json()
      if (!response.ok) throw new Error(data.detail || 'Analysis failed. Check that the backend and model are running.')
      setResults(data.results || [])
      setNotice(`Analyzed ${data.count} resume(s). Scores are heuristic and require human review.`)
    } catch (e) {
      setError(`${e.message} Backend URL: ${API_BASE}`)
    } finally {
      setLoading(false)
    }
  }

  function downloadCsv() {
    const columns = ['filename', 'match_score_heuristic', 'text_similarity_pct', 'skill_coverage_pct', 'matched_skills', 'missing_skills', 'category_prediction']
    const escape = value => `"${String(value ?? '').replaceAll('"', '""')}"`
    const rows = [columns.join(','), ...results.map(r => columns.map(c => {
      if (c === 'matched_skills' || c === 'missing_skills') return escape((r[c] || []).join('; '))
      if (c === 'category_prediction') return escape(r.category_prediction?.predicted_category || '')
      return escape(r[c] ?? r.category_prediction?.predicted_category ?? '')
    }).join(','))]
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'resume-analysis.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><BrainCircuit size={22}/></div><div><b>ResumeIQ</b><span>AI TALENT WORKSPACE</span></div></div>
      <div className="nav-label">WORKSPACE</div>
      <div className="nav-item active"><Search size={17}/> Resume matching</div>
      <div className="side-note"><Sparkles size={17}/><div><b>AI-assisted screening</b><p>Find relevant skills and compare resume text with a role description.</p></div></div>
      <div className="sidebar-bottom"><span className="status-dot"/> Local API integration <small>Development mode</small></div>
    </aside>

    <main className="main">
      <header className="topbar"><div><span className="eyebrow">TALENT INTELLIGENCE / WORKSPACE</span><h1>Resume analyzer</h1><p>Discover relevant candidates with transparent, skill-focused matching.</p></div><div className="top-pill"><span className="status-dot"/> NLP workspace</div></header>

      <section className="stats">
        <div className="stat-card"><div className="stat-icon violet"><FileText size={19}/></div><span>Resumes analyzed</span><strong>{results.length}</strong><small>In this session</small></div>
        <div className="stat-card"><div className="stat-icon blue"><Sparkles size={19}/></div><span>Highest match</span><strong>{results.length ? `${topScore.toFixed(1)}%` : '—'}</strong><small>Heuristic score</small></div>
        <div className="stat-card"><div className="stat-icon green"><CheckCircle2 size={19}/></div><span>Average match</span><strong>{results.length ? `${average}%` : '—'}</strong><small>Across analyzed resumes</small></div>
      </section>

      <section className="workspace-grid">
        <div className="panel job-panel">
          <div className="panel-heading"><div className="section-icon"><BriefcaseBusiness size={18}/></div><div><h2>Job requirements</h2><p>Paste the role description you want to match against.</p></div></div>
          <label htmlFor="job-description">JOB DESCRIPTION</label>
          <textarea id="job-description" value={jobDescription} onChange={e => setJobDescription(e.target.value)} placeholder="Example: Junior Python Developer with Python, SQL, REST APIs, FastAPI, Git, Docker and machine learning fundamentals..." />
          <div className="textarea-footer"><span>{jobDescription.trim().split(/\s+/).filter(Boolean).length} words</span><button className="text-button" onClick={() => setJobDescription('')} disabled={!jobDescription}>Clear text</button></div>
          <div className="tip"><Sparkles size={16}/><span><b>Tip:</b> Include required skills, responsibilities, and preferred qualifications for more useful comparisons.</span></div>
        </div>

        <div className="panel upload-panel">
          <div className="panel-heading"><div className="section-icon"><Upload size={18}/></div><div><h2>Candidate resumes</h2><p>Upload files to compare multiple candidates.</p></div></div>
          <label className="dropzone" onDragOver={e => e.preventDefault()} onDrop={e => {e.preventDefault(); addFiles(e.dataTransfer.files)}}>
            <input type="file" accept=".pdf,.docx,.txt" multiple onChange={e => {addFiles(e.target.files); e.target.value = ''}}/>
            <div className="upload-circle"><Upload size={22}/></div><b>Drop resumes here or <span>browse files</span></b><small>PDF, DOCX or TXT · up to 10 MB per file</small>
          </label>
          {files.length > 0 && <div className="file-list">{files.map((file, i) => <div className="file-row" key={`${file.name}-${file.size}-${i}`}><div className="file-type"><FileText size={17}/></div><div className="file-info"><b>{file.name}</b><small>{(file.size / 1024).toFixed(0)} KB</small></div><button className="icon-button" aria-label={`Remove ${file.name}`} onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))}><Trash2 size={16}/></button></div>)}</div>}
          <button className="primary-button" onClick={analyze} disabled={loading}>{loading ? <><LoaderCircle className="spin" size={17}/> Analyzing resumes…</> : <><Sparkles size={17}/> Analyze resumes <span>→</span></>}</button>
          <p className="privacy-note">Files are processed by your local backend. This demo does not intentionally store uploaded files.</p>
        </div>
      </section>

      {error && <div className="alert error"><AlertCircle size={18}/><span>{error}</span></div>}
      {notice && <div className="alert success"><CheckCircle2 size={18}/><span>{notice}</span></div>}

      <section className="panel results-panel">
        <div className="results-heading"><div className="panel-heading"><div className="section-icon"><BrainCircuit size={18}/></div><div><h2>Candidate comparison</h2><p>Ranked by text similarity and detected skill coverage.</p></div></div>{results.length > 0 && <button className="secondary-button" onClick={downloadCsv}><Download size={16}/> Export CSV</button>}</div>
        {results.length === 0 ? <div className="empty-state"><div className="empty-icon"><Search size={23}/></div><b>Your results will appear here</b><p>Add a job description and upload resumes to generate a comparison.</p></div> :
          <div className="table-wrap"><table><thead><tr><th>CANDIDATE FILE</th><th>MATCH SCORE</th><th>TEXT SIMILARITY</th><th>SKILL COVERAGE</th><th>PREDICTED CATEGORY</th><th>SKILLS</th></tr></thead><tbody>{results.map((r, i) => <tr key={`${r.filename}-${i}`}><td><div className="candidate-name"><div className="avatar">{(r.filename || '?').slice(0,1).toUpperCase()}</div><div><b>{r.filename}</b><small>{r.characters_extracted ? `${r.characters_extracted.toLocaleString()} characters extracted` : r.error || 'Processed'}</small></div></div></td><td>{r.error ? '—' : <div className="score-cell"><b>{Number(r.match_score_heuristic).toFixed(1)}%</b><div className="progress"><span style={{width: `${Math.max(0, Math.min(100, r.match_score_heuristic))}%`}}/></div></div>}</td><td>{r.error ? '—' : `${r.text_similarity_pct}%`}</td><td>{r.error ? '—' : `${r.skill_coverage_pct}%`}</td><td><span className="category">{r.category_prediction?.predicted_category || 'Unavailable'}</span></td><td>{r.error ? <span className="muted">{r.error}</span> : <div className="skill-cell"><span className="matched">{(r.matched_skills || []).length} matched</span><span className="missing">{(r.missing_skills || []).length} missing</span><details><summary>View skills</summary><p><b>Matched:</b> {(r.matched_skills || []).join(', ') || 'None detected'}</p><p><b>Missing:</b> {(r.missing_skills || []).join(', ') || 'None detected'}</p></details></div>}</td></tr>)}</tbody></table></div>}
        <div className="results-disclaimer"><AlertCircle size={15}/><span>Scores are heuristic, not probabilities of job performance. Skill extraction may miss synonyms or context. Always review resumes manually and assess candidates using job-related criteria.</span></div>
      </section>
      <footer>ResumeIQ · NLP Resume Analyzer <span>Built with React + FastAPI + scikit-learn</span></footer>
    </main>
  </div>
}

createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>)
