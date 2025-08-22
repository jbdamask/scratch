#!/usr/bin/env python3

import sys
from sqlalchemy import text
from database import engine

def migrate_invoice_status():
    """Add status column to existing invoices table and set default values."""
    
    try:
        # Add the status column with default value
        with engine.connect() as connection:
            # Try to add the column - this will fail if column already exists, which is fine
            try:
                connection.execute(text('ALTER TABLE invoices ADD COLUMN status VARCHAR DEFAULT "submitted"'))
                print('✅ Added status column to invoices table')
            except Exception as e:
                if 'duplicate column name' in str(e).lower():
                    print('✅ Status column already exists')
                else:
                    raise e
            
            # Update any NULL status values to 'submitted'
            result = connection.execute(text('UPDATE invoices SET status = "submitted" WHERE status IS NULL OR status = ""'))
            connection.commit()
            print(f'✅ Updated {result.rowcount} invoices with default status "submitted"')
            
            # Show all invoices and their status
            result = connection.execute(text('SELECT id, invoice_number, status FROM invoices'))
            invoices = result.fetchall()
            
            print(f'\n📊 Total invoices: {len(invoices)}')
            for inv in invoices:
                print(f'   Invoice #{inv[1]} (ID: {inv[0]}) -> status: {inv[2]}')
                
        print(f'\n🎉 Migration completed successfully!')
        return True
        
    except Exception as e:
        print(f'❌ Error during migration: {e}')
        return False

if __name__ == "__main__":
    success = migrate_invoice_status()
    sys.exit(0 if success else 1)