import { useCommentsQuery, useSharesQuery, useVersionsQuery } from "@karibari/api-query";

const relativeTime = new Intl.RelativeTimeFormat("ja", { numeric: "auto" });
const units = [
  { seconds: 60 * 60 * 24 * 365, unit: "year" },
  { seconds: 60 * 60 * 24 * 30, unit: "month" },
  { seconds: 60 * 60 * 24, unit: "day" },
  { seconds: 60 * 60, unit: "hour" },
  { seconds: 60, unit: "minute" },
] as const;

const formatRelative = (epochSeconds: number) => {
  const elapsed = epochSeconds - Date.now() / 1000;
  const match = units.find(({ seconds }) => Math.abs(elapsed) >= seconds);

  if (match === undefined) {
    return relativeTime.format(0, "minute");
  }

  return relativeTime.format(Math.round(elapsed / match.seconds), match.unit);
};

export function useProjectGrid({
  projects,
}: {
  projects: { id: string; name: string | null; updated_at: number }[];
}) {
  const projectIds = projects.map((project) => project.id);
  const { data: versionsData } = useVersionsQuery(projectIds);
  const { data: commentsData } = useCommentsQuery(projectIds);
  const { data: sharesData } = useSharesQuery(projectIds);

  if (versionsData === undefined || commentsData === undefined || sharesData === undefined) {
    return { status: "loading" as const };
  }

  // The batch routes never answer 404 to a signed-in visitor; a lost session is the auth gate's job.
  if (versionsData === null || commentsData === null || sharesData === null) {
    return { status: "hidden" as const };
  }
  const cards = projects.map((project) => {
    const versions = versionsData.versions.filter((version) => version.project_id === project.id);

    return {
      commentCount: commentsData.comments.filter((comment) => comment.project_id === project.id)
        .length,
      displayName: project.name ?? "無題",
      id: project.id,
      shareCount: sharesData.shares.filter((share) => share.project_id === project.id).length,
      // Versions arrive in submission order, so the last one is the latest.
      type: versions.at(-1)?.type,
      updatedAt: new Date(project.updated_at * 1000).toLocaleString("ja-JP"),
      updatedLabel: formatRelative(project.updated_at),
      versionCount: versions.length,
    };
  });

  return { cards, status: "list" as const };
}
