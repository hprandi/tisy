#!/usr/bin/env bash
set -e

# Garante que o script roda a partir da pasta backend/, não importa de onde foi chamado
cd "$(dirname "$0")"

DB_NAME="ingressos"

echo "Subindo banco local (Prisma Postgres)..."
npx prisma dev start "$DB_NAME" 2>/dev/null || npx prisma dev --name "$DB_NAME" --detach

echo "Atualizando Prisma Client a partir do schema atual..."
npx prisma generate

echo "Aplicando migrações pendentes..."
npx prisma migrate deploy

# Para o banco junto quando o servidor for encerrado (Ctrl+C)
trap "npx prisma dev stop $DB_NAME" EXIT

echo "Subindo o servidor NestJS..."
npm run start:dev
