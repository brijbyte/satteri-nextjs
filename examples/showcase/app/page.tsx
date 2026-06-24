import { milestones } from './milestones';

export default function Home() {
  return (
    <>
      <h1>satteri-nextjs showcase</h1>
      <p className="lede">
        A Next.js integration for satteri — Rust-native Markdown/MDX compiled to
        React/RSC modules. Each milestone gets a live demo as it lands.
      </p>

      <ul className="milestones">
        {milestones.map((m) => {
          const cls = `milestone ${m.done ? 'done' : 'todo'}`;
          const body = (
            <>
              <span className="num">{m.done ? '✓' : m.num}</span>
              <span>
                <span className="title">{m.title}</span>
                <br />
                <span className="desc">{m.desc}</span>
              </span>
              <span className={`status ${m.done ? 'done' : 'todo'}`}>
                {m.done ? 'live' : 'soon'}
              </span>
            </>
          );
          return (
            <li key={m.num} className={cls}>
              {m.href ? (
                <a href={m.href} style={{ display: 'contents', color: 'inherit' }}>
                  {body}
                </a>
              ) : (
                body
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
