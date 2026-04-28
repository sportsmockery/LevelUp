import type { Metadata } from 'next';

const title = 'WSB: Client to Leader in 30 Days';
const description =
  'Jason and Genesis Beninato are opening the door for a select group to become licensed leaders inside World System Builders — get licensed, learn the business, and serve families with mentorship from people who live it every day.';
const ogImage = 'https://www.levelupwrestlingapp.com/images/wsb-financial-literacy.jpg';

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  openGraph: {
    title,
    description,
    type: 'website',
    images: [
      {
        url: ogImage,
        width: 1600,
        height: 1200,
        alt: 'Jason and Genesis Beninato at the National Financial Literacy Campaign',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
    images: [ogImage],
  },
};

export default function WSBLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
