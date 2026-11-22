import { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, AlertCircle, Bot, Clock3, FileText, FolderOpen, Network, Plus, RefreshCw, Send, ShieldCheck, Sparkles, Upload, Workflow, X, ArrowUpRight } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || (window.location.hostname.endsWith('.app.github.dev') ? 'https://' + window.location.hostname.replace('-5173.', '-8000.') : 'http://127.0.0.1:8000');
type CaseItem = { id: string; name: string; created_at: string };
type Artifact = { id: string; filename: string; sha256: string; mime_type: string | null; metadata: Record<string, unknown>; created_at: string };
type LinkItem = { entity_type: string; matched_value: string; artifact_ids: string[]; occurrences: { artifact_id: string; filename: string; source_lines?: number[] }[]; match_rule: string; interpretation: string };
type Analysis = { artifact_count: number; entity_count: number; links: LinkItem[]; limitations: string[] };
type Claim = { type: 'fact' | 'hypothesis' | 'question'; text: string; source_ids: string[]; confidence: 'low' | 'medium' | 'high' };
type AIResult = { summary: string; claims: Claim[]; next_checks: string[]; model: string; notice: string };
type Tab = 'overview' | 'evidence' | 'links' | 'timeline' | 'graph' | 'audit' | 'notes' | 'ai';
const tabs: { id: Tab; label: string; icon: typeof Activity }[] = [
 { id: 'overview', label: 'Обзор', icon: Activity }, { id: 'evidence', label: 'Материалы', icon: FolderOpen },
 { id: 'links', label: 'Связи', icon: Network }, { id: 'timeline', label: 'Хронология', icon: Clock3 }, { id: 'graph', label: 'Граф связей', icon: Network }, { id: 'notes', label: 'Заметки', icon: FileText }, { id: 'audit', label: 'Журнал', icon: ShieldCheck },
 { id: 'ai', label: 'TRACE AI', icon: Sparkles }
];

export default function App() {
 const [cases, setCases] = useState<CaseItem[]>([]);
 const [selected, setSelected] = useState('');
 const [artifacts, setArtifacts] = useState<Artifact[]>([]);
 const [analysis, setAnalysis] = useState<Analysis | null>(null);
 const [moduleData, setModuleData] = useState<any>(null);
 const [noteText, setNoteText] = useState('');
 const [tab, setTab] = useState<Tab>('overview');
 const [apiState, setApiState] = useState('checking');
 const [busy, setBusy] = useState(false);
 const [error, setError] = useState('');
 const [question, setQuestion] = useState('Какие точные значения повторяются в разных материалах?');
 const [aiResult, setAiResult] = useState<AIResult | null>(null);
 const [aiBusy, setAiBusy] = useState(false);
 const fileRef = useRef<HTMLInputElement>(null);
 const activeCase = cases.find(x => x.id === selected);
 const names = useMemo(() => new Map(artifacts.map(a => [a.id, a.filename])), [artifacts]);

 async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(API + path, init);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.detail || 'Ошибка запроса к TRACE API');
  return data as T;
 }
 async function refreshCases() {
  try {
   const items = await request<CaseItem[]>('/cases');
   const health = await fetch(API + '/health');
   setApiState(health.ok ? 'online' : 'offline');
   setCases(items);
   if (!selected && items.length) setSelected(items[0].id);
   setError('');
  } catch {
   setApiState('offline');
   setError('TRACE API не отвечает. Запустите backend на 127.0.0.1:8000.');
  }
 }
 async function loadWorkspace(id: string) {
  if (!id) return;
  try {
   const result = await Promise.all([request<Artifact[]>('/cases/' + id + '/artifacts'), request<Analysis>('/cases/' + id + '/analysis')]);
   setArtifacts(result[0]); setAnalysis(result[1]); setError('');
  } catch (e) { setError(e instanceof Error ? e.message : 'Не удалось загрузить исследование'); }
 }
 useEffect(() => { void refreshCases(); }, []);
 useEffect(() => { if (selected) void loadWorkspace(selected); }, [selected]);
 useEffect(() => {
  if (!selected || !['timeline','graph','audit','notes'].includes(tab)) return;
  const endpoint = tab === 'timeline' ? 'timeline' : tab === 'graph' ? 'graph' : tab === 'audit' ? 'audit' : 'notes';
  void request<any>('/cases/' + selected + '/' + endpoint).then(setModuleData).catch(e => setError(e instanceof Error ? e.message : 'Ошибка загрузки раздела'));
 }, [selected, tab]);

 async function createCase() {
  setBusy(true);
  try {
   const item = await request<CaseItem>('/cases', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Исследование ' + new Date().toLocaleDateString('ru-RU') }) });
   setCases(prev => [item, ...prev]); setSelected(item.id); setArtifacts([]); setAnalysis(null); setAiResult(null); setError('');
  } catch (e) { setError(e instanceof Error ? e.message : 'Не удалось создать исследование'); }
  finally { setBusy(false); }
 }
 async function uploadFiles(files: FileList | null) {
  if (!files || !selected) return;
  setBusy(true); setError('');
  try {
   for (const file of Array.from(files)) {
    const form = new FormData(); form.append('file', file);
    await request('/cases/' + selected + '/artifacts', { method: 'POST', body: form });
   }
   await loadWorkspace(selected); setTab('evidence');
  } catch (e) { setError(e instanceof Error ? e.message : 'Не удалось загрузить файл'); }
  finally { setBusy(false); if (fileRef.current) fileRef.current.value = ''; }
 }
 async function saveNote() {
  if (!selected || !noteText.trim()) return;
  try {
   await request('/cases/' + selected + '/notes', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({body:noteText}) });
   setNoteText('');
   setModuleData(await request<any>('/cases/' + selected + '/notes'));
  } catch(e) { setError(e instanceof Error ? e.message : 'Не удалось сохранить заметку'); }
 }
 async function askAI() {
  if (!selected || question.trim().length < 3) return;
  setAiBusy(true); setError(''); setAiResult(null);
  try {
   const result = await request<AIResult>('/cases/' + selected + '/ask', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question }) });
   setAiResult(result);
  } catch (e) { setError(e instanceof Error ? e.message : 'TRACE AI недоступен'); }
  finally { setAiBusy(false); }
 }

 const stats = [
  { label: 'Материалы', value: artifacts.length, icon: FileText },
  { label: 'Извлечённые сущности', value: analysis?.entity_count || 0, icon: Workflow },
  { label: 'Совпадения между источниками', value: analysis?.links.length || 0, icon: Network }
 ];

 return <div className="app-shell">
  <aside className="sidebar">
   <a className="brand" href="#"><span className="brand-mark">T</span><span>TRACE<small>INTELLIGENCE PLATFORM</small></span></a>
   <div className="workspace-label">РАБОЧАЯ СРЕДА</div>
   <nav className="side-nav">{tabs.map(item => { const Icon = item.icon; return <button key={item.id} className={tab === item.id ? 'nav-item active' : 'nav-item'} onClick={() => setTab(item.id)}><Icon size={17}/><span>{item.label}</span>{item.id === 'ai' && <i className="nav-new">AI</i>}</button>; })}</nav>
   <div className="sidebar-bottom">
    <div className="integrity-card"><ShieldCheck size={17}/><div><b>Evidence-first</b><span>Каждый вывод должен иметь источник</span></div></div>
    <div className="api-indicator"><i className={apiState}/><span>API {apiState === 'online' ? 'подключён' : apiState === 'checking' ? 'проверка' : 'не подключён'}</span></div>
    <span className="version">TRACE PLATFORM · MVP 0.1</span>
   </div>
  </aside>
  <main className="main-area">
   <header className="topbar">
    <div className="breadcrumbs"><span>TRACE</span><b>/</b><span>Рабочее пространство</span><b>/</b><strong>{tabs.find(t => t.id === tab)?.label}</strong></div>
    <div className="top-actions"><span className="case-label">ИССЛЕДОВАНИЕ</span><select value={selected} onChange={e => setSelected(e.target.value)}><option value="">Не выбрано</option>{cases.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select><button className="icon-button" onClick={() => void refreshCases()} title="Обновить"><RefreshCw size={16}/></button></div>
   </header>
   <div className="page-content">
    <div className="page-heading"><div><div className="eyebrow"><span/> DIGITAL EVIDENCE ANALYSIS</div><h1>{tab === 'ai' ? <>TRACE <em>AI</em></> : tabs.find(t => t.id === tab)?.label}</h1><p>{tab === 'ai' ? 'Интеллектуальный анализ поверх структурированных и проверяемых данных.' : 'Единое пространство для изучения материалов, объектов и событий.'}</p></div><button className="primary-button" onClick={createCase} disabled={busy}><Plus size={16}/> Новое исследование</button></div>
    {error && <div className="alert"><AlertCircle size={17}/><span>{error}</span><button onClick={() => setError('')}><X size={15}/></button></div>}
    {!selected ? <section className="empty-state"><div className="empty-icon"><FolderOpen size={28}/></div><h2>Рабочее пространство пока пусто</h2><p>Создайте исследование, чтобы загрузить материалы и начать анализ.</p><button className="primary-button" onClick={createCase} disabled={busy}><Plus size={16}/> Создать исследование</button>{apiState === 'offline' && <small>Сначала запустите backend API — инструкция находится в README проекта.</small>}</section> : <>
     <div className="case-strip"><div><span className="case-dot"/><b>{activeCase?.name || 'Загрузка исследования'}</b><small>ID: {selected.slice(0, 8)}</small></div><span>ЛОКАЛЬНОЕ ИССЛЕДОВАНИЕ</span></div>
     {tab === 'overview' && <>
      <div className="stats-grid">{stats.map(s => { const Icon = s.icon; return <div className="stat-card" key={s.label}><div className="stat-icon"><Icon size={17}/></div><span>{s.label}</span><strong>{s.value}</strong></div>; })}</div>
      <section className="panel"><div className="panel-heading"><div><span className="panel-kicker">01 / INGESTION</span><h2>Добавить материалы</h2><p>Оригиналы сохраняются отдельно. Для каждого файла рассчитывается SHA-256.</p></div><button className="secondary-button" onClick={() => fileRef.current?.click()} disabled={busy}><Upload size={16}/> Загрузить файлы</button></div><div className="drop-zone" onClick={() => fileRef.current?.click()} role="button" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter') fileRef.current?.click(); }}><div className="drop-icon"><Upload size={21}/></div><b>{busy ? 'Обработка материалов…' : 'Выберите материалы для исследования'}</b><span>TXT, MD, LOG, JSON, CSV, EML · до 20 МБ на файл</span></div><input ref={fileRef} hidden type="file" multiple accept=".txt,.md,.log,.json,.csv,.eml" onChange={e => void uploadFiles(e.target.files)}/></section>
      <section className="panel"><div className="panel-heading compact"><div><span className="panel-kicker">02 / EVIDENCE REGISTER</span><h2>Последние материалы</h2></div><button className="quiet-button" onClick={() => setTab('evidence')}>Все материалы <ArrowUpRight size={14}/></button></div><ArtifactTable artifacts={artifacts.slice(0, 5)}/></section>
      <section className="panel"><div className="panel-heading compact"><div><span className="panel-kicker">03 / CORRELATION ENGINE</span><h2>Совпадения между источниками</h2></div><button className="quiet-button" onClick={() => setTab('links')}>Открыть связи <ArrowUpRight size={14}/></button></div><LinkList links={analysis?.links.slice(0, 4) || []} names={names}/><p className="panel-footnote">Совпадение значения — основание для проверки, а не доказательство общей личности или принадлежности.</p></section>
     </>}
     {tab === 'evidence' && <section className="panel"><div className="panel-heading"><div><span className="panel-kicker">EVIDENCE REGISTER</span><h2>Реестр материалов</h2><p>Контрольные суммы и метаданные загруженных оригиналов.</p></div><button className="secondary-button" onClick={() => fileRef.current?.click()}><Upload size={16}/> Добавить</button></div><input ref={fileRef} hidden type="file" multiple accept=".txt,.md,.log,.json,.csv,.eml" onChange={e => void uploadFiles(e.target.files)}/><ArtifactTable artifacts={artifacts}/></section>}
     {tab === 'links' && <section className="panel"><div className="panel-heading"><div><span className="panel-kicker">LINK ANALYSIS</span><h2>Обнаруженные совпадения</h2><p>Автоматически найдены только точные совпадения нормализованных значений.</p></div><span className="count-pill">{analysis?.links.length || 0} связей</span></div><LinkList links={analysis?.links || []} names={names}/>{analysis?.limitations.map(item => <p className="limit-note" key={item}>• {item}</p>)}</section>}
     {tab === 'timeline' && <section className="panel"><div className="panel-heading"><div><span className="panel-kicker">CHRONOLOGY</span><h2>Временной контекст</h2><p>В первой версии даты извлекаются как строки. Нормализация часовых поясов и построение событийной шкалы — следующий этап.</p></div></div><div className="timeline-empty"><Clock3 size={25}/><b>Хронология ещё не построена</b><span>В текущем MVP временные отметки не интерпретируются как подтверждённые события.</span></div></section>}
     {tab === 'ai' && <div className="ai-layout">
      <section className="panel ai-chat"><div className="ai-intro"><div className="ai-symbol"><Bot size={22}/></div><div><span className="panel-kicker">TRACE INTELLIGENCE</span><h2>Аналитический ассистент</h2><p>Задавайте вопросы по загруженным материалам. Ответ строится только на переданном наборе доказательств.</p></div></div>
       <div className="prompt-chips"><button onClick={() => setQuestion('Какие точные значения повторяются в разных материалах?')}>Найти повторяющиеся значения</button><button onClick={() => setQuestion('Какие временные отметки присутствуют в источниках?')}>Проверить временные отметки</button><button onClick={() => setQuestion('Какие пробелы и противоречия есть в материалах?')}>Найти противоречия</button></div>
       <label className="question-label" htmlFor="ai-question">ВАШ ЗАПРОС</label><textarea id="ai-question" value={question} onChange={e => setQuestion(e.target.value)} placeholder="Сформулируйте аналитический вопрос…"/>
       <div className="composer-bottom"><span><ShieldCheck size={14}/> Только данные текущего исследования</span><button className="primary-button" onClick={askAI} disabled={aiBusy || !artifacts.length}><Send size={15}/>{aiBusy ? 'Анализ…' : 'Запустить анализ'}</button></div>
       {!artifacts.length && <p className="panel-footnote">Загрузите материалы, прежде чем обращаться к TRACE AI.</p>}
       {aiResult && <div className="ai-response"><div className="response-top"><span className="panel-kicker">AI ANALYSIS</span><span className="model-tag">{aiResult.model}</span></div><p className="ai-summary">{aiResult.summary}</p>
        {aiResult.claims.map((claim, index) => <div className="claim" key={index}><div className="claim-head"><span className={'claim-type ' + claim.type}>{claim.type === 'fact' ? 'Факт' : claim.type === 'hypothesis' ? 'Гипотеза' : 'Вопрос'}</span><span className="confidence">Уверенность: {claim.confidence}</span></div><p>{claim.text}</p><div className="source-chips">{claim.source_ids.map(id => <span key={id}><FileText size={12}/>{names.get(id) || id.slice(0, 8)}</span>)}{!claim.source_ids.length && <span className="no-source">Нет подтверждённого источника</span>}</div></div>)}
        {aiResult.next_checks.length > 0 && <div className="next-checks"><b>Что проверить дальше</b><ul>{aiResult.next_checks.map((x, i) => <li key={i}>{x}</li>)}</ul></div>}<p className="ai-notice">{aiResult.notice}</p>
       </div>}
      </section>
      <aside className="panel ai-side"><span className="panel-kicker">EVIDENCE CONTEXT</span><h3>Контекст запроса</h3><div className="context-stat"><b>{artifacts.length}</b><span>материалов в исследовании</span></div><div className="context-stat"><b>{analysis?.links.length || 0}</b><span>точных совпадений</span></div><div className="context-rule"><ShieldCheck size={16}/><p>ИИ получает только извлечённые данные текущего исследования.</p></div><div className="context-rule"><AlertCircle size={16}/><p>Совпадение идентификатора не доказывает общую личность.</p></div></aside>
     </div>}
    </>}
    <footer className="app-footer"><span>TRACE PLATFORM · RESEARCH PROTOTYPE</span><span>ДАННЫЕ ТЕКУЩЕГО ЛОКАЛЬНОГО ИССЛЕДОВАНИЯ</span></footer>
   </div>
  </main>
 </div>;
}

function ArtifactTable({ artifacts }: { artifacts: Artifact[] }) {
 if (!artifacts.length) return <div className="table-empty">Материалы ещё не загружены.</div>;
 return <div className="table-wrap"><table><thead><tr><th>ФАЙЛ</th><th>ФОРМАТ</th><th>SHA-256</th><th>ДОБАВЛЕН</th></tr></thead><tbody>{artifacts.map(a => <tr key={a.id}><td><span className="file-name"><FileText size={15}/>{a.filename}</span></td><td><span className="format-tag">{String(a.metadata.format || 'FILE').toUpperCase()}</span></td><td className="hash-cell" title={a.sha256}>{a.sha256.slice(0, 18)}…</td><td>{new Date(a.created_at).toLocaleString('ru-RU')}</td></tr>)}</tbody></table></div>;
}
function LinkList({ links, names }: { links: LinkItem[]; names: Map<string, string> }) {
 if (!links.length) return <div className="table-empty">Совпадений между разными источниками пока нет. Загрузите несколько материалов с общими значениями.</div>;
 return <div className="link-list">{links.map((link, i) => <div className="link-row" key={link.entity_type + link.matched_value + i}><div className="link-type">{link.entity_type}</div><div className="link-value"><b>{link.matched_value}</b><span>{link.occurrences.map(item => (names.get(item.artifact_id) || item.filename) + (item.source_lines?.length ? ' · стр. ' + item.source_lines.join(', ') : '')).join(' · ')}</span></div><span className="match-tag">ТОЧНОЕ СОВПАДЕНИЕ</span></div>)}</div>;
}
