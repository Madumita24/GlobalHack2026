import GlobalNav from '@/components/layout/GlobalNav'
import Sidebar from '@/components/layout/Sidebar'
import TopHeader from '@/components/layout/TopHeader'
import { agentProfile } from '@/lib/mock-data'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-screen bg-[#F8FAFC] overflow-hidden">
      {/* Top Lofty navigation bar */}
      <GlobalNav />

      {/* Below nav: sidebar + content */}
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <TopHeader agentName={agentProfile.name} />
          <div className="flex flex-1 min-h-0">{children}</div>
        </div>
      </div>
    </div>
  )
}
