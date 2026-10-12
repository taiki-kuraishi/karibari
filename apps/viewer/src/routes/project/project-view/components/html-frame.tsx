export function HtmlFrame({ contentUrl, title }: { contentUrl: string; title: string }) {
  return (
    <iframe className="w-full flex-1" sandbox="allow-scripts" src={contentUrl} title={title} />
  );
}
