import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Suspense } from 'react'
import './globals.css'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AssistantProvider, AssistantWidget } from '@/components/assistant/AssistantWidget'

const geistSans = Geist({ variable: '--font-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Lofty AI Copilot',
  description: 'AI-first real estate operating system for agents',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full`}>
      <body className="h-full antialiased">
        <TooltipProvider>
          <AssistantProvider>
            {children}
            <Suspense fallback={null}>
              <AssistantWidget />
            </Suspense>
          </AssistantProvider>
        </TooltipProvider>
      </body>
    </html>
  )
}
