# PostgreSQL Migration Guide - Phase B (1 Week)
**Botta e Risposta - Edge Node System #1**

## Prerequisites

### 1. Install PostgreSQL
1. Download PostgreSQL 16.x for Windows from: https://www.postgresql.org/download/windows/
2. Run installer with default settings
3. Set PostgreSQL password (remember this!)
4. Default port: 5432

### 2. Install Node.js PostgreSQL Driver
```powershell
cd 's:\Edge Node system #1'
npm install pg
```

---

## Phase B Timeline (1 Week)

### Day 1-2: Setup & Schema Design ✅

#### Day 1 Morning: Install PostgreSQL
1. Download and install PostgreSQL
2. Verify installation:
```powershell
psql --version
```

#### Day 1 Afternoon: Create Database
```powershell
# Connect to PostgreSQL
psql -U postgres

# In psql console:
CREATE DATABASE botta_risposta;
CREATE USER botta_user WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE botta_risposta TO botta_user;
\q
```

#### Day 2 Morning: Create Schema
```powershell
# Run schema creation
cd 's:\Edge Node system #1'
psql -U botta_user -d botta_risposta -f migration\schema.sql
```

#### Day 2 Afternoon: Verify Schema
```powershell
# Connect and verify
psql -U botta_user -d botta_risposta

# In psql:
\dt                           # List tables
\d messages                   # Describe messages table
SELECT tablename FROM pg_tables WHERE schemaname='public';
\q
```

---

### Day 3-4: Code Refactoring & Unit Tests

#### Day 3: Refactor ChatManager
1. Back up current code:
```powershell
Copy-Item rami\chat\manager.js rami\chat\manager.js.backup
```

2. Create new PostgreSQL-based ChatManager (see implementation below)

3. Install dependencies:
```powershell
npm install pg
```

#### Day 4: Create Unit Tests
Create test files to verify each database operation works correctly.

---

### Day 5: Data Migration & Integration Tests

#### Backup Current Data
```powershell
# Create backup
Copy-Item chat-data.json chat-data.json.backup
```

#### Set Environment Variables
Create `.env` file:
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=botta_risposta
DB_USER=botta_user
DB_PASSWORD=your_secure_password
```

Install dotenv:
```powershell
npm install dotenv
```

#### Run Migration Script
```powershell
node migration\migrate-data.js
```

Expected output:
```
🚀 Starting migration...
✅ Loaded chat-data.json
📊 Migrating users...
   ✓ Migrated X users
📊 Migrating jobs...
   ✓ Migrated X jobs
...
✅ Migration completed successfully!
```

#### Verify Migration
```powershell
psql -U botta_user -d botta_risposta

# Check counts
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM messages;
SELECT COUNT(*) FROM messages WHERE is_problem = true;
\q
```

---

### Day 6: User Acceptance Testing

#### Update Server Configuration
1. Update `server.js` to use environment variables
2. Test all features:
   - Login
   - Send messages
   - Create questions
   - Answer questions
   - Create jobs/subcategories/chats
   - Delete operations
   - Clear messages

#### Test Checklist
- [ ] User login works
- [ ] Messages send and appear in real-time
- [ ] Questions create with red border
- [ ] Question selection (yellow highlight) works
- [ ] Answers save and display correctly
- [ ] Job creation works
- [ ] Subcategory creation works
- [ ] Individual chat creation works
- [ ] Delete operations work
- [ ] Clear preserves questions
- [ ] Multiple users can connect simultaneously
- [ ] Performance is acceptable (< 50ms queries)

---

### Day 7: Production Deployment & Monitoring

#### Pre-Deployment Checklist
- [ ] All tests passing
- [ ] Backup of JSON data created
- [ ] Environment variables configured
- [ ] PostgreSQL service running
- [ ] Database connection pooling working

#### Deployment Steps

1. **Stop current server:**
```powershell
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
```

2. **Update code to use PostgreSQL** (see refactored ChatManager below)

3. **Start server with environment variables:**
```powershell
cd 's:\Edge Node system #1'
node server.js
```

4. **Monitor logs:**
Watch for:
- PostgreSQL connection confirmation
- Any database errors
- Query performance warnings

5. **Test critical paths:**
- Login → Create Question → Answer → Verify

#### Rollback Plan (If Needed)
```powershell
# Stop server
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

# Restore backup code
Copy-Item rami\chat\manager.js.backup rami\chat\manager.js -Force

# Restore JSON data
Copy-Item chat-data.json.backup chat-data.json -Force

# Restart
node server.js
```

---

## Monitoring & Maintenance

### Daily Checks (First Week After Migration)
```powershell
# Check PostgreSQL status
Get-Service postgresql*

# Check database size
psql -U botta_user -d botta_risposta -c "SELECT pg_size_pretty(pg_database_size('botta_risposta'));"

# Check connection count
psql -U botta_user -d botta_risposta -c "SELECT count(*) FROM pg_stat_activity WHERE datname='botta_risposta';"
```

### Weekly Backup
```powershell
# Backup database
pg_dump -U botta_user botta_risposta > backups\botta_risposta_$(Get-Date -Format 'yyyyMMdd').sql
```

### Performance Monitoring
```sql
-- Slow queries
SELECT query, mean_exec_time, calls 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;

-- Table sizes
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## Troubleshooting

### Connection Errors
**Problem:** "Connection refused" or "ECONNREFUSED"
**Solution:**
```powershell
# Check if PostgreSQL is running
Get-Service postgresql*

# Start if stopped
Start-Service postgresql-x64-16  # Adjust version number
```

### Authentication Errors
**Problem:** "password authentication failed"
**Solution:**
- Verify `.env` file has correct password
- Check `pg_hba.conf` allows local connections
- Reset password if needed

### Migration Errors
**Problem:** Foreign key violations
**Solution:**
- Check data integrity in JSON file
- Ensure all referenced jobs/users exist
- Run migration script with verbose logging

### Performance Issues
**Problem:** Slow queries
**Solution:**
```sql
-- Analyze tables
ANALYZE users;
ANALYZE jobs;
ANALYZE messages;

-- Rebuild indexes
REINDEX DATABASE botta_risposta;
```

---

## Success Criteria

Migration is successful when:
- ✅ All data migrated without loss
- ✅ All features working as before
- ✅ Query performance < 50ms
- ✅ Multiple concurrent users supported
- ✅ No errors in logs for 24 hours
- ✅ Backup and restore tested

---

## Next Steps After Migration

1. **Remove JSON dependency** (Week 2)
2. **Implement full-text search** (Week 3)
3. **Add database monitoring dashboard** (Week 4)
4. **Set up automated backups** (Week 4)
5. **Optimize indexes based on usage** (Ongoing)

---

**Need Help?**
- PostgreSQL Documentation: https://www.postgresql.org/docs/
- Node.js pg library: https://node-postgres.com/
- Migration support: Check POSTGRESQL-MIGRATION-AUDIT.md
