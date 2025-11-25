@echo off
echo ========================================
echo Playbook Migration Script
echo ========================================
echo.
echo This script will add Playbook columns to the messages table.
echo.
echo Please enter your PostgreSQL password when prompted.
echo.

psql -U postgres -d botta_risposta -c "ALTER TABLE messages ADD COLUMN IF NOT EXISTS in_playbook BOOLEAN DEFAULT FALSE, ADD COLUMN IF NOT EXISTS playbook_notes TEXT, ADD COLUMN IF NOT EXISTS playbook_verified_by VARCHAR(50), ADD COLUMN IF NOT EXISTS playbook_verified_at TIMESTAMP;"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    psql -U postgres -d botta_risposta -c "CREATE INDEX IF NOT EXISTS idx_messages_in_playbook ON messages(in_playbook) WHERE in_playbook = TRUE;"
    
    if %ERRORLEVEL% EQU 0 (
        echo.
        echo ========================================
        echo Verifying migration...
        echo ========================================
        psql -U postgres -d botta_risposta -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'messages' AND column_name IN ('in_playbook', 'playbook_notes', 'playbook_verified_by', 'playbook_verified_at') ORDER BY column_name;"
        
        echo.
        echo ========================================
        echo Migration completed successfully!
        echo ========================================
        echo.
        echo Next steps:
        echo 1. Refresh your browser
        echo 2. Try the Playbook feature again
        echo.
    ) else (
        echo ERROR: Failed to create index
    )
) else (
    echo ERROR: Failed to add columns
)

pause
