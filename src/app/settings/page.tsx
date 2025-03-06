"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarIntegration } from "@/components/settings/CalendarIntegration";
import { Calendar, User } from "lucide-react";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("profile");
  
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="profile" className="flex items-center">
            <User className="h-4 w-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="integrations" className="flex items-center">
            <Calendar className="h-4 w-4 mr-2" />
            Integrations
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="profile" className="space-y-6">
          <div className="rounded-lg border p-6">
            <h2 className="text-xl font-semibold mb-4">Profile Settings</h2>
            <p className="text-muted-foreground">
              Manage your profile settings and preferences.
            </p>
            {/* Profile settings content would go here */}
          </div>
        </TabsContent>
        
        <TabsContent value="integrations" className="space-y-6">
          <div className="rounded-lg border p-6">
            <h2 className="text-xl font-semibold mb-4">Integrations</h2>
            <p className="text-muted-foreground mb-6">
              Connect Momentum with your favorite tools and services.
            </p>
            
            <CalendarIntegration />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
} 