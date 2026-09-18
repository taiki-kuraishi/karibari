// Unix seconds, matching the `exp` unit used by signed URLs.
export const nowSeconds = (): number => Math.floor(Date.now() / 1000);
