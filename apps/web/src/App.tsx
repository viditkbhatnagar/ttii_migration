import { ShellCard } from '@ttii/ui';

export default function App() {
  return (
    <main className="app-shell">
      <header>
        <p className="eyebrow">TTII migration</p>
        <h1>Phase 02 platform foundation</h1>
      </header>
      <ShellCard
        title="Monorepo ready"
        subtitle="API, Web, and shared packages are now scaffolded."
        theme="light"
      >
        <ul>
          <li>Strict TypeScript baseline</li>
          <li>Workspace lint, format, test, build commands</li>
          <li>Dockerized development stack with MySQL</li>
        </ul>
      </ShellCard>
    </main>
  );
}
