import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '麻雀点数計算機',
  description: '麻雀の点数を計算するアプリケーション',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  )
}
