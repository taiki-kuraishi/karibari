// Both submission routes write and the content route reads this key, so they must not drift.
export const screenHtmlKey = (args: { projectId: string; screenId: string; versionId: string }) =>
  `projects/${args.projectId}/versions/${args.versionId}/screens/${args.screenId}.html`;
