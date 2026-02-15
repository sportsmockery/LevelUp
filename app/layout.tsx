import './globals.css';
import { Space_Grotesk, Plus_Jakarta_Sans } from 'next/font/google';
import { ThemeProvider } from 'next-themes';

const heading = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-heading',
  weight: ['600', '700'],
});
const body = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  weight: ['400', '500', '600'],
});

export const metadata = {
  title: 'LevelUp Wrestling',
  description: 'AI wrestling coach — video analysis, scoring, scouting, and training.',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${heading.variable} ${body.variable} bg-[#0A0A0A] text-white min-h-screen font-body`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
