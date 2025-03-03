import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }

    // Check if user exists in the database
    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { exists: false },
        { status: 404 }
      );
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("[USER_GET]", error);
    return NextResponse.json(
      { message: "Failed to fetch user", error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { id: userId },
    });

    if (existingUser) {
      return NextResponse.json(existingUser);
    }

    // Create new user
    const newUser = await db.user.create({
      data: {
        id: userId,
        name: "User",
        email: `${userId}@example.com`, // Placeholder email
      },
    });

    return NextResponse.json(newUser);
  } catch (error) {
    console.error("[USER_CREATE]", error);
    return NextResponse.json(
      { message: "Failed to create user", error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 