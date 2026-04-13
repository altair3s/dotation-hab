import { Outlet } from 'react-router-dom'
import TopBar from './TopBar'

export default function Layout() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <TopBar />
      <main className="flex-1 max-w-screen-xl mx-auto w-full px-5 py-6">
        <Outlet />
      </main>
    </div>
  )
}
