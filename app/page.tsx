"use client";

import { useMemo, useState } from "react";

type LanguageData = {
  name: string;
  percent: number;
  bytes?: number;
  files?: number;
};

type TreeEntry = {
  path: string;
  type: string;
  size: number;
};

type Dependency = {
  name: string;
  version: string;
  kind: string;
};

type HealthCheck = {
  label: string;
  ok: boolean;
  detail: string;
};

type AnalysisData = {
  repository: {
    name: string;
    fullName: string;
    description: string | null;
    htmlUrl: string;
    defaultBranch: string;
    language: string | null;
    stars: number;
    forks: number;
    openIssues: number;
    watchers: number;
    sizeKb: number;
    topics: string[];
    license: string | null;
    archived: boolean;
  };
  statistics: {
    files: number;
    folders: number;
    totalEntries: number;
  };
  languages: LanguageData[];
  extensions: {
    extension: string;
    count: number;
  }[];
  topLevelEntries: {
    name: string;
    type: string;
    size: number;
  }[];
  tree: TreeEntry[];
  architecture: {
    name: string;
    type: string;
    children: any[];
  };
  dependencies: Dependency[];
  packageManager: string;
  packageScripts: Record<string, string>;
  readme: string;
  health: {
    overall: number;
    documentation: number;
    structure: number;
    hygiene: number;
    dependencies: number;
    testing: number;
    checks: HealthCheck[];
  };
  analyzedAt: string;
};

const mockLanguages: LanguageData[] = [
  { name: "TypeScript", percent: 46, files: 138 },
  { name: "Python", percent: 31, files: 94 },
  { name: "JavaScript", percent: 12, files: 36 },
  { name: "CSS", percent: 7, files: 21 },
  { name: "Other", percent: 4, files: 12 },
];

const mockFolders = [
  { icon: "📁", name: "src", type: "folder", count: "124 files" },
  { icon: "📁", name: "components", type: "folder", count: "38 files" },
  { icon: "📁", name: "services", type: "folder", count: "21 files" },
  { icon: "📁", name: "lib", type: "folder", count: "17 files" },
  { icon: "📁", name: "public", type: "folder", count: "42 files" },
  { icon: "📄", name: "package.json", type: "file", count: "2.8 KB" },
  { icon: "📄", name: "README.md", type: "file", count: "8.4 KB" },
];

const navItems = [
  ["◈", "Dashboard"],
  ["⌘", "Repository"],
  ["⌗", "Architecture"],
  ["◉", "Languages"],
  ["▦", "Dependencies"],
  ["≡", "README"],
  ["◇", "Health"],
  ["⇄", "Compare"],
];

export default function Home() {
  const [repo, setRepo] = useState(
    "https://github.com/JassDigital/jass-jamabandi-tools"
  );
  const [active, setActive] = useState("Dashboard");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [architectureQuery, setArchitectureQuery] = useState("");
  const [dependencyQuery, setDependencyQuery] = useState("");
  const [compareUrls, setCompareUrls] = useState([
    repo,
    "",
  ]);
  const [comparison, setComparison] = useState<any>(null);
  const [compareLoading, setCompareLoading] = useState(false);

  async function analyzeRepository() {
    if (!repo.trim()) {
      setError("Enter a GitHub repository URL.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: repo.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Repository analysis failed.");
      }

      setAnalysis(data as AnalysisData);
      setActive("Dashboard");
    } catch (err) {
      setAnalysis(null);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to analyze the repository."
      );
    } finally {
      setLoading(false);
    }
  }

  const displayLanguages =
    analysis && analysis.languages.length > 0
      ? analysis.languages
      : mockLanguages;

  const displayFolders =
    analysis && analysis.topLevelEntries.length > 0
      ? analysis.topLevelEntries.slice(0, 12).map((item) => ({
          icon: item.type === "tree" ? "📁" : "📄",
          name: item.name,
          type: item.type === "tree" ? "folder" : "file",
          count:
            item.type === "tree" ? "directory" : formatBytes(item.size),
        }))
      : mockFolders;

  const filteredTree = useMemo(() => {
    if (!analysis) return [];

    const query = architectureQuery.trim().toLowerCase();

    if (!query) return analysis.tree.slice(0, 100);

    return analysis.tree
      .filter((item) => item.path.toLowerCase().includes(query))
      .slice(0, 100);
  }, [analysis, architectureQuery]);

  const filteredDependencies = useMemo(() => {
    if (!analysis) return [];

    const query = dependencyQuery.trim().toLowerCase();

    if (!query) return analysis.dependencies;

    return analysis.dependencies.filter((dependency) =>
      `${dependency.name} ${dependency.version} ${dependency.kind}`
        .toLowerCase()
        .includes(query)
    );
  }, [analysis, dependencyQuery]);

  function handleNav(label: string) {
    setActive(label);
  }

  async function compareRepositories() {
    if (!compareUrls[0].trim() || !compareUrls[1].trim()) {
      setError("Enter two GitHub repository URLs to compare.");
      return;
    }

    setCompareLoading(true);
    setError("");

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ urls: compareUrls }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Comparison failed.");
      }

      setComparison(data);
    } catch (err) {
      setComparison(null);
      setError(
        err instanceof Error ? err.message : "Unable to compare repositories."
      );
    } finally {
      setCompareLoading(false);
    }
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">J</div>

          <div>
            <div className="brand-name">JASS</div>
            <div className="brand-subtitle">PROJECT INTELLIGENCE</div>
          </div>
        </div>

        <nav className="nav">
          {navItems.map((item) => {
            const icon = item[0];
            const label = item[1];

            return (
              <button
                key={label}
                className={
                  "nav-item " + (active === label ? "active" : "")
                }
                onClick={() => handleNav(label)}
              >
                <span>{icon}</span>
                {label}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <div className="system-card">
            <div className="status-dot" />

            <div>
              <strong>System Ready</strong>
              <span>
                {analysis ? "Repository analyzed" : "Local analysis engine"}
              </span>
            </div>
          </div>

          <div className="version">JASS PI · v1.1.0</div>
        </div>
      </aside>

      <section className="content">
        <header className="topbar">
          <div>
            <div className="breadcrumb">JASS / PROJECT INTELLIGENCE</div>
            <h1>{active}</h1>
          </div>

          <div className="top-actions">
            <button className="icon-button" aria-label="Search">
              ⌕
            </button>

            <button className="icon-button" aria-label="Theme">
              ☼
            </button>

            <div className="avatar">JD</div>
          </div>
        </header>

        <div className="repo-bar">
          <div className="repo-input-wrap">
            <span className="github-icon">◉</span>

            <input
              value={repo}
              onChange={(event) => setRepo(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  analyzeRepository();
                }
              }}
              placeholder="Enter a GitHub repository URL..."
              aria-label="GitHub repository URL"
            />
          </div>

          <button
            className="analyze-button"
            onClick={analyzeRepository}
            disabled={loading}
          >
            {loading ? "Analyzing..." : "Analyze Repository"}
            <span>{loading ? "◌" : "→"}</span>
          </button>
        </div>

        {error && (
          <div className="error-banner">
            <strong>Analysis failed</strong>
            <span>{error}</span>
          </div>
        )}

        {analysis && (
          <section className="repo-result">
            <div>
              <div className="eyebrow">ANALYZED REPOSITORY</div>
              <h2>{analysis.repository.fullName}</h2>
              <p>
                {analysis.repository.description ||
                  "No repository description provided."}
              </p>
            </div>

            <div className="repo-meta">
              <span>★ {analysis.repository.stars}</span>
              <span>⑂ {analysis.repository.forks}</span>
              <span>⚑ {analysis.repository.defaultBranch}</span>
              <span>{analysis.repository.license || "No license"}</span>
            </div>
          </section>
        )}

        {active === "Dashboard" && (
          <DashboardView
            analysis={analysis}
            displayLanguages={displayLanguages}
            displayFolders={displayFolders}
            onArchitecture={() => setActive("Architecture")}
            onHealth={() => setActive("Health")}
          />
        )}

        {active === "Repository" && (
          <RepositoryView analysis={analysis} />
        )}

        {active === "Architecture" && (
          <ArchitectureView
            analysis={analysis}
            filteredTree={filteredTree}
            query={architectureQuery}
            setQuery={setArchitectureQuery}
          />
        )}

        {active === "Languages" && (
          <LanguagesView
            analysis={analysis}
            languages={displayLanguages}
          />
        )}

        {active === "Dependencies" && (
          <DependenciesView
            analysis={analysis}
            dependencies={filteredDependencies}
            query={dependencyQuery}
            setQuery={setDependencyQuery}
          />
        )}

        {active === "README" && (
          <ReadmeView analysis={analysis} />
        )}

        {active === "Health" && (
          <HealthView analysis={analysis} />
        )}

        {active === "Compare" && (
          <CompareView
            compareUrls={compareUrls}
            setCompareUrls={setCompareUrls}
            comparison={comparison}
            loading={compareLoading}
            onCompare={compareRepositories}
          />
        )}

        <footer>
          <span>JASS Digital Lab</span>
          <span>Project Intelligence Engine · Local First</span>
        </footer>
      </section>
    </main>
  );
}

function DashboardView({
  analysis,
  displayLanguages,
  displayFolders,
  onArchitecture,
  onHealth,
}: {
  analysis: AnalysisData | null;
  displayLanguages: LanguageData[];
  displayFolders: any[];
  onArchitecture: () => void;
  onHealth: () => void;
}) {
  return (
    <>
      <section className="hero">
        <div>
          <div className="eyebrow">PROJECT OVERVIEW</div>

          <h2>
            Understand your
            <span> software.</span>
          </h2>

          <p>
            Analyze repository structure, languages, dependencies,
            architecture, documentation and project health from one
            intelligent dashboard.
          </p>
        </div>

        <div className="hero-orbit">
          <div className="orbit orbit-1" />
          <div className="orbit orbit-2" />
          <div className="orbit-core">J</div>
          <span className="orbit-node node-1">TS</span>
          <span className="orbit-node node-2">PY</span>
          <span className="orbit-node node-3">JS</span>
        </div>
      </section>

      <section className="stats-grid">
        <StatCard
          label="Files"
          value={
            analysis ? analysis.statistics.files.toLocaleString() : "301"
          }
          detail={analysis ? "Repository files" : "Demo data"}
          icon="◫"
        />

        <StatCard
          label="Languages"
          value={analysis ? analysis.languages.length.toString() : "5"}
          detail={analysis ? "Detected languages" : "Demo data"}
          icon="⌘"
        />

        <StatCard
          label="Folders"
          value={
            analysis ? analysis.statistics.folders.toLocaleString() : "47"
          }
          detail={analysis ? "Repository folders" : "Demo data"}
          icon="▦"
        />

        <StatCard
          label="Stars"
          value={analysis ? analysis.repository.stars.toLocaleString() : "—"}
          detail={
            analysis
              ? `${analysis.repository.forks.toLocaleString()} forks`
              : "Analyze repository"
          }
          icon="★"
        />
      </section>

      <section className="dashboard-grid">
        <div className="panel languages-panel">
          <PanelHeader title="Language Distribution" action="View details" />

          <div className="language-bars">
            {displayLanguages.map((language) => (
              <div className="language-row" key={language.name}>
                <div className="language-label">
                  <span>{language.name}</span>
                  <span>{language.percent}%</span>
                </div>

                <div className="bar-track">
                  <div
                    className="bar-fill"
                    style={{ width: language.percent + "%" }}
                  />
                </div>

                <span className="file-count">
                  {analysis && language.bytes !== undefined
                    ? formatBytes(language.bytes)
                    : `${language.files || 0} files`}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="panel health-panel">
          <PanelHeader
            title="Project Health"
            action="Full report"
          />

          <HealthSummary analysis={analysis} />
        </div>
      </section>

      <section className="panel structure-panel">
        <PanelHeader
          title="Project Structure"
          action="Explore repository"
        />

        <div className="structure-list">
          {displayFolders.map((item) => (
            <div className="structure-row" key={item.name}>
              <div className="structure-name">
                <span>{item.icon}</span>
                <strong>{item.name}</strong>
              </div>

              <span className="structure-type">{item.type}</span>
              <span className="structure-count">{item.count}</span>
              <span className="chevron">›</span>
            </div>
          ))}
        </div>

        <button className="wide-action" onClick={onArchitecture}>
          Open Architecture Explorer →
        </button>
      </section>

      <section className="bottom-grid">
        <div className="panel">
          <PanelHeader title="Intelligence Summary" />

          <div className="insight-grid">
            <Insight
              title="Documentation"
              value={analysis ? scoreText(analysis.health.documentation) : "92"}
              detail={analysis ? "Evidence-based" : "Demo score"}
            />

            <Insight
              title="Structure"
              value={analysis ? scoreText(analysis.health.structure) : "94"}
              detail={analysis ? "Repository structure" : "Demo score"}
            />

            <Insight
              title="Dependencies"
              value={
                analysis
                  ? analysis.dependencies.length.toString()
                  : "38"
              }
              detail={analysis ? "Detected packages" : "Demo data"}
            />

            <Insight
              title="Open Issues"
              value={
                analysis
                  ? analysis.repository.openIssues.toString()
                  : "—"
              }
              detail={analysis ? "GitHub issues" : "Analyze repository"}
            />

            <Insight
              title="Stack"
              value={
                analysis?.architecture?.stack?.length
                  ? analysis.architecture.stack[0]
                  : "—"
              }
              detail={
                analysis
                  ? `${analysis.architecture.stack.length} technologies`
                  : "Analyze repository"
              }
            />
          </div>
        </div>

        <div className="panel quick-panel">
          <PanelHeader title="Quick Actions" />

          <button className="quick-action" onClick={onArchitecture}>
            Explore architecture <span>→</span>
          </button>

          <button className="quick-action" onClick={onHealth}>
            Review health report <span>→</span>
          </button>

          <button
            className="quick-action"
            onClick={() => window.open(analysis?.repository.htmlUrl, "_blank")}
          >
            Open GitHub repository <span>↗</span>
          </button>
        </div>
      </section>
    </>
  );
}

function RepositoryView({ analysis }: { analysis: AnalysisData | null }) {
  if (!analysis) {
    return <EmptyState title="Analyze a repository first" />;
  }

  const repo = analysis.repository;

  return (
    <section className="view-stack">
      <div className="panel repository-header-panel">
        <div>
          <div className="eyebrow">REPOSITORY</div>
          <h2>{repo.fullName}</h2>
          <p>{repo.description || "No description provided."}</p>
        </div>

        <button
          className="secondary-button"
          onClick={() => window.open(repo.htmlUrl, "_blank")}
        >
          Open on GitHub ↗
        </button>
      </div>

      <div className="detail-grid">
        <Detail label="Default branch" value={repo.defaultBranch} />
        <Detail label="Primary language" value={repo.language || "Not detected"} />
        <Detail label="License" value={repo.license || "Not detected"} />
        <Detail label="Repository size" value={formatBytes(repo.sizeKb * 1024)} />
        <Detail label="Stars" value={repo.stars.toLocaleString()} />
        <Detail label="Forks" value={repo.forks.toLocaleString()} />
        <Detail label="Open issues" value={repo.openIssues.toLocaleString()} />
        <Detail label="Watchers" value={repo.watchers.toLocaleString()} />
      </div>

      <div className="panel">
        <PanelHeader title="Topics" />

        <div className="tag-list">
          {repo.topics.length ? (
            repo.topics.map((topic) => (
              <span className="tag" key={topic}>
                {topic}
              </span>
            ))
          ) : (
            <span className="muted">No GitHub topics configured.</span>
          )}
        </div>
      </div>
    </section>
  );
}

function ArchitectureView({
  analysis,
  filteredTree,
  query,
  setQuery,
}: {
  analysis: AnalysisData | null;
  filteredTree: TreeEntry[];
  query: string;
  setQuery: (value: string) => void;
}) {
  if (!analysis) {
    return <EmptyState title="Analyze a repository to build its architecture map" />;
  }

  const topFolders = analysis.topLevelEntries.filter(
    (item) => item.type === "tree"
  );

  return (
    <section className="view-stack">
      <div className="panel architecture-hero">
        <div>
          <div className="eyebrow">ARCHITECTURE EXPLORER</div>
          <h2>{analysis.repository.name}</h2>
          <p>
            A live structural view generated from the repository tree.
          </p>
        </div>

        <div className="architecture-metrics">
          <Metric value={analysis.statistics.folders} label="folders" />
          <Metric value={analysis.statistics.files} label="files" />
          <Metric value={topFolders.length} label="root folders" />
        </div>
      </div>

      <div className="architecture-columns">
        <div className="panel">
          <PanelHeader title="Repository Map" />

          <div className="architecture-map">
            <div className="architecture-root">
              <span>◆</span>
              <strong>{analysis.repository.name}</strong>
            </div>

            <div className="architecture-branches">
              {analysis.topLevelEntries.slice(0, 14).map((item) => (
                <div className="architecture-node" key={item.name}>
                  <span>{item.type === "tree" ? "📁" : "📄"}</span>
                  <strong>{item.name}</strong>
                  <small>{item.type === "tree" ? "folder" : "file"}</small>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="panel">
          <PanelHeader title="File Explorer" />

          <input
            className="panel-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter files..."
          />

          <div className="file-list">
            {filteredTree.map((file) => (
              <div className="file-row" key={file.path}>
                <span>{file.type === "tree" ? "📁" : "📄"}</span>
                <strong>{file.path}</strong>
                <small>{formatBytes(file.size)}</small>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function LanguagesView({
  analysis,
  languages,
}: {
  analysis: AnalysisData | null;
  languages: LanguageData[];
}) {
  return (
    <section className="view-stack">
      <div className="panel">
        <PanelHeader title="Language Intelligence" />

        <div className="language-big-list">
          {languages.map((language) => (
            <div className="language-big-row" key={language.name}>
              <div>
                <strong>{language.name}</strong>
                <span>
                  {analysis && language.bytes !== undefined
                    ? formatBytes(language.bytes)
                    : `${language.files || 0} files`}
                </span>
              </div>

              <div className="big-language-bar">
                <div
                  style={{ width: `${language.percent}%` }}
                />
              </div>

              <strong>{language.percent}%</strong>
            </div>
          ))}
        </div>
      </div>

      {analysis && (
        <>
          <div className="panel">
            <PanelHeader title="Technology Stack" />

            <div className="tag-list">
              {analysis.architecture.stack.map((technology: string) => (
                <span className="tag" key={technology}>
                  {technology}
                </span>
              ))}
            </div>
          </div>

          <div className="panel">
            <PanelHeader title="File Extensions" />

            <div className="extension-grid">
              {analysis.extensions.map((item) => (
                <div className="extension-card" key={item.extension}>
                  <strong>{item.extension}</strong>
                  <span>{item.count} files</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function DependenciesView({
  analysis,
  dependencies,
  query,
  setQuery,
}: {
  analysis: AnalysisData | null;
  dependencies: Dependency[];
  query: string;
  setQuery: (value: string) => void;
}) {
  if (!analysis) {
    return <EmptyState title="Analyze a repository to inspect dependencies" />;
  }

  return (
    <section className="view-stack">
      <div className="panel">
        <PanelHeader title="Dependency Intelligence" />

        <div className="dependency-summary">
          <Metric value={dependencies.length} label="detected" />
          <Metric value={analysis.packageManager} label="package manager" />
          <Metric value={Object.keys(analysis.packageScripts).length} label="scripts" />
        </div>

        <input
          className="panel-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search dependencies..."
        />

        <div className="dependency-table">
          <div className="dependency-head">
            <span>Package</span>
            <span>Version</span>
            <span>Type</span>
          </div>

          {dependencies.map((dependency) => (
            <div className="dependency-row" key={`${dependency.kind}-${dependency.name}`}>
              <strong>{dependency.name}</strong>
              <span>{dependency.version}</span>
              <span>{dependency.kind}</span>
            </div>
          ))}
        </div>
      </div>

      {Object.keys(analysis.packageScripts).length > 0 && (
        <div className="panel">
          <PanelHeader title="Package Scripts" />

          <div className="script-list">
            {Object.entries(analysis.packageScripts).map(([name, command]) => (
              <div className="script-row" key={name}>
                <strong>{name}</strong>
                <code>{command}</code>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function ReadmeView({ analysis }: { analysis: AnalysisData | null }) {
  if (!analysis) {
    return <EmptyState title="Analyze a repository to inspect its README" />;
  }

  return (
    <section className="view-stack">
      <div className="panel readme-panel">
        <PanelHeader title="README Intelligence" />

        {analysis.readme ? (
          <>
            <div className="insight-grid">
              <Insight
                title="README Quality"
                value={`${analysis.readmeIntelligence.quality}`}
                detail="Evidence-based score"
              />
              <Insight
                title="Words"
                value={analysis.readmeIntelligence.wordCount.toLocaleString()}
                detail="README word count"
              />
              <Insight
                title="Sections"
                value={analysis.readmeIntelligence.sections.filter((section: any) => section.found).length.toString()}
                detail="Detected sections"
              />
              <Insight
                title="Missing"
                value={analysis.readmeIntelligence.sections.filter((section: any) => !section.found).length.toString()}
                detail="Suggested sections"
              />
            </div>

            <div className="readme-check-list">
              {analysis.readmeIntelligence.sections.map((section: any) => (
                <div className="readme-check" key={section.name}>
                  <span className={section.found ? "check-icon ok" : "check-icon warn"}>
                    {section.found ? "✓" : "!"}
                  </span>
                  <strong>{section.name}</strong>
                </div>
              ))}
            </div>

            <pre className="readme-content">{analysis.readme}</pre>
          </>
        ) : (
          <div className="empty-inline">
            No README.md was found in this repository.
          </div>
        )}
      </div>
    </section>
  );
}

function HealthView({ analysis }: { analysis: AnalysisData | null }) {
  if (!analysis) {
    return <EmptyState title="Analyze a repository to calculate project health" />;
  }

  const health = analysis.health;

  return (
    <section className="view-stack">
      <div className="health-overview">
        <div className="panel health-score-large">
          <div className="score-ring large">
            <div>
              <strong>{health.overall}</strong>
              <span>/100</span>
            </div>
          </div>

          <div>
            <div className="eyebrow">PROJECT HEALTH</div>
            <h2>{healthLabel(health.overall)}</h2>
            <p>
              Score derived from repository evidence, not an arbitrary
              static rating.
            </p>
          </div>
        </div>

        <div className="panel">
          <PanelHeader title="Health Dimensions" />

          <HealthDimension label="Documentation" value={health.documentation} />
          <HealthDimension label="Structure" value={health.structure} />
          <HealthDimension label="Repository Hygiene" value={health.hygiene} />
          <HealthDimension label="Dependencies" value={health.dependencies} />
          <HealthDimension label="Testing" value={health.testing} />
        </div>
      </div>

      <div className="panel">
        <PanelHeader title="Evidence Checks" />

        <div className="health-checks">
          {health.checks.map((check) => (
            <div className="health-check" key={check.label}>
              <div className={check.ok ? "check-icon ok" : "check-icon warn"}>
                {check.ok ? "✓" : "!"}
              </div>

              <div>
                <strong>{check.label}</strong>
                <span>{check.detail}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}


function CompareView({
  compareUrls,
  setCompareUrls,
  comparison,
  loading,
  onCompare,
}: {
  compareUrls: string[];
  setCompareUrls: (urls: string[]) => void;
  comparison: any;
  loading: boolean;
  onCompare: () => void;
}) {
  return (
    <section className="view-stack">
      <div className="panel">
        <div className="eyebrow">REPOSITORY COMPARISON</div>
        <h2 className="compare-title">Compare two projects side by side.</h2>
        <p className="compare-description">
          Compare architecture, languages, health, dependencies and repository
          metadata using the same analysis engine.
        </p>

        <div className="compare-inputs">
          <input
            className="panel-search"
            value={compareUrls[0]}
            onChange={(event) =>
              setCompareUrls([event.target.value, compareUrls[1]])
            }
            placeholder="First GitHub repository URL"
          />

          <input
            className="panel-search"
            value={compareUrls[1]}
            onChange={(event) =>
              setCompareUrls([compareUrls[0], event.target.value])
            }
            placeholder="Second GitHub repository URL"
          />

          <button
            className="analyze-button compare-button"
            onClick={onCompare}
            disabled={loading}
          >
            {loading ? "Comparing..." : "Compare Repositories"}
            <span>{loading ? "◌" : "⇄"}</span>
          </button>
        </div>
      </div>

      {comparison?.repositories?.length === 2 && (
        <div className="compare-grid">
          {comparison.repositories.map((item: any) => (
            <div className="panel" key={item.repository.fullName}>
              <div className="eyebrow">REPOSITORY</div>
              <h3 className="compare-repo-name">{item.repository.fullName}</h3>

              <div className="compare-score">
                <div className="score-ring">
                  <div>
                    <strong>{item.health.overall}</strong>
                    <span>/100</span>
                  </div>
                </div>

                <div>
                  <strong>{healthLabel(item.health.overall)}</strong>
                  <p>Project health</p>
                </div>
              </div>

              <div className="detail-grid compare-details">
                <Detail label="Files" value={item.statistics.files.toString()} />
                <Detail label="Folders" value={item.statistics.folders.toString()} />
                <Detail label="Languages" value={item.languages.length.toString()} />
                <Detail label="Dependencies" value={item.dependencies.length.toString()} />
              </div>

              <div className="compare-section">
                <span>Technology stack</span>
                <div className="tag-list">
                  {item.architecture.stack.map((technology: string) => (
                    <span className="tag" key={technology}>
                      {technology}
                    </span>
                  ))}
                </div>
              </div>

              <div className="compare-section">
                <span>README quality</span>
                <strong>{item.readmeIntelligence.quality}/100</strong>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function HealthSummary({ analysis }: { analysis: AnalysisData | null }) {
  if (!analysis) {
    return (
      <div className="health-score">
        <div className="score-ring">
          <div>
            <strong>87</strong>
            <span>/100</span>
          </div>
        </div>

        <div>
          <strong className="healthy">Demo Project</strong>
          <p>Analyze a repository for evidence-based scoring.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="health-score">
        <div className="score-ring">
          <div>
            <strong>{analysis.health.overall}</strong>
            <span>/100</span>
          </div>
        </div>

        <div>
          <strong className="healthy">
            {healthLabel(analysis.health.overall)}
          </strong>
          <p>Evidence-based repository assessment.</p>
        </div>
      </div>

      <div className="health-items">
        <HealthItem
          label="Documentation"
          value={`${analysis.health.documentation}%`}
        />
        <HealthItem
          label="Structure"
          value={`${analysis.health.structure}%`}
        />
        <HealthItem
          label="Dependencies"
          value={`${analysis.health.dependencies}%`}
        />
        <HealthItem
          label="Testing"
          value={`${analysis.health.testing}%`}
        />
      </div>
    </>
  );
}

function HealthDimension({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="dimension-row">
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>

      <div className="bar-track">
        <div
          className="bar-fill"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function HealthItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  const numeric = value.endsWith("%");

  return (
    <div className="health-row">
      <span>{label}</span>

      <div className="mini-track">
        <div
          className="mini-fill"
          style={{
            width: numeric ? value : "0%",
          }}
        />
      </div>

      <strong>{value}</strong>
    </div>
  );
}

function StatCard({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: string;
}) {
  return (
    <div className="stat-card">
      <div className="stat-top">
        <span>{label}</span>
        <span className="stat-icon">{icon}</span>
      </div>

      <strong>{value}</strong>

      <div className="stat-detail">
        <span>↑</span> {detail}
      </div>
    </div>
  );
}

function PanelHeader({
  title,
  action,
}: {
  title: string;
  action?: string;
}) {
  return (
    <div className="panel-header">
      <h3>{title}</h3>
      {action && <button type="button">{action} →</button>}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="detail-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Metric({
  value,
  label,
}: {
  value: string | number;
  label: string;
}) {
  return (
    <div className="metric">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function Insight({
  title,
  value,
  detail,
}: {
  title: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="insight-card">
      <span>{title}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}

function EmptyState({ title }: { title: string }) {
  return (
    <section className="panel empty-state">
      <div className="empty-icon">◈</div>
      <h2>{title}</h2>
      <p>
        Enter a public GitHub repository above and click Analyze Repository.
      </p>
    </section>
  );
}

function formatBytes(bytes: number) {
  if (!bytes || bytes < 1024) {
    return `${bytes || 0} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function scoreText(value: number) {
  return `${Math.round(value)}`;
}

function healthLabel(score: number) {
  if (score >= 90) return "Excellent";
  if (score >= 80) return "Healthy";
  if (score >= 65) return "Needs attention";
  return "Needs work";
}


/* v1.2 component-local utility classes */
