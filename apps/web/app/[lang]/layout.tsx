import type { Metadata, Viewport } from "next";
import "@workspace/ui/globals.css";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@workspace/ui/components/sonner";
import { TooltipProvider } from "@workspace/ui/components/tooltip";
import { getDictionary, Lang, Locales, preloadDictionary } from "@workspace/i8n";

const inter = Inter({
  variable: '--font-sans',
  subsets: ['latin']
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata({ params }: { params: Promise<{ lang: Lang }> }): Promise<Metadata> {
    const { lang } = await params
    const dict = await getDictionary(lang)

    return {
        applicationName: dict.metadata.title,
        referrer: "origin-when-cross-origin",
        // keywords: dict.metadata.keywords.split(', ').map(k => k.trim()),
        title: {
            template: '%s',
            default: dict.metadata.title,
        },
        description: dict.metadata.description,
        metadataBase: new URL(process.env.APP_URL || 'http://localhost:3000'),
        manifest: `/manifest.webmanifest`,
        icons: {
        icon: '/favicon.ico',
        shortcut: '/icon.png',
        apple: '/apple-icon.png',
        },
        alternates: {
        canonical: "/",
        languages: Locales.reduce((acc, locale) => {
            acc[`${locale}`] = `/${locale}/`
            return acc
        }, {} as Record<string, string>)
        },
        twitter: {
        card: 'summary_large_image',
        title: dict.metadata.title,
        description: dict.metadata.description,
        },
        openGraph: {
        title: dict.metadata.title,
        description: dict.metadata.description,
        url: '/',
        siteName: dict.metadata.title,
        // images: [
        //   {
        //     url: '/opengraph-image.png',
        //     width: 1200,
        //     height: 630,
        //     alt: dict.metadata.title,
        //   },
        // ],
        locale: lang,
        type: 'website',
        },
        robots: {
        index: true,
        follow: true,
        nocache: false,
        googleBot: {
            index: true,
            follow: true,
            noimageindex: false,
            'max-video-preview': -1,
            'max-image-preview': 'large',
            'max-snippet': -1
        }
        },
        appleWebApp: {
        title: dict.metadata.title,
        statusBarStyle: 'black-translucent',
        capable: true,
        // startupImage: [
        //   '/public/apple-splash-750-1334.jpg',
        //   {
        //     media: '(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)',
        //     url: '/public/apple-splash-750-1334.jpg'
        //   }
        // ]
        }
    }
}

export const viewport: Viewport = {
    themeColor: [
        { media: "(prefers-color-scheme: light)", color: "#fafafa" },
        { media: "(prefers-color-scheme: dark)", color: "#171717" },
    ],
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    colorScheme: "light dark",
};

export async function generateStaticParams() {
    return Locales.map((lang) => ({ lang }));
}

export default async function RootLayout({
    children,
    params,
}: Readonly<{
    children: React.ReactNode
    params: Promise<{ lang: string }>
}>) {
    const { lang } = await params;
    preloadDictionary(lang as Lang);

    return (
        <html lang={lang} className={inter.variable}>
            <body
                className={`${geistSans.variable} ${geistMono.variable} antialiased bg-card w-full min-h-screen relative`}
            >
                <ThemeProvider
                    attribute="class"
                    defaultTheme="system"
                    enableSystem
                    disableTransitionOnChange
                    storageKey="theme"
                >
                    <TooltipProvider>
                        {children}
                    </TooltipProvider>
                    <Toaster
                        position="top-right"
                        richColors
                        closeButton
                    />
                </ThemeProvider>
            </body>
        </html>
    );
}