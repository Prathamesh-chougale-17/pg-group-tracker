import "./globals.css"
import type { Metadata, Viewport } from "next"
import { ThemeProvider } from "@/components/theme-provider"
import { Providers } from "@/components/providers"
import { PwaRegister } from "@/components/pwa-register"

export const metadata: Metadata = {
  title: "PG Group Tracker",
  description: "Sunbeam PGCP student group assignment tracker",
  applicationName: "PG Group Tracker",
  icons: {
    icon: "/pwa-icon-192.png",
    apple: "/pwa-icon-192.png",
  },
  appleWebApp: {
    capable: true,
    title: "PG Tracker",
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false },
}

export const viewport: Viewport = {
  themeColor: "#7e22ce",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="font-sans antialiased">
      <body>
        <ThemeProvider>
          <Providers>{children}</Providers>
          <PwaRegister />
        </ThemeProvider>
      </body>
    </html>
  )
}
