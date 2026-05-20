import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title:       'صندوق أكناف القربى | عائلة البادي',
  description: 'منصة لإدارة صندوق العائلة: جمع الدفعات، متابعة الأخبار، وتقديم طلبات المعونات.',
  themeColor:  '#0b2135',
  icons: {
    icon:    [{ url: '/brand/favicon.png', type: 'image/png' }],
    apple:   '/brand/favicon.png',
    shortcut: '/brand/favicon.png',
  },
  openGraph: {
    title:       'صندوق أكناف القربى - عائلة البادي',
    description: 'منصة عائلة البادي لجمع الدفعات ومتابعة الأخبار وطلبات المعونات',
    images:      ['/brand/logo.png'],
    locale:      'ar_SA',
    type:        'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&family=Tajawal:wght@300;400;500;700;800;900&family=Amiri:wght@400;700&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
