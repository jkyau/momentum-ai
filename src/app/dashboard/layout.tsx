import { UserButton } from "@clerk/nextjs";
import { Sidebar } from "@/components/Sidebar";
import { UserInitializer } from "@/components/UserInitializer";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex h-screen overflow-hidden">
      <UserInitializer />
      <Sidebar />
      <div className="flex flex-col flex-1 w-full">
        <header className="h-16 border-b flex items-center justify-between px-6 bg-background z-10">
          <h1 className="text-xl font-semibold md:hidden">Momentum</h1>
          <div className="ml-auto">
            <UserButton afterSignOutUrl="/" />
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
} 