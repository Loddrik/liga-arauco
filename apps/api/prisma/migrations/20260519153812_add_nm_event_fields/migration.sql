-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "nm_event_id" TEXT,
ADD COLUMN     "nm_event_slug" TEXT,
ADD COLUMN     "nm_synced_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Match_nm_event_id_idx" ON "Match"("nm_event_id");
