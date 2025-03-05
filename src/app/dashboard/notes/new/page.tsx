import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { FullPageEditor } from "@/components/notes/FullPageEditor";

export default async function NewNotePage() {
  const { userId } = await auth();
  
  if (!userId) {
    redirect("/sign-in");
  }
  
  return <FullPageEditor />;
} 