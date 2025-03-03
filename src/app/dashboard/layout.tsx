import { UserButton } from "@clerk/nextjs";
import { Sidebar } from "@/components/Sidebar";
import { UserInitializer } from "@/components/UserInitializer";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex h-screen">
      <UserInitializer />
      <Sidebar />
      <div className="flex flex-col flex-1">
        <header className="h-16 border-b flex items-center justify-between px-6">
          <h1 className="text-xl font-semibold">Momentum</h1>
          <UserButton afterSignOutUrl="/" />
        </header>
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
} 