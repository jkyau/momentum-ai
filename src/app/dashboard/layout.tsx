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
        <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
} 