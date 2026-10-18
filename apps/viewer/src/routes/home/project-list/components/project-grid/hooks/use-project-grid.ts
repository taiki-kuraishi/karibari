import {
  useCommentsQuery,
  useScreensQuery,
  useSharesQuery,
  useVersionsQuery,
} from "@karibari/api-query";

import { apiClient } from "@/lib/api-client";

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
  // Versions arrive in submission order, so each project's last one is its latest.
  const latestByProject = new Map(
    (versionsData?.versions ?? []).map((version) => [version.project_id, version]),
  );
  const latestVersionIds = [...latestByProject.values()].map((version) => version.id);
  const { data: screensData } = useScreensQuery(latestVersionIds, {
    enabled: latestVersionIds.length > 0,
  });

  if (versionsData === undefined || commentsData === undefined || sharesData === undefined) {
    return { status: "loading" as const };
  }

  // The batch routes never answer 404 to a signed-in visitor; a lost session is the auth gate's job.
  if (versionsData === null || commentsData === null || sharesData === null) {
    return { status: "hidden" as const };
  }
  const cards = projects.map((project) => {
    const versions = versionsData.versions.filter((version) => version.project_id === project.id);
    const latest = latestByProject.get(project.id);
    // Screens arrive in submission order, so the first one of the latest version is the cover.
    const cover = screensData?.screens.find((screen) => screen.version_id === latest?.id);

    return {
      commentCount: commentsData.comments.filter((comment) => comment.project_id === project.id)
        .length,
      cover: cover && {
        contentUrl: apiClient.api.projects[":project_id"].versions[":version_id"].screens[
          ":screen_id"
        ].content
          .$url({
            param: { project_id: project.id, screen_id: cover.id, version_id: cover.version_id },
          })
          .toString(),
        height: cover.height,
        width: cover.width,
      },
      displayName: project.name ?? "無題",
      id: project.id,
      shareCount: sharesData.shares.filter((share) => share.project_id === project.id).length,
      type: latest?.type,
      updatedAt: new Date(project.updated_at * 1000).toLocaleString("ja-JP"),
      updatedLabel: formatRelative(project.updated_at),
      versionCount: versions.length,
    };
  });

  return { cards, status: "list" as const };
}
