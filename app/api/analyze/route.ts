import { NextRequest, NextResponse } from "next/server";

const GITHUB_API = "https://api.github.com";

type RepoContext = {
  owner: string;
  repo: string;
};

function parseGitHubUrl(input: string): RepoContext {
  let value = input.trim();

  if (!value.startsWith("http")) {
    value = `https://github.com/${value}`;
  }

  const url = new URL(value);

  if (url.hostname !== "github.com") {
    throw new Error("Please enter a github.com repository URL.");
  }

  const parts = url.pathname.split("/").filter(Boolean);

  if (parts.length < 2) {
    throw new Error("Invalid GitHub repository URL.");
  }

  return {
    owner: parts[0],
    repo: parts[1].replace(/\.git$/, ""),
  };
}

async function githubFetch(path: string) {
  const response = await fetch(`${GITHUB_API}${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "JASS-Project-Intelligence",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `GitHub API ${response.status}: ${body || response.statusText}`
    );
  }

  return response.json();
}

function decodeContent(content: string) {
  return Buffer.from(content.replace(/\n/g, ""), "base64").toString("utf-8");
}

async function readRepoFile(context: RepoContext, path: string) {
  try {
    const data = await githubFetch(
      `/repos/${encodeURIComponent(context.owner)}/${encodeURIComponent(
        context.repo
      )}/contents/${path}`
    );

    return data.content ? decodeContent(data.content) : "";
  } catch {
    return "";
  }
}

function scoreHealth(input: {
  hasReadme: boolean;
  hasLicense: boolean;
  hasPackageManifest: boolean;
  hasLockfile: boolean;
  hasTests: boolean;
  hasCi: boolean;
  hasSource: boolean;
  hasDocs: boolean;
  hasGitignore: boolean;
  readmeQuality: number;
  fileCount: number;
  folderCount: number;
  outdatedCount: number;
}) {
  const documentation = Math.min(
    100,
    (input.hasReadme ? 45 : 0) +
      input.readmeQuality * 0.35 +
      (input.hasDocs ? 10 : 0) +
      (input.hasLicense ? 10 : 0)
  );

  const structure = Math.min(
    100,
    (input.hasSource ? 45 : 20) +
      (input.folderCount >= 2 ? 20 : 10) +
      (input.fileCount >= 5 ? 20 : 10) +
      (input.hasGitignore ? 15 : 0)
  );

  const hygiene = Math.min(
    100,
    (input.hasGitignore ? 30 : 0) +
      (input.hasLicense ? 20 : 5) +
      (input.hasCi ? 25 : 0) +
      (input.hasLockfile ? 15 : 5) +
      (input.fileCount < 1000 ? 10 : 3)
  );

  const dependencyPenalty = Math.min(35, input.outdatedCount * 5);

  const dependencies = Math.max(
    35,
    Math.min(
      100,
      (input.hasPackageManifest ? 60 : 35) +
        (input.hasLockfile ? 35 : 0) -
        dependencyPenalty
    )
  );

  const testing = input.hasTests ? 85 : 35;

  const overall = Math.round(
    documentation * 0.2 +
      structure * 0.25 +
      hygiene * 0.2 +
      dependencies * 0.2 +
      testing * 0.15
  );

  return {
    overall,
    documentation: Math.round(documentation),
    structure: Math.round(structure),
    hygiene: Math.round(hygiene),
    dependencies: Math.round(dependencies),
    testing: Math.round(testing),
    checks: [
      {
        label: "README quality",
        ok: input.hasReadme,
        detail: input.hasReadme
          ? "README exists and was inspected for common project sections."
          : "No README.md was found.",
      },
      {
        label: "License",
        ok: input.hasLicense,
        detail: input.hasLicense
          ? "A repository license is configured."
          : "No repository license was detected.",
      },
      {
        label: "Source structure",
        ok: input.hasSource,
        detail: input.hasSource
          ? "A conventional source/application directory was detected."
          : "No conventional source directory was detected.",
      },
      {
        label: "Git hygiene",
        ok: input.hasGitignore,
        detail: input.hasGitignore
          ? ".gitignore was detected."
          : "No .gitignore was detected.",
      },
      {
        label: "Lockfile",
        ok: input.hasLockfile,
        detail: input.hasLockfile
          ? "A dependency lockfile was detected."
          : "No dependency lockfile was detected.",
      },
      {
        label: "Tests",
        ok: input.hasTests,
        detail: input.hasTests
          ? "Test-related files or directories were detected."
          : "No obvious test files or directories were detected.",
      },
      {
        label: "CI workflow",
        ok: input.hasCi,
        detail: input.hasCi
          ? "GitHub Actions workflow detected."
          : "No GitHub Actions workflow was detected.",
      },
    ],
  };
}

function readmeIntelligence(readme: string) {
  const text = readme.toLowerCase();

  const sections = [
    {
      name: "Project description",
      found:
        text.length > 150 ||
        /(^|\n)#\s|description|overview|about this project/.test(text),
    },
    {
      name: "Installation",
      found: /install|setup|getting started|quick start/.test(text),
    },
    {
      name: "Usage",
      found: /usage|how to use|example|run the|npm run|python /.test(text),
    },
    {
      name: "Features",
      found: /features|capabilities|what it does/.test(text),
    },
    {
      name: "Configuration",
      found: /configuration|config|environment variables|\.env/.test(text),
    },
    {
      name: "License",
      found: /license|licence/.test(text),
    },
    {
      name: "Contributing",
      found: /contribut|pull request|development/.test(text),
    },
  ];

  const found = sections.filter((section) => section.found).length;
  const quality = Math.min(
    100,
    Math.round(
      (found / sections.length) * 75 +
        Math.min(readme.length / 3000, 1) * 25
    )
  );

  return {
    quality,
    wordCount: readme.trim() ? readme.trim().split(/\s+/).length : 0,
    sections,
  };
}

function detectStack(
  paths: string[],
  repositoryLanguage: string | null,
  packageJson: any
) {
  const lower = paths.map((path) => path.toLowerCase());
  const stack: string[] = [];

  const has = (pattern: RegExp) => lower.some((path) => pattern.test(path));

  if (
    has(/(^|\/)next\.config\.(js|mjs|ts)$/) ||
    packageJson?.dependencies?.next
  ) {
    stack.push("Next.js");
  }

  if (
    packageJson?.dependencies?.react ||
    packageJson?.dependencies?.["react-dom"]
  ) {
    stack.push("React");
  }

  if (packageJson?.dependencies?.typescript || has(/\.tsx?$|tsconfig\.json$/)) {
    stack.push("TypeScript");
  }

  if (
    packageJson?.dependencies?.vite ||
    packageJson?.devDependencies?.vite
  ) {
    stack.push("Vite");
  }

  if (
    packageJson?.dependencies?.electron ||
    packageJson?.devDependencies?.electron
  ) {
    stack.push("Electron");
  }

  if (
    has(/(^|\/)requirements\.txt$/) ||
    has(/(^|\/)pyproject\.toml$/) ||
    has(/\.py$/)
  ) {
    stack.push("Python");
  }

  if (has(/(^|\/)fastapi/) || packageJson?.dependencies?.fastapi) {
    stack.push("FastAPI");
  }

  if (has(/(^|\/)django/) || packageJson?.dependencies?.django) {
    stack.push("Django");
  }

  if (has(/(^|\/)tailwind\.config\./) || packageJson?.dependencies?.tailwindcss) {
    stack.push("Tailwind CSS");
  }

  if (repositoryLanguage && !stack.includes(repositoryLanguage)) {
    stack.push(repositoryLanguage);
  }

  return [...new Set(stack)];
}

function architecturalSummary(
  stack: string[],
  paths: string[],
  packageJson: any
) {
  const lower = paths.map((path) => path.toLowerCase());

  const hasFolder = (name: string) =>
    lower.some(
      (path) =>
        path === name ||
        path.startsWith(`${name}/`) ||
        path.includes(`/${name}/`)
    );

  const areas: { name: string; detail: string; detected: boolean }[] = [
    {
      name: "Application / UI",
      detail: "Application entry points and interface code.",
      detected:
        hasFolder("app") ||
        hasFolder("pages") ||
        hasFolder("src") ||
        stack.includes("React"),
    },
    {
      name: "Components",
      detail: "Reusable UI components.",
      detected: hasFolder("components"),
    },
    {
      name: "Services / API",
      detail: "Service, backend, API or integration code.",
      detected:
        hasFolder("api") ||
        hasFolder("services") ||
        hasFolder("server") ||
        stack.includes("FastAPI"),
    },
    {
      name: "Data / Library",
      detail: "Shared libraries, data and utility modules.",
      detected: hasFolder("lib") || hasFolder("data") || hasFolder("utils"),
    },
    {
      name: "Testing",
      detail: "Automated test infrastructure.",
      detected:
        lower.some(
          (path) =>
            /(^|\/)(test|tests|__tests__)(\/|$)|(\.test\.|\.spec\.)/.test(path)
        ),
    },
    {
      name: "CI / Delivery",
      detail: "Automated build, test or deployment workflows.",
      detected: lower.some((path) => /^\.github\/workflows\//.test(path)),
    },
  ];

  const entryPoints = lower.filter(
    (path) =>
      /(^|\/)(page|layout|main|index|app|server)\.(tsx?|jsx?|py)$/.test(path)
  );

  return {
    stack,
    areas,
    entryPoints: entryPoints.slice(0, 30),
    packageScripts: packageJson?.scripts || {},
  };
}

function extractDependencies(packageJson: any) {
  if (!packageJson || typeof packageJson !== "object") return [];

  const groups = [
    ["dependencies", packageJson.dependencies],
    ["devDependencies", packageJson.devDependencies],
    ["peerDependencies", packageJson.peerDependencies],
  ];

  const result: {
    name: string;
    version: string;
    kind: string;
  }[] = [];

  for (const [kind, deps] of groups) {
    if (!deps || typeof deps !== "object") continue;

    for (const [name, version] of Object.entries(deps)) {
      result.push({
        name,
        version: String(version),
        kind: String(kind),
      });
    }
  }

  return result.sort((a, b) => a.name.localeCompare(b.name));
}

async function fetchOutdated(
  context: RepoContext,
  packageJson: any,
  dependencies: { name: string; version: string; kind: string }[]
) {
  if (!packageJson || dependencies.length === 0) return [];

  const candidates = dependencies
    .filter(
      (dependency) =>
        !dependency.version.startsWith("file:") &&
        !dependency.version.startsWith("git") &&
        !dependency.version.startsWith("http")
    )
    .slice(0, 40);

  const results: {
    name: string;
    current: string;
    latest: string;
    kind: string;
    status: string;
  }[] = [];

  for (const dependency of candidates) {
    try {
      const npm = await fetch(
        `https://registry.npmjs.org/${encodeURIComponent(dependency.name)}/latest`,
        { cache: "no-store" }
      );

      if (!npm.ok) continue;

      const latestData = await npm.json();
      const latest = String(latestData.version || "");

      const current = dependency.version.replace(/^[^0-9]*/, "");

      let status = "unknown";

      if (current && latest) {
        if (current === latest) {
          status = "current";
        } else {
          status = "update available";
        }
      }

      results.push({
        name: dependency.name,
        current: dependency.version,
        latest,
        kind: dependency.kind,
        status,
      });
    } catch {
      // External registry lookup is best-effort.
    }
  }

  return results;
}

function buildTree(files: any[]) {
  const root: any = {
    name: "Repository",
    type: "root",
    children: [],
  };

  const folders = new Map<string, any>();

  function ensureFolder(parts: string[]) {
    let parent = root;
    let path = "";

    for (const part of parts) {
      path = path ? `${path}/${part}` : part;

      if (!folders.has(path)) {
        const node = {
          name: part,
          type: "folder",
          children: [],
        };

        parent.children.push(node);
        folders.set(path, node);
      }

      parent = folders.get(path);
    }

    return parent;
  }

  for (const file of files) {
    const parts = String(file.path).split("/").filter(Boolean);
    const name = parts.pop();
    if (!name) continue;

    const parent = parts.length ? ensureFolder(parts) : root;

    parent.children.push({
      name,
      type: "file",
      size: file.size || 0,
    });
  }

  function sort(node: any) {
    node.children?.sort((a: any, b: any) => {
      if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    node.children?.forEach(sort);
  }

  sort(root);
  return root;
}

async function analyzeRepository(context: RepoContext) {
  const repository = await githubFetch(
    `/repos/${encodeURIComponent(context.owner)}/${encodeURIComponent(
      context.repo
    )}`
  );

  const [languages, tree] = await Promise.all([
    githubFetch(
      `/repos/${encodeURIComponent(context.owner)}/${encodeURIComponent(
        context.repo
      )}/languages`
    ),
    githubFetch(
      `/repos/${encodeURIComponent(context.owner)}/${encodeURIComponent(
        context.repo
      )}/git/trees/${encodeURIComponent(repository.default_branch)}?recursive=1`
    ),
  ]);

  const entries = Array.isArray(tree.tree) ? tree.tree : [];
  const files = entries.filter((item: any) => item.type === "blob");
  const directories = entries.filter((item: any) => item.type === "tree");

  const readme = await readRepoFile(context, "README.md");

  const paths = new Set(
    files.map((item: any) => String(item.path).toLowerCase())
  );

  let packageJson: any = null;
  const packagePath = [...paths].find((path) => path === "package.json");

  if (packagePath) {
    const packageText = await readRepoFile(context, packagePath);
    try {
      packageJson = JSON.parse(packageText);
    } catch {
      packageJson = null;
    }
  }

  const requirementsPath = [...paths].find(
    (path) => path === "requirements.txt" || path === "pyproject.toml"
  );

  const requirements = requirementsPath
    ? await readRepoFile(context, requirementsPath)
    : "";

  const packageLock =
    paths.has("package-lock.json") ||
    paths.has("npm-shrinkwrap.json") ||
    paths.has("yarn.lock") ||
    paths.has("pnpm-lock.yaml");

  const hasReadme = Boolean(readme.trim());
  const hasLicense =
    Boolean(repository.license) ||
    [...paths].some((path) =>
      /(^|\/)(license|copying)(\.[^/]+)?$/i.test(path)
    );

  const hasGitignore = paths.has(".gitignore");

  const hasSource = directories.some((item: any) =>
    /^(src|app|lib|components|pages|server|backend|frontend)$/i.test(
      String(item.path).split("/")[0]
    )
  );

  const hasTests = [...paths].some((path) =>
    /(^|\/)(test|tests|__tests__)(\/|$)|(\.test\.|\.spec\.)/i.test(path)
  );

  const hasDocs =
    [...paths].some((path) =>
      /(^|\/)(docs|documentation)(\/|$)/i.test(path)
    ) || readme.length > 1500;

  const hasCi = [...paths].some((path) =>
    /^\.github\/workflows\/.+\.(yml|yaml)$/i.test(path)
  );

  const readmeInfo = readmeIntelligence(readme);
  const dependencies = extractDependencies(packageJson);
  const outdated = await fetchOutdated(context, packageJson, dependencies);

  const languageEntries = Object.entries(languages);
  const totalLanguageBytes = languageEntries.reduce(
    (sum, [, bytes]) => sum + Number(bytes),
    0
  );

  const languageStats = languageEntries
    .map(([name, bytes]) => ({
      name,
      bytes: Number(bytes),
      percent:
        totalLanguageBytes > 0
          ? Math.round((Number(bytes) / totalLanguageBytes) * 100)
          : 0,
    }))
    .sort((a, b) => b.bytes - a.bytes);

  const extensionCounts: Record<string, number> = {};

  for (const file of files) {
    const filename =
      String(file.path).split("/").pop() || String(file.path);
    const match = filename.match(/(\.[^.]+)$/);

    if (match) {
      const extension = match[1].toLowerCase();
      extensionCounts[extension] =
        (extensionCounts[extension] || 0) + 1;
    }
  }

  const topLevelEntries = entries
    .filter((item: any) => !String(item.path).includes("/"))
    .map((item: any) => ({
      name: item.path,
      type: item.type,
      size: item.size || 0,
    }))
    .sort((a: any, b: any) => {
      if (a.type !== b.type) return a.type === "tree" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

  const stack = detectStack(
    files.map((file: any) => String(file.path)),
    repository.language,
    packageJson
  );

  const architecture = architecturalSummary(
    stack,
    files.map((file: any) => String(file.path)),
    packageJson
  );

  const health = scoreHealth({
    hasReadme,
    hasLicense,
    hasPackageManifest: Boolean(packageJson),
    hasLockfile: packageLock,
    hasTests,
    hasCi,
    hasSource,
    hasDocs,
    hasGitignore,
    readmeQuality: readmeInfo.quality,
    fileCount: files.length,
    folderCount: directories.length,
    outdatedCount: outdated.filter(
      (dependency) => dependency.status === "update available"
    ).length,
  });

  return {
    repository: {
      name: repository.name,
      fullName: repository.full_name,
      description: repository.description,
      htmlUrl: repository.html_url,
      defaultBranch: repository.default_branch,
      language: repository.language,
      stars: repository.stargazers_count,
      forks: repository.forks_count,
      openIssues: repository.open_issues_count,
      watchers: repository.watchers_count,
      sizeKb: repository.size,
      createdAt: repository.created_at,
      updatedAt: repository.updated_at,
      pushedAt: repository.pushed_at,
      topics: repository.topics || [],
      license: repository.license?.spdx_id || null,
      archived: repository.archived,
    },
    statistics: {
      files: files.length,
      folders: directories.length,
      totalEntries: files.length + directories.length,
    },
    languages: languageStats,
    extensions: Object.entries(extensionCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([extension, count]) => ({ extension, count })),
    topLevelEntries,
    tree: files.map((file: any) => ({
      path: file.path,
      type: file.type,
      size: file.size || 0,
    })),
    architectureTree: buildTree(files),
    architecture,
    dependencies,
    outdatedDependencies: outdated,
    packageManager: packageJson
      ? packageJson.packageManager || "npm"
      : requirements
        ? "pip"
        : "Not detected",
    packageScripts: packageJson?.scripts || {},
    readme: readme.slice(0, 60000),
    readmeIntelligence: readmeInfo,
    health,
    analyzedAt: new Date().toISOString(),
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (Array.isArray(body?.urls)) {
      const urls = body.urls
        .filter((url: unknown) => typeof url === "string" && url.trim())
        .slice(0, 2);

      if (urls.length !== 2) {
        return NextResponse.json(
          { error: "Provide exactly two GitHub repository URLs for comparison." },
          { status: 400 }
        );
      }

      const contexts = urls.map(parseGitHubUrl);
      const results = await Promise.all(
        contexts.map((context) => analyzeRepository(context))
      );

      return NextResponse.json({
        mode: "compare",
        repositories: results,
        analyzedAt: new Date().toISOString(),
      });
    }

    if (!body?.url) {
      return NextResponse.json(
        { error: "Repository URL is required." },
        { status: 400 }
      );
    }

    const context = parseGitHubUrl(body.url);
    const result = await analyzeRepository(context);

    return NextResponse.json({
      mode: "single",
      ...result,
    });
  } catch (error) {
    console.error("Repository analysis error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to analyze repository.",
      },
      { status: 500 }
    );
  }
}
