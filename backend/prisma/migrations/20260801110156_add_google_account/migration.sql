-- CreateTable
CREATE TABLE "google_accounts" (
    "id" SERIAL NOT NULL,
    "accountId" INTEGER NOT NULL,
    "googleEmail" TEXT NOT NULL,
    "refreshTokenEncrypted" TEXT NOT NULL,
    "accessTokenEncrypted" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "google_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "google_accounts_accountId_key" ON "google_accounts"("accountId");

-- AddForeignKey
ALTER TABLE "google_accounts" ADD CONSTRAINT "google_accounts_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "amo_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
