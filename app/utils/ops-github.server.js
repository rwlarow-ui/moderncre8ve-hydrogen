export async function loadOpsGitHub(env) {
  if (!env.OPS_GITHUB_READ_TOKEN) return { connected: false };
  const get = async (path) => {
    const response = await fetch(
      `https://api.github.com/repos/rwlarow-ui/moderncre8ve-hydrogen/${path}`,
      {
        headers: {
          Authorization: `Bearer ${env.OPS_GITHUB_READ_TOKEN}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "User-Agent": "ModernCre8ve-Ops",
        },
        cache: "no-store",
      },
    );
    if (!response.ok) throw new Error("GitHub is temporarily unavailable.");
    return response.json();
  };
  const [issues, runs] = await Promise.allSettled([
    get("issues?state=open&per_page=30"),
    get("actions/runs?branch=main&per_page=1"),
  ]);
  return {
    connected: true,
    fetchedAt: new Date().toISOString(),
    issues:
      issues.status === "fulfilled"
        ? issues.value
            .filter((item) => !item.pull_request)
            .map((item) => ({
              number: item.number,
              title: item.title,
              url: item.html_url,
            }))
        : null,
    run:
      runs.status === "fulfilled" && runs.value.workflow_runs?.[0]
        ? {
            status: runs.value.workflow_runs[0].status,
            conclusion: runs.value.workflow_runs[0].conclusion,
            url: runs.value.workflow_runs[0].html_url,
            updatedAt: runs.value.workflow_runs[0].updated_at,
          }
        : null,
  };
}
