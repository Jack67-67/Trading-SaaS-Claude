import type { Metadata } from "next";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { ToastProvider } from "@/components/ui/toast";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ToastProvider>
      <div className="min-h-screen flex">
        <Sidebar />

        <div className="flex-1 ml-60 flex flex-col min-h-screen transition-[margin] duration-200">
          <TopBar />
          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    </ToastProvider>
  );
}
