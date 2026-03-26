import Negotiator from "negotiator";
import { match } from "@formatjs/intl-localematcher";
import { Lang, Locales } from "@workspace/i8n";
import { NextResponse, NextRequest } from "next/server";

function getLocale(request: NextRequest): string {
  const defaultLocale = "en-US";

  // 1. Use Negotiator to get the best match from browser's accept-language
  const headers = { "accept-language": request.headers.get("accept-language") || "" };
  const languages = new Negotiator({ headers }).languages();

  try {
    const matched = match(languages, Locales, defaultLocale);
    if (Locales.includes(matched as Lang)) {
      return matched;
    }
  } catch (error) {
    // If match fails, fall through to default
    console.error("Locale matching error:", error);
  }

  // 2. Fall back to default locale
  return defaultLocale;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if there is any supported locale in the pathname
  const pathnameHasLocale = Locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`,
  );

  // If no locale, redirect with locale
  if (!pathnameHasLocale) {
    const locale = getLocale(request);
    request.nextUrl.pathname = `/${locale}${pathname}`;
    // Don't save locale to cookie - only save when user manually changes it
    return NextResponse.redirect(request.nextUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api|manifest.webmanifest|sitemap.xml|opengraph-image.*|twitter-image.*|apple-icon.*\\.(?:jpg|jpeg|png)|icon.*\\.(?:ico|jpg|jpeg|png|svg)).*)",
  ],
};
