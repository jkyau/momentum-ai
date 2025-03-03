"use client";

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";

export const UserInitializer = () => {
  const { user, isLoaded } = useUser();

  useEffect(() => {
    const createUserInDatabase = async () => {
      if (!user) return;

      try {
        // Check if user exists
        const checkResponse = await fetch("/api/user");
        
        if (checkResponse.status === 404) {
          // User doesn't exist, create them
          const createResponse = await fetch("/api/user", {
            method: "POST",
          });

          if (!createResponse.ok) {
            throw new Error("Failed to create user in database");
          }

          console.log("User created in database");
        }
      } catch (error) {
        console.error("Error initializing user:", error);
        toast.error("Failed to initialize user data. Some features may not work correctly.");
      }
    };

    if (isLoaded && user) {
      createUserInDatabase();
    }
  }, [isLoaded, user]);

  return null; // This component doesn't render anything
}; 