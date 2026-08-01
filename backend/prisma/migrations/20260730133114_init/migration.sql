-- CreateEnum
CREATE TYPE "ExportEntityTypeDb" AS ENUM ('leads', 'contacts', 'companies');

-- CreateEnum
CREATE TYPE "ExportJobStatusDb" AS ENUM ('pending', 'processing', 'completed', 'failed', 'cancelled');

-- CreateTable
CREATE TABLE "amo_accounts" (
    "id" SERIAL NOT NULL,
    "accountId" BIGINT NOT NULL,
    "subdomain" TEXT NOT NULL,
    "clientUuid" TEXT NOT NULL,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "amo_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "amo_oauth_tokens" (
    "id" SERIAL NOT NULL,
    "accountId" INTEGER NOT NULL,
    "accessTokenCipher" TEXT NOT NULL,
    "refreshTokenCipher" TEXT NOT NULL,
    "tokenType" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "amo_oauth_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "export_jobs" (
    "id" TEXT NOT NULL,
    "accountId" INTEGER NOT NULL,
    "entityType" "ExportEntityTypeDb" NOT NULL,
    "status" "ExportJobStatusDb" NOT NULL DEFAULT 'pending',
    "requestPayload" JSONB NOT NULL,
    "processed" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL DEFAULT 0,
    "stage" TEXT NOT NULL DEFAULT 'fetching',
    "fileName" TEXT,
    "filePath" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "export_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "amo_accounts_accountId_key" ON "amo_accounts"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "amo_oauth_tokens_accountId_key" ON "amo_oauth_tokens"("accountId");

-- CreateIndex
CREATE INDEX "export_jobs_accountId_status_idx" ON "export_jobs"("accountId", "status");

-- AddForeignKey
ALTER TABLE "amo_oauth_tokens" ADD CONSTRAINT "amo_oauth_tokens_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "amo_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "export_jobs" ADD CONSTRAINT "export_jobs_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "amo_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
