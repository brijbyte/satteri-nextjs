import Link from 'next/link';
import { milestones } from './milestones';

export default function Home() {
  return (
    <>
      <h1>satteri-nextjs showcase</h1>
      <p className="lede">
        A Next.js integration for satteri — Rust-native Markdown/MDX compiled to React/RSC modules.
        Each milestone gets a live demo as it lands.
      </p>

      <ul className="milestones">
        {milestones.map((m) => {
          const cls = `milestone ${m.done ? 'done' : 'todo'}`;
          const body = (
            <>
              <span className="num">{m.done ? '✓' : m.num}</span>
              <span className="meta">
                <span className="title">{m.title}</span>
                <span className="desc">{m.desc}</span>
                {(m.lib || m.source) && (
                  <span className="paths">
                    {m.lib && <code>{m.lib}</code>}
                    {m.source && <code>{m.source}</code>}
                  </span>
                )}
              </span>
              <span className={`status ${m.done ? 'done' : 'todo'}`}>
                {m.done ? 'live' : 'soon'}
              </span>
            </>
          );
          return (
            <li key={m.num} className={cls}>
              {m.href ? (
                <Link href={m.href} style={{ display: 'contents', color: 'inherit' }}>
                  {body}
                </Link>
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
