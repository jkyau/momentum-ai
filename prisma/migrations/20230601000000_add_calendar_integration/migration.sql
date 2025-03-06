-- AlterTable
ALTER TABLE "Task" ADD COLUMN "addToCalendar" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "UserIntegration" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "tokenExpiry" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "defaultCalendarId" TEXT DEFAULT 'primary',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskCalendarEvent" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "calendarId" TEXT NOT NULL,
    "calendarEventId" TEXT NOT NULL,
    "eventTime" TEXT,
    "eventDuration" INTEGER,
    "reminderMinutes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskCalendarEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserIntegration_userId_provider_key" ON "UserIntegration"("userId", "provider");

-- CreateIndex
CREATE INDEX "UserIntegration_userId_idx" ON "UserIntegration"("userId");

-- CreateIndex
CREATE INDEX "UserIntegration_provider_idx" ON "UserIntegration"("provider");

-- CreateIndex
CREATE INDEX "TaskCalendarEvent_taskId_idx" ON "TaskCalendarEvent"("taskId");

-- AddForeignKey
ALTER TABLE "TaskCalendarEvent" ADD CONSTRAINT "TaskCalendarEvent_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE; 