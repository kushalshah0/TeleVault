import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/context/ThemeContext'
import { RecentFilesProvider } from '@/context/RecentFilesContext'
import { Toaster } from 'react-hot-toast'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'TeleVault - Telegram Cloud Storage',
  description: 'Secure file storage using Telegram channels',
  icons: {
    icon: '/favicon.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{
          __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme:dark)').matches))document.documentElement.classList.add('dark')}catch(e){}})()`
        }} />
      </head>
      <body className={inter.className}>
        <ThemeProvider>
          <RecentFilesProvider>
            {children}
          </RecentFilesProvider>
          <Toaster
            position="bottom-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: 'hsl(var(--card))',
                color: 'hsl(var(--card-foreground))',
                border: '1px solid hsl(var(--border))',
              },
              success: {
                style: {
                  background: 'hsl(var(--success) / 0.9)',
                  color: 'hsl(var(--success-foreground))',
                  border: '1px solid hsl(var(--success))',
                },
                iconTheme: {
                  primary: 'hsl(var(--success-foreground))',
                  secondary: 'hsl(var(--success))',
                },
              },
              error: {
                style: {
                  background: 'hsl(var(--destructive) / 0.9)',
                  color: 'hsl(var(--destructive-foreground))',
                  border: '1px solid hsl(var(--destructive))',
                },
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  )
}
