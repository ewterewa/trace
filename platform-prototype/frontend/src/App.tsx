import { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, AlertCircle, Bot, Clock3, FileText, FolderOpen, Network, Plus, RefreshCw, Send, ShieldCheck, Sparkles, Upload, Workflow, X, ArrowUpRight, MapPin } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || (window.location.hostname.endsWith('.app.github.dev') ? 'https://' + window.location.hostname.replace('-5173.', '-8000.') : 'http://127.0.0.1:8000');
type CaseItem = { id: string; name: string; created_at: string };
type Artifact = { id: string; filename: string; sha256: string; mime_type: string | null; metadata: Record<string, unknown>; created_at: string };
type LinkItem = { entity_type: string; matched_value: string; artifact_ids: string[]; occurrences: { artifact_id: string; filename: string; source_lines?: number[] }[]; match_rule: string; interpretation: string };
type Analysis = { artifact_count: number; entity_count: number; links: LinkItem[]; limitations: string[] };
type Claim = { type: 'fact' | 'hypothesis' | 'question'; text: string; source_ids: string[]; confidence: 'low' | 'medium' | 'high' };
type AIResult = { summary: string; claims: Claim[]; next_checks: string[]; model: string; notice: string };
type GeoPoint = { lat: number; lon: number; ele?: string; time?: string; point_index: number; segment_index: number };
type GeoTrack = { id: string; name: string; kind: string; artifact_id: string; filename: string; sha256: string; points: GeoPoint[] };
type Tab = 'overview' | 'evidence' | 'links' | 'timeline' | 'graph' | 'audit' | 'notes' | 'geography' | 'ai';
const tabs: { id: Tab; label: string; icon: typeof Activity }[] = [
 { id: 'overview', label: 'Обзор', icon: Activity }, { id: 'evidence', label: 'Материалы', icon: FolderOpen },
 { id: 'links', label: 'Связи', icon: Network }, { id: 'timeline', label: 'Хронология', icon: Clock3 }, { id: 'geography', label: 'География', icon: MapPin }, { id: 'graph', label: 'Граф связей', icon: Network }, { id: 'notes', label: 'Заметки', icon: FileText }, { id: 'audit', label: 'Журнал', icon: ShieldCheck },
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
  if (!selected || !['timeline','geography','graph','audit','notes'].includes(tab)) return;
  const endpoint = tab === 'timeline' ? 'timeline' : tab === 'geography' ? 'geo' : tab === 'graph' ? 'graph' : tab === 'audit' ? 'audit' : 'notes';
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
    <span className="version">TRACE PLATFORM · PILOT FOUNDATION</span>
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
      <section className="panel"><div className="panel-heading"><div><span className="panel-kicker">01 / INGESTION</span><h2>Добавить материалы</h2><p>Оригиналы сохраняются отдельно. Для каждого файла рассчитывается SHA-256.</p></div><button className="secondary-button" onClick={() => fileRef.current?.click()} disabled={busy}><Upload size={16}/> Загрузить файлы</button></div><div className="drop-zone" onClick={() => fileRef.current?.click()} role="button" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter') fileRef.current?.click(); }}><div className="drop-icon"><Upload size={21}/></div><b>{busy ? 'Обработка материалов…' : 'Выберите материалы для исследования'}</b><span>Документы, изображения, аудио и видео · до 20 МБ на файл</span></div><input ref={fileRef} hidden type="file" multiple accept=".txt,.md,.log,.json,.csv,.eml,.jpg,.jpeg,.png,.webp,.mp3,.wav,.m4a,.mp4,.mov,.gpx" onChange={e => void uploadFiles(e.target.files)}/></section>
      <section className="panel"><div className="panel-heading compact"><div><span className="panel-kicker">02 / EVIDENCE REGISTER</span><h2>Последние материалы</h2></div><button className="quiet-button" onClick={() => setTab('evidence')}>Все материалы <ArrowUpRight size={14}/></button></div><ArtifactTable artifacts={artifacts.slice(0, 5)} caseId={selected}/></section>
      <section className="panel"><div className="panel-heading compact"><div><span className="panel-kicker">03 / CORRELATION ENGINE</span><h2>Совпадения между источниками</h2></div><button className="quiet-button" onClick={() => setTab('links')}>Открыть связи <ArrowUpRight size={14}/></button></div><LinkList links={analysis?.links.slice(0, 4) || []} names={names}/><p className="panel-footnote">Совпадение значения — основание для проверки, а не доказательство общей личности или принадлежности.</p></section>
     </>}
     {tab === 'evidence' && <section className="panel"><div className="panel-heading"><div><span className="panel-kicker">EVIDENCE REGISTER</span><h2>Реестр материалов</h2><p>Контрольные суммы и метаданные загруженных оригиналов.</p></div><button className="secondary-button" onClick={() => fileRef.current?.click()}><Upload size={16}/> Добавить</button></div><input ref={fileRef} hidden type="file" multiple accept=".txt,.md,.log,.json,.csv,.eml,.gpx" onChange={e => void uploadFiles(e.target.files)}/><ArtifactTable artifacts={artifacts} caseId={selected}/></section>}
     {tab === 'links' && <section className="panel"><div className="panel-heading"><div><span className="panel-kicker">LINK ANALYSIS</span><h2>Обнаруженные совпадения</h2><p>Автоматически найдены только точные совпадения нормализованных значений.</p></div><span className="count-pill">{analysis?.links.length || 0} связей</span></div><LinkList links={analysis?.links || []} names={names}/>{analysis?.limitations.map(item => <p className="limit-note" key={item}>• {item}</p>)}</section>}
     
{tab === 'timeline' && <section className="panel"><div className="panel-heading"><div><span className="panel-kicker">SOURCE-DERIVED CHRONOLOGY</span><h2>Упоминания дат в источниках</h2><p>Извлечённые даты не являются подтверждёнными событиями. Каждая запись содержит ссылку на файл и строку.</p></div></div>{(moduleData?.items || []).length ? moduleData.items.map((item:any,i:number)=><div className="link-row" key={item.artifact_id+i}><div className="link-type">{item.date_text}</div><div className="link-value"><b>{item.filename}</b><span>Строка {item.source_line} · {item.classification}</span></div><span className="match-tag">SOURCE</span></div>) : <div className="table-empty">Упоминания дат не найдены.</div>}<p className="panel-footnote">{moduleData?.notice || ''}</p></section>}
{tab === 'geography' && <section className="panel"><div className="panel-heading"><div><span className="panel-kicker">SOURCE-DERIVED GEOINT</span><h2>Геопространственные данные</h2><p>Маршруты строятся по координатам, извлечённым из оригинальных GPX-файлов.</p></div><span className="count-pill">{moduleData?.point_count || 0} точек</span></div><GeoMap tracks={moduleData?.tracks || []} notice={moduleData?.notice || 'Загрузка геоданных…'} caseId={selected}/></section>}
{tab === 'graph' && <section className="panel"><div className="panel-heading"><div><span className="panel-kicker">EVIDENCE RELATION GRAPH</span><h2>Граф упоминаний</h2><p>Сущности связываются с файлами, в которых они обнаружены.</p></div></div><p className="panel-footnote">{moduleData?.notice || 'Загрузка…'}</p>{(moduleData?.nodes || []).map((node:any)=><div className="link-row" key={node.id}><div className="link-type">{node.type}</div><div className="link-value"><b>{node.label}</b><span>{(moduleData.edges || []).filter((e:any)=>e.source===node.id||e.target===node.id).length} связей с материалами</span></div><span className="match-tag">{node.type==='artifact'?'SOURCE':'EXTRACTED'}</span></div>)}</section>}
{tab === 'audit' && <section className="panel"><div className="panel-heading"><div><span className="panel-kicker">ACTIVITY LOG</span><h2>Журнал действий</h2><p>Зарегистрированные операции в текущем локальном backend.</p></div></div>{(moduleData || []).length ? moduleData.map((item:any)=><div className="link-row" key={item.id}><div className="link-type">{item.actor}</div><div className="link-value"><b>{item.action}</b><span>{new Date(item.created_at).toLocaleString('ru-RU')}</span></div><span className="match-tag">LOGGED</span></div>) : <div className="table-empty">Записей пока нет.</div>}</section>}
{tab === 'notes' && <section className="panel"><div className="panel-heading"><div><span className="panel-kicker">CASE WORKING NOTES</span><h2>Рабочие заметки</h2><p>Заметки хранятся отдельно от оригинальных материалов.</p></div></div><textarea className="note-editor" value={noteText} onChange={e=>setNoteText(e.target.value)} placeholder="Добавить заметку исследователя…"/><button className="primary-button" onClick={saveNote} disabled={!noteText.trim()}>Сохранить заметку</button>{(moduleData || []).map((item:any)=><div className="link-row" key={item.id}><div className="link-type">{item.author}</div><div className="link-value"><b>{item.body}</b><span>{new Date(item.created_at).toLocaleString('ru-RU')}</span></div><span className="match-tag">NOTE</span></div>)}</section>}
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
    <footer className="app-footer"><span>TRACE PLATFORM · RESEARCH PROTOTYPE</span><span>ПРОВЕРЯЙТЕ ПЕРВОИСТОЧНИКИ И ПРОИСХОЖДЕНИЕ ДАННЫХ</span></footer>
   </div>
  </main>
 </div>;
}

function GeoMap({ tracks, notice, caseId }: { tracks: GeoTrack[]; notice: string; caseId: string }) {
 const [activeId, setActiveId] = useState('');
 const [zoomOffset, setZoomOffset] = useState(0);
 const active = tracks.find(track => track.id === activeId) || tracks[0];
 const points = active?.points || [];
 const width = 900, height = 460, tileSize = 256;
 const bounds = useMemo(() => {
  if (!points.length) return null;
  return {
   minLat: Math.min(...points.map(p => p.lat)), maxLat: Math.max(...points.map(p => p.lat)),
   minLon: Math.min(...points.map(p => p.lon)), maxLon: Math.max(...points.map(p => p.lon))
  };
 }, [active?.id, points.length]);
 const baseZoom = bounds ? Math.max(2, Math.min(16, Math.floor(Math.log2(Math.min(
  width / (tileSize * Math.max((bounds.maxLon - bounds.minLon) / 360, 0.00001)),
  height / (tileSize * Math.max((bounds.maxLat - bounds.minLat) / 170, 0.00001))
 )) - 1))) : 4;
 const zoom = Math.max(2, Math.min(18, baseZoom + zoomOffset));
 const centerLat = bounds ? (bounds.minLat + bounds.maxLat) / 2 : 0;
 const centerLon = bounds ? (bounds.minLon + bounds.maxLon) / 2 : 0;
 const worldSize = tileSize * Math.pow(2, zoom);
 const project = (lat: number, lon: number) => {
  const safeLat = Math.max(-85.0511, Math.min(85.0511, lat));
  const x = (lon + 180) / 360 * worldSize;
  const sin = Math.sin(safeLat * Math.PI / 180);
  const y = (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * worldSize;
  const centerSin = Math.sin(Math.max(-85.0511, Math.min(85.0511, centerLat)) * Math.PI / 180);
  const centerX = (centerLon + 180) / 360 * worldSize;
  const centerY = (0.5 - Math.log((1 + centerSin) / (1 - centerSin)) / (4 * Math.PI)) * worldSize;
  return { x: x - centerX + width / 2, y: y - centerY + height / 2 };
 };
 const center = project(centerLat, centerLon);
 const firstTileX = Math.floor((worldSize / 2 + center.x - width / 2) / tileSize);
 const firstTileY = Math.floor((worldSize / 2 + center.y - height / 2) / tileSize);
 const tiles: { key: string; url: string; x: number; y: number }[] = [];
 for (let ty = firstTileY - 1; ty <= firstTileY + 2; ty++) {
  for (let tx = firstTileX - 2; tx <= firstTileX + 2; tx++) {
   const count = Math.pow(2, zoom);
   if (ty < 0 || ty >= count) continue;
   const wrappedX = ((tx % count) + count) % count;
   const sin = Math.sin(Math.max(-85.0511, Math.min(85.0511, centerLat)) * Math.PI / 180);
   const centerX = (centerLon + 180) / 360 * worldSize;
   const centerY = (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * worldSize;
   tiles.push({ key: zoom + '-' + tx + '-' + ty, url: 'https://tile.openstreetmap.org/' + zoom + '/' + wrappedX + '/' + ty + '.png', x: tx * tileSize - (centerX - width / 2), y: ty * tileSize - (centerY - height / 2) });
  }
 }
 const groups = new Map<number, GeoPoint[]>();
 points.forEach(point => groups.set(point.segment_index, [...(groups.get(point.segment_index) || []), point]));
 const formatTime = (value?: string) => value ? new Date(value).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'medium', timeZone: 'UTC' }) + ' UTC' : 'Время в источнике не указано';
 useEffect(() => { setActiveId(tracks[0]?.id || ''); setZoomOffset(0); }, [tracks.map(t => t.id).join('|')]);
 if (!tracks.length) return <div className="geo-empty"><MapPin size={25}/><b>Геоданные пока не обнаружены</b><span>Загрузите GPX-файл с GPS-треком или маршрутными точками. Координаты из других форматов пока не извлекаются.</span><p>{notice}</p></div>;
 return <div className="geo-workspace">
  {tracks.length > 1 && <label className="geo-select-label">НАБОР ДАННЫХ <select value={active?.id || ''} onChange={e => { setActiveId(e.target.value); setZoomOffset(0); }}>{tracks.map(track => <option key={track.id} value={track.id}>{track.name} · {track.filename}</option>)}</select></label>}
  <div className="geo-map-shell"><svg className="geo-map" viewBox={'0 0 '+width+' '+height} role="img" aria-label="Карта GPS-маршрута">
   <rect width={width} height={height} fill="#e7e4dc"/>
   {tiles.map(tile => <image key={tile.key} href={tile.url} x={tile.x} y={tile.y} width={tileSize} height={tileSize} />)}
   {Array.from(groups.entries()).map(([segment, segmentPoints]) => <polyline key={segment} points={segmentPoints.map(point => { const p=project(point.lat,point.lon); return p.x+','+p.y; }).join(' ')} fill="none" stroke="#bd607f" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" opacity=".92" />)}
   {points.length > 0 && <><circle cx={project(points[0].lat,points[0].lon).x} cy={project(points[0].lat,points[0].lon).y} r="7" fill="#77b88e" stroke="#fff" strokeWidth="2"/><circle cx={project(points[points.length-1].lat,points[points.length-1].lon).x} cy={project(points[points.length-1].lat,points[points.length-1].lon).y} r="7" fill="#c56d83" stroke="#fff" strokeWidth="2"/></>}
  </svg><div className="geo-zoom"><button onClick={() => setZoomOffset(v => Math.min(v+1, 8))} aria-label="Увеличить">+</button><button onClick={() => setZoomOffset(v => Math.max(v-1, -8))} aria-label="Уменьшить">−</button></div><div className="geo-legend"><span><i className="geo-start"/> Начало</span><span><i className="geo-end"/> Конец</span><span>Уровень масштаба {zoom}</span></div></div>
  <div className="geo-source"><div><span className="panel-kicker">ORIGINAL SOURCE</span><b>{active.filename}</b><small>{active.kind.toUpperCase()} · {points.length} координат · SHA-256 {active.sha256.slice(0,18)}…</small></div><a href={API+'/cases/'+caseId+'/artifacts/'+active.artifact_id+'/download'} target="_blank" rel="noreferrer">Открыть оригинал <ArrowUpRight size={13}/></a></div>
  <div className="geo-points"><div className="geo-points-head"><b>Реестр координат</b><span>Время показано в UTC, если оно присутствует в GPX</span></div><div className="table-wrap"><table><thead><tr><th>№</th><th>ШИРОТА</th><th>ДОЛГОТА</th><th>ВРЕМЯ ИЗ ИСТОЧНИКА</th><th>ВЫСОТА</th></tr></thead><tbody>{points.slice(0,500).map(point=><tr key={point.point_index+'-'+point.segment_index}><td>{point.point_index+1}</td><td className="hash-cell">{point.lat.toFixed(6)}</td><td className="hash-cell">{point.lon.toFixed(6)}</td><td>{formatTime(point.time)}</td><td>{point.ele ? point.ele+' m' : '—'}</td></tr>)}</tbody></table></div>{points.length>500 && <p className="panel-footnote">Показаны первые 500 точек. Полный исходный GPX доступен по ссылке выше.</p>}</div>
  <p className="geo-notice"><ShieldCheck size={14}/>{notice}</p><p className="geo-attribution">Картографическая подложка: © OpenStreetMap contributors · координаты маршрута взяты из загруженного оригинала</p>
 </div>;
}

function ArtifactTable({ artifacts, caseId }: { artifacts: Artifact[]; caseId: string }) {
 if (!artifacts.length) return <div className="table-empty">Материалы ещё не загружены.</div>;
 return <div className="table-wrap"><table><thead><tr><th>ФАЙЛ</th><th>ФОРМАТ</th><th>SHA-256</th><th>ДОБАВЛЕН</th><th>ОРИГИНАЛ</th></tr></thead><tbody>{artifacts.map(a => <tr key={a.id}><td><span className="file-name"><FileText size={15}/>{a.filename}</span></td><td><span className="format-tag">{String(a.metadata.format || 'FILE').toUpperCase()}</span></td><td className="hash-cell" title={a.sha256}>{a.sha256.slice(0, 18)}…</td><td>{new Date(a.created_at).toLocaleString('ru-RU')}</td><td><a href={API+'/cases/'+caseId+'/artifacts/'+a.id+'/download'} target="_blank" rel="noreferrer">Скачать</a></td></tr>)}</tbody></table></div>;
}
function LinkList({ links, names }: { links: LinkItem[]; names: Map<string, string> }) {
 if (!links.length) return <div className="table-empty">Совпадений между разными источниками пока нет. Загрузите несколько материалов с общими значениями.</div>;
 return <div className="link-list">{links.map((link, i) => <div className="link-row" key={link.entity_type + link.matched_value + i}><div className="link-type">{link.entity_type}</div><div className="link-value"><b>{link.matched_value}</b><span>{link.occurrences.map(item => (names.get(item.artifact_id) || item.filename) + (item.source_lines?.length ? ' · стр. ' + item.source_lines.join(', ') : '')).join(' · ')}</span></div><span className="match-tag">ТОЧНОЕ СОВПАДЕНИЕ</span></div>)}</div>;
}
