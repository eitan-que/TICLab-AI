import { getDictionary, Lang } from "@workspace/i8n";

type PageProps = {
    params: Promise<{ 
        lang: string; 
        categorySlug: string;
        postSlug: string;
    }>;
};

export default async function Page({
  params
}: PageProps) {
  const { lang, categorySlug, postSlug } = await params;
  const dict = await getDictionary(lang as Lang);
  console.log("Language:", dict.language);
  console.log("Category Slug:", categorySlug);
  console.log("Post Slug:", postSlug);
  const { default: Post } = await import(`@/content/${postSlug}.mdx`)

  return (
    <Post />
  )
}