import { getDictionary, Lang } from "@workspace/i8n";

type PageProps = {
  params: Promise<{ lang: string }>;
};

export default async function Page({
  params
}: PageProps) {
  const { lang } = await params;
  const dict = await getDictionary(lang as Lang);

  return (
    <div className="p-4">
        <span className="mt-2 text-sm">{dict.language}</span>
        <h1 className="font-bold text-2xl">{dict.metadata.title}</h1>
        <p className="mt-2">{dict.metadata.description}</p>
    </div>
  )
}