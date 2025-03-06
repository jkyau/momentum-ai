#!/bin/sh
echo "Waiting for database to be ready..."
while ! nc -z momentum-momentum-db-1 5432; do
  echo "Database not ready yet..."
  sleep 1
done
echo "Database is ready!"

echo "Checking if tables exist..."
export PGPASSWORD=postgres
TABLE_COUNT=$(psql -h momentum-momentum-db-1 -U postgres -d momentum -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name NOT IN ('_prisma_migrations')" | xargs)

echo "Table count: $TABLE_COUNT"

if [ "$TABLE_COUNT" -eq "0" ]; then
  echo "No tables found. Running custom migration..."
  psql -h momentum-momentum-db-1 -U postgres -d momentum -f /app/prisma/migrations/20250306_init_schema/migration.sql
  
  # Mark all migrations as applied in _prisma_migrations table
  echo "Marking migrations as applied..."
  psql -h momentum-momentum-db-1 -U postgres -d momentum -c "INSERT INTO _prisma_migrations (id, migration_name, logs, started_at, applied_steps_count, finished_at) VALUES ('$(uuidgen)', '20250306_init_schema', 'Applied manually', NOW(), 1, NOW())"
  psql -h momentum-momentum-db-1 -U postgres -d momentum -c "INSERT INTO _prisma_migrations (id, migration_name, logs, started_at, applied_steps_count, finished_at) VALUES ('$(uuidgen)', '20230601000000_add_calendar_integration', 'Applied manually', NOW(), 1, NOW())"
  psql -h momentum-momentum-db-1 -U postgres -d momentum -c "INSERT INTO _prisma_migrations (id, migration_name, logs, started_at, applied_steps_count, finished_at) VALUES ('$(uuidgen)', '20250303213427_add_model_provider_to_chat_logs', 'Applied manually', NOW(), 1, NOW())"
  psql -h momentum-momentum-db-1 -U postgres -d momentum -c "INSERT INTO _prisma_migrations (id, migration_name, logs, started_at, applied_steps_count, finished_at) VALUES ('$(uuidgen)', '20250303082247_add_notes', 'Applied manually', NOW(), 1, NOW())"
else
  echo "Tables already exist. Skipping migrations."
fi

echo "Starting application..."
npm start 