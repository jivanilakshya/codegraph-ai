export default function HomePage() {
  return (
    <main className="landing-shell">
      <div className="ambient-grid" aria-hidden="true" />
      <div className="ambient-orb ambient-orb-left" aria-hidden="true" />
      <div className="ambient-orb ambient-orb-right" aria-hidden="true" />

      <section className="landing-content" aria-labelledby="project-name">
        <h1 id="project-name">CodeGraph AI</h1>
        <p className="subtitle">
          AI-Powered Codebase Knowledge Graph and Intelligent Code Assistant
        </p>
        <div className="coming-soon" role="status">
          <span className="status-indicator" aria-hidden="true" />
          <span>Coming Soon</span>
        </div>
      </section>
    </main>
  );
}
