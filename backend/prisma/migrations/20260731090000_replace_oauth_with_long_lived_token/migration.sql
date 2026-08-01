-- Migrate authentication model from OAuth2 to the Kommo Private Integration
-- long-lived token: the token now lives only in backend env vars
-- (AMOCRM_LONG_LIVED_TOKEN), so there is nothing per-account left to persist.

-- DropForeignKey
ALTER TABLE "amo_oauth_tokens" DROP CONSTRAINT "amo_oauth_tokens_accountId_fkey";

-- DropTable
DROP TABLE "amo_oauth_tokens";

-- AlterTable
ALTER TABLE "amo_accounts" DROP COLUMN "clientUuid";
