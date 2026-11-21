import { useState } from 'react';
import { ArrowDown, ArrowRight, ArrowUpRight, Menu, X } from 'lucide-react';
import Globe from './Globe';

const nav = [{ label: 'Идея', id: 'idea' }, { label: 'Как работает', id: 'method' }, { label: 'Архитектура', id: 'architecture' }, { label: 'О проекте', id: 'about' }];

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeNode, setActiveNode] = useState('ИСТОЧНИКИ');
  const closeMenu = () => setMenuOpen(false);
  return <main className="site-shell">
    <header className="site-header">
      <a className="wordmark" href="#top" aria-label="TRACE, на главную"><span className="wordmark-mark">T</span><span>TRACE</span><sup>INTELLIGENCE</sup></a>
      <nav className={menuOpen ? 'main-nav is-open' : 'main-nav'}>{nav.map(item => <a key={item.id} href={'#' + item.id} onClick={closeMenu}>{item.label}</a>)}</nav>
      <a className="header-link" href="#platform">К проекту <ArrowUpRight size={15}/></a>
      <button className="menu-toggle" aria-label="Открыть меню" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X/> : <Menu/>}</button>
    </header>

    <section className="hero" id="top">
      <div className="hero-grid"></div>
      <div className="hero-copy">
        <div className="eyebrow"><span className="eyebrow-dot"></span> ЦИФРОВАЯ АНАЛИТИКА И РАССЛЕДОВАНИЯ</div>
        <h1>Увидеть связи.<br/><em>Понять целое.</em></h1>
        <p className="hero-lead">TRACE — концепция интеллектуальной среды для анализа цифровых следов, связей и событий. От разрозненных данных — к целостной картине.</p>
        <div className="hero-actions"><a className="button button-light" href="#idea">Посмотреть идею <ArrowDown size={16}/></a><a className="text-link" href="#method">Как работает TRACE <ArrowUpRight size={15}/></a></div>
        <div className="hero-index"><span>01 / 04</span><i></i><span>ЕДИНАЯ СРЕДА ДЛЯ АНАЛИЗА</span></div>
        <div className="hero-card"><span className="hero-card-mark">T</span><div><b>TRACE</b><small>Цифровые следы. Связи. События.</small></div><span className="hero-card-arrow">↗</span></div>
      </div>
      <div className="hero-visual"><div className="orbit orbit-a"></div><div className="orbit orbit-b"></div><div className="globe-stage"><Globe/></div>
        <div className="visual-tag tag-top"><span>01</span> ГЛОБАЛЬНЫЙ КОНТЕКСТ</div>
        <div className="visual-tag tag-right"><span>02</span> КАРТА СВЯЗЕЙ</div>
        <div className="visual-tag tag-bottom"><span>03</span> ХРОНОЛОГИЯ СОБЫТИЙ</div>
        <div className="coordinate coord-a">51°30'26.4"N<br/>00°07'39.0"W</div><div className="coordinate coord-b">LAT / LON<br/>DATA LAYER 01</div>
      </div>
      <div className="hero-bottom"><span>ИНФОРМАЦИЯ ПОВСЮДУ.</span><span>СВЯЗИ СОЗДАЮТ КАРТИНУ.</span><span>ЛИСТАЙТЕ ДАЛЬШЕ <ArrowDown size={13}/></span></div>
    </section>

    <section className="intro-section section-pad" id="idea">
      <div className="section-kicker"><span>01</span> / ИДЕЯ</div>
      <div className="intro-layout"><h2>Данные редко<br/>рассказывают <em>историю</em><br/>по отдельности.</h2><div className="intro-text"><p>Цифровая информация существует в разных форматах и источниках: письма, документы, сетевые события, изображения, метаданные. По отдельности они дают лишь фрагменты.</p><p>TRACE задуман как единая среда, которая помогает связывать эти фрагменты, видеть взаимосвязи и прослеживать последовательность событий, сохраняя путь от вывода к исходному источнику.</p><a className="underlined-link" href="#method">Принцип работы <ArrowRight size={15}/></a></div></div>
      <div className="statement-line"><span>ОТ ФРАГМЕНТОВ</span><b>→</b><span>К КОНТЕКСТУ</span><b>→</b><span>К ПОНИМАНИЮ</span></div>
    </section>

    <section className="method-section section-pad" id="method">
      <div className="section-kicker"><span>02</span> / КАК РАБОТАЕТ</div>
      <div className="section-heading"><h2>Одна среда.<br/><em>Несколько перспектив.</em></h2><p>TRACE объединяет разные способы изучения информации в связанную рабочую модель.</p></div>
      <div className="method-visual">
        <div className="method-orbit"></div><div className="method-center"><span>TRACE</span><small>ЕДИНАЯ<br/>СРЕДА</small></div>
        {['ИСТОЧНИКИ','ПЕРЕПИСКА','АНАЛИЗ СВЯЗЕЙ','ХРОНОЛОГИЯ','ГЛОБУС'].map((node,i)=><button key={node} className={'method-node node-'+i+(activeNode===node?' active':'')} onClick={()=>setActiveNode(node)}><i></i><span>{node}</span><b>0{i+1}</b></button>)}
        <div className="method-detail"><span>ВЫБРАННЫЙ РАЗДЕЛ</span><b>{activeNode}</b><p>{activeNode==='ИСТОЧНИКИ'?'Изучение исходных файлов, их свойств и происхождения каждого фрагмента.':activeNode==='ПЕРЕПИСКА'?'Анализ переписки, участников, вложений и контекста сообщений.':activeNode==='АНАЛИЗ СВЯЗЕЙ'?'Поиск и наглядное изучение связей между объектами и событиями.':activeNode==='ХРОНОЛОГИЯ'?'Сопоставление событий во времени с сохранением исходных отметок и часовых поясов.':'Географический контекст только там, где он подтверждён исходными данными.'}</p></div>
      </div>
      <div className="method-caption"><span>ИНТЕРАКТИВНАЯ СХЕМА / ВЫБЕРИТЕ РАЗДЕЛ</span><span>КОНЦЕПЦИЯ ПРОЕКТА · 2026</span></div>
    </section>

    <section className="architecture-section section-pad" id="architecture">
      <div className="section-kicker"><span>03</span> / ЛОГИКА СИСТЕМЫ</div>
      <div className="section-heading"><h2>От источника<br/><em>к обоснованному выводу.</em></h2><p>Ключевой принцип TRACE — не терять связь между аналитическим результатом и материалом, на котором он основан.</p></div>
      <div className="flow-list">
        <div className="flow-item"><span>01</span><div><h3>Сбор и сохранение</h3><p>Исходные материалы сохраняются отдельно от производных данных. Для объектов предусматриваются контрольные хеш-суммы и история обработки.</p></div><b>ВХОДНЫЕ ДАННЫЕ</b></div>
        <div className="flow-item"><span>02</span><div><h3>Извлечение структуры</h3><p>Форматы приводятся к анализируемым сущностям: участникам, сообщениям, временным отметкам, файлам и другим объектам.</p></div><b>ОБРАБОТКА</b></div>
        <div className="flow-item"><span>03</span><div><h3>Связи и контекст</h3><p>Объекты сопоставляются между собой. Каждая связь должна иметь проверяемое основание в исходных данных.</p></div><b>АНАЛИЗ</b></div>
        <div className="flow-item"><span>04</span><div><h3>Проверка и интерпретация</h3><p>Факты, автоматические обнаружения и гипотезы разделяются. Аналитик может вернуться к источнику и проверить основание вывода.</p></div><b>РЕЗУЛЬТАТ</b></div>
      </div>
      <div className="principle-note"><span>ГЛАВНЫЙ ПРИНЦИП</span><p>Никакой вывод не должен существовать отдельно от доказательной основы, которая позволяет его проверить.</p></div>
    </section>

    <section className="about-section section-pad" id="about">
      <div className="section-kicker"><span>04</span> / О ПРОЕКТЕ</div>
      <div className="about-grid"><div><h2>Не просто<br/><em>визуализация.</em></h2><p>TRACE — проект концепции цифровой аналитической платформы. Его задача — объединить работу с разными типами цифровых следов в едином пространстве и сделать взаимосвязи между ними понятными и проверяемыми.</p></div><div className="about-aside"><div><span>01 / TRACE</span><b>Единая логика</b><small>Связанные источники, сущности и события</small></div><div><span>02 / TRACE</span><b>Проверяемость</b><small>Прослеживаемость от результата к источнику</small></div><div><span>03 / TRACE</span><b>Контекст</b><small>Временная, структурная и географическая перспектива</small></div></div></div>
    </section>

    <section className="platform-section" id="platform"><div className="platform-glow"></div><div className="section-kicker"><span>↗</span> / СЛЕДУЮЩИЙ ШАГ</div><h2>Исследование<br/><em>начинается с вопроса.</em></h2><p>Презентационный сайт показывает идею и принципы TRACE. Функциональная аналитическая платформа разрабатывается как отдельный продукт.</p><span className="platform-status"><i></i> РАБОЧАЯ ПЛАТФОРМА / В РАЗРАБОТКЕ</span></section>
    <footer className="site-footer"><a className="wordmark" href="#top"><span className="wordmark-mark">T</span><span>TRACE</span><sup>INTELLIGENCE</sup></a><span>АНАЛИЗ ЦИФРОВЫХ СЛЕДОВ И СВЯЗЕЙ</span><a href="#top">НАВЕРХ ↑</a><small>© 2026 ПРОЕКТ TRACE</small></footer>
  </main>;
}