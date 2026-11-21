import { useState } from 'react';
import { ArrowDown, ArrowRight, ArrowUpRight, Menu, X } from 'lucide-react';
import Globe from './Globe';

const nav = [{ label: 'Задача', id: 'idea' }, { label: 'Возможности', id: 'method' }, { label: 'Методология', id: 'architecture' }, { label: 'О проекте', id: 'about' }];

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeNode, setActiveNode] = useState('ИСТОЧНИКИ');
  const closeMenu = () => setMenuOpen(false);
  return <main className="site-shell">
    <header className="site-header">
      <a className="wordmark" href="#top" aria-label="TRACE, на главную"><span className="wordmark-mark">T</span><span>TRACE</span><sup>ЦИФРОВАЯ АНАЛИТИКА</sup></a>
      <nav className={menuOpen ? 'main-nav is-open' : 'main-nav'}>{nav.map(item => <a key={item.id} href={'#' + item.id} onClick={closeMenu}>{item.label}</a>)}</nav>
      <a className="header-link" href="#platform">К проекту <ArrowUpRight size={15}/></a>
      <button className="menu-toggle" aria-label="Открыть меню" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X/> : <Menu/>}</button>
    </header>

    <section className="hero" id="top">
      <div className="hero-grid"></div>
      <div className="hero-copy">
        <div className="eyebrow"><span className="eyebrow-dot"></span> КОНЦЕПЦИЯ АНАЛИТИЧЕСКОЙ СРЕДЫ</div>
        <h1>Увидеть связи.<br/><em>Понять целое.</em></h1>
        <p className="hero-lead">TRACE — концепция среды для комплексного анализа цифровых следов. Она объединяет разнородные источники, помогает выявлять связи между объектами и восстанавливать контекст событий.</p>
        <div className="hero-actions"><a className="button button-light" href="#idea">Посмотреть идею <ArrowDown size={16}/></a><a className="text-link" href="#architecture">Методология TRACE <ArrowUpRight size={15}/></a></div>
        <div className="hero-index"><span>01 / 04</span><i></i><span>ЕДИНАЯ СРЕДА ДЛЯ АНАЛИЗА</span></div>
        <div className="hero-card"><span className="hero-card-mark">T</span><div><b>TRACE</b><small>Цифровые следы. Связи. События.</small></div><span className="hero-card-arrow">↗</span></div>
      </div>
      <div className="hero-visual"><div className="orbit orbit-a"></div><div className="orbit orbit-b"></div><div className="globe-stage"><Globe/></div>
        <div className="visual-tag tag-top"><span>01</span> ПРОСТРАНСТВЕННЫЙ КОНТЕКСТ</div>
        <div className="visual-tag tag-right"><span>02</span> СТРУКТУРА СВЯЗЕЙ</div>
        <div className="visual-tag tag-bottom"><span>03</span> ВРЕМЕННАЯ ПОСЛЕДОВАТЕЛЬНОСТЬ</div>
      </div>
      <div className="hero-bottom"><span>ИНФОРМАЦИЯ ПОВСЮДУ.</span><span>СВЯЗИ СОЗДАЮТ КАРТИНУ.</span><span>ЛИСТАЙТЕ ДАЛЬШЕ <ArrowDown size={13}/></span></div>
    </section>

    <section className="intro-section section-pad" id="idea">
      <div className="section-kicker"><span>01</span> / ИССЛЕДОВАТЕЛЬСКАЯ ЗАДАЧА</div>
      <div className="intro-layout"><h2>Данные редко<br/>рассказывают <em>историю</em><br/>по отдельности.</h2><div className="intro-text"><p>Цифровые материалы распределены между разными форматами и источниками: сообщениями, документами, сетевыми событиями, изображениями и метаданными. Их раздельное изучение затрудняет восстановление общей картины.</p><p>TRACE предлагает рассматривать эти материалы в единой аналитической модели: сопоставлять объекты, выявлять отношения между ними и прослеживать ход событий с возможностью вернуться к исходному основанию каждого наблюдения.</p><a className="underlined-link" href="#method">Принцип работы <ArrowRight size={15}/></a></div></div>
      <div className="statement-line"><span>ОТ ФРАГМЕНТОВ</span><b>→</b><span>К КОНТЕКСТУ</span><b>→</b><span>К ПОНИМАНИЮ</span></div>
    </section>

    <section className="method-section section-pad" id="method">
      <div className="section-kicker"><span>02</span> / АНАЛИТИЧЕСКИЕ ВОЗМОЖНОСТИ</div>
      <div className="section-heading"><h2>Единая модель.<br/><em>Разные уровни анализа.</em></h2><p>Концепция объединяет пять взаимосвязанных направлений, каждое из которых раскрывает отдельный аспект цифровых материалов.</p></div>
      <div className="method-visual">
        <div className="method-orbit"></div><div className="method-center"><span>TRACE</span><small>ЕДИНАЯ<br/>СРЕДА</small></div>
        {['ИСТОЧНИКИ','ПЕРЕПИСКА','АНАЛИЗ СВЯЗЕЙ','ХРОНОЛОГИЯ','ГЛОБУС'].map((node,i)=><button key={node} className={'method-node node-'+i+(activeNode===node?' active':'')} onClick={()=>setActiveNode(node)}><i></i><span>{node}</span><b>0{i+1}</b></button>)}
        <div className="method-detail"><span>ВЫБРАННЫЙ РАЗДЕЛ</span><b>{activeNode}</b><p>{activeNode==='ИСТОЧНИКИ'?'Изучение исходных файлов, их свойств и происхождения каждого фрагмента.':activeNode==='ПЕРЕПИСКА'?'Анализ переписки, участников, вложений и контекста сообщений.':activeNode==='АНАЛИЗ СВЯЗЕЙ'?'Поиск и наглядное изучение связей между объектами и событиями.':activeNode==='ХРОНОЛОГИЯ'?'Сопоставление событий во времени с сохранением исходных отметок и часовых поясов.':'Географический контекст только там, где он подтверждён исходными данными.'}</p></div>
      </div>
      <div className="method-caption"><span>НАПРАВЛЕНИЯ АНАЛИЗА / ВЫБЕРИТЕ РАЗДЕЛ</span><span>КОНЦЕПТУАЛЬНАЯ МОДЕЛЬ · 2026</span></div>
    </section>

    <section className="architecture-section section-pad" id="architecture">
      <div className="section-kicker"><span>03</span> / МЕТОДОЛОГИЧЕСКАЯ ОСНОВА</div>
      <div className="section-heading"><h2>От исходных данных<br/><em>к проверяемому выводу.</em></h2><p>Предлагаемая методология сохраняет прослеживаемость аналитического результата: от сформулированного наблюдения — к конкретному цифровому материалу и контексту его получения.</p></div>
      <div className="flow-list">
        <div className="flow-item"><span>01</span><div><h3>Сбор и сохранение</h3><p>Исходные материалы отделяются от производных представлений. Для каждого объекта предусматриваются контрольная хеш-сумма, сведения о происхождении и история преобразований.</p></div><b>ВХОДНЫЕ ДАННЫЕ</b></div>
        <div className="flow-item"><span>02</span><div><h3>Извлечение структуры</h3><p>Извлекаемые сведения приводятся к общей структуре: участники, сообщения, файлы, временные отметки, адреса и другие сущности — в пределах данных, доступных в источнике.</p></div><b>ОБРАБОТКА</b></div>
        <div className="flow-item"><span>03</span><div><h3>Связи и контекст</h3><p>Сущности сопоставляются по явно заданным признакам. Каждая отображаемая связь должна сопровождаться указанием основания и исходного материала.</p></div><b>АНАЛИЗ</b></div>
        <div className="flow-item"><span>04</span><div><h3>Проверка и интерпретация</h3><p>Непосредственно зафиксированные сведения, результаты автоматического обнаружения и аналитические гипотезы разделяются. Интерпретация не подменяет исходные данные.</p></div><b>РЕЗУЛЬТАТ</b></div>
      </div>
      <div className="principle-note"><span>ГЛАВНЫЙ ПРИНЦИП</span><p>Никакой вывод не должен существовать отдельно от доказательной основы, которая позволяет его проверить.</p></div>
    </section>

    <section className="about-section section-pad" id="about">
      <div className="section-kicker"><span>04</span> / КОНЦЕПЦИЯ И ПЕРСПЕКТИВА</div>
      <div className="about-grid"><div><h2>Аналитика,<br/><em>основанная на контексте.</em></h2><p>TRACE — концепция цифровой аналитической платформы для комплексного изучения разнородных цифровых следов. В центре подхода — не автоматическое вынесение заключений, а структурирование материалов, обнаружение возможных взаимосвязей и проверка оснований для интерпретации.</p></div><div className="about-aside"><div><span>01 / TRACE</span><b>Единая логика</b><small>Связанные источники, сущности и события</small></div><div><span>02 / TRACE</span><b>Проверяемость</b><small>Прослеживаемость от результата к источнику</small></div><div><span>03 / TRACE</span><b>Контекст</b><small>Временная, структурная и географическая перспектива</small></div></div></div>
    </section>

    <section className="platform-section" id="platform"><div className="platform-glow"></div><div className="section-kicker"><span>↗</span> / СЛЕДУЮЩИЙ ШАГ</div><h2>Исследование<br/><em>начинается с вопроса.</em></h2><p>Этот сайт представляет исследовательскую концепцию TRACE, её задачи, предполагаемые возможности и методологические принципы. Функциональная платформа — отдельный продукт, который требует самостоятельной реализации и проверки.</p><span className="platform-status"><i></i> ФУНКЦИОНАЛЬНАЯ ПЛАТФОРМА / ОТДЕЛЬНЫЙ ЭТАП РАЗРАБОТКИ</span></section>
    <footer className="site-footer"><a className="wordmark" href="#top"><span className="wordmark-mark">T</span><span>TRACE</span><sup>INTELLIGENCE</sup></a><span>КОНЦЕПЦИЯ КОМПЛЕКСНОГО АНАЛИЗА ЦИФРОВЫХ СЛЕДОВ</span><a href="#top">НАВЕРХ ↑</a><small>© 2026 ПРОЕКТ TRACE</small></footer>
  </main>;
}