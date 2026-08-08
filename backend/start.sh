#!/usr/bin/env bash
set -e

cd "$(dirname "$0")"

echo "Starting Postgres (Docker)"
docker compose up -d

echo "Waiting for Postgres to be ready..."
until docker compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; do
  sleep 1
done

echo "Start NestJS"
npm run start:dev
