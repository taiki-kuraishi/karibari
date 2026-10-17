// One key format for every route: submission writes, content reads and project delete clears it.
export const projectHtmlPrefix = (projectId: string) => `projects/${projectId}/`;

export const screenHtmlKey = (args: { projectId: string; screenId: string; versionId: string }) =>
  `${projectHtmlPrefix(args.projectId)}versions/${args.versionId}/screens/${args.screenId}.html`;
