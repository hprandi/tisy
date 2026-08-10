/*
  Warnings:

  - Made the column `salesStartAt` on table `ticket_tiers` required. This step will fail if there are existing NULL values in that column.
  - Made the column `salesEndAt` on table `ticket_tiers` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "ticket_tiers" ALTER COLUMN "salesStartAt" SET NOT NULL,
ALTER COLUMN "salesEndAt" SET NOT NULL;
