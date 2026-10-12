-- AlterEnum
ALTER TYPE "TicketStatus" ADD VALUE 'READY';

-- AlterTable
ALTER TABLE "tickets" ADD COLUMN     "holderEmail" TEXT,
ADD COLUMN     "holderName" TEXT;
