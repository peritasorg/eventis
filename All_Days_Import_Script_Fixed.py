#!/usr/bin/env python3
"""
Fixed All Days Import Script for Supabase
Addresses all critical issues identified in the original script.
"""

import pandas as pd
import psycopg2
from psycopg2.extras import RealDictCursor
import json
import uuid
from datetime import datetime, date, time
import logging
from decimal import Decimal
import sys
import traceback

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('all_days_import.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Database configuration - FIXED: Correct Supabase region
DB_CONFIG = {
    'host': 'aws-0-eu-west-2.pooler.supabase.com',  # Fixed region
    'database': 'postgres',
    'user': 'postgres.vbowtpkisiabdwwgttry',
    'password': 'your_database_password_here',  # Update with actual password
    'port': '6543',
    'sslmode': 'require'
}

# Constants
TENANT_ID = 'e2a03656-036e-4041-a24e-c06e85747906'
NIKKAH_TEMPLATE_ID = 'cda42360-66d9-4f96-ba44-8618b15710de'
RECEPTION_TEMPLATE_ID = 'def554d7-b2a0-4e4b-afb5-b7b3380d4da5'

def safe_string(value):
    """Safely convert value to string, handling floats and NaN."""
    if pd.isna(value) or value is None:
        return ""
    if isinstance(value, (int, float)):
        if pd.isna(value):
            return ""
        return str(value)
    if hasattr(value, 'strip'):
        return str(value).strip()
    return str(value)

def safe_int(value, default=0):
    """Safely convert value to integer, handling NaN and invalid values."""
    try:
        if pd.isna(value) or value is None or value == '':
            return default
        if isinstance(value, str):
            value = value.strip()
            if value == '' or value.lower() in ['nan', 'none']:
                return default
        return int(float(value))
    except (ValueError, TypeError):
        logger.warning(f"Could not convert '{value}' to integer, using default {default}")
        return default

def safe_decimal(value, default=0.0):
    """Safely convert value to Decimal, handling NaN and invalid values."""
    try:
        if pd.isna(value) or value is None or value == '':
            return Decimal(str(default))
        if isinstance(value, str):
            value = value.strip()
            if value == '' or value.lower() in ['nan', 'none']:
                return Decimal(str(default))
        return Decimal(str(float(value)))
    except (ValueError, TypeError, decimal.InvalidOperation):
        logger.warning(f"Could not convert '{value}' to decimal, using default {default}")
        return Decimal(str(default))

def safe_bool(value, default=False):
    """Safely convert value to boolean."""
    if pd.isna(value) or value is None:
        return default
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        value = value.strip().lower()
        return value in ['true', 'yes', '1', 'on']
    return bool(value)

def parse_datetime(date_str, time_str=None):
    """Parse datetime from string, handling various formats."""
    try:
        if pd.isna(date_str) or not date_str:
            return None
        
        # Handle different date formats
        date_str = safe_string(date_str)
        if time_str:
            time_str = safe_string(time_str)
            datetime_str = f"{date_str} {time_str}"
        else:
            datetime_str = date_str
        
        # Try different datetime formats
        formats = [
            '%Y-%m-%d %H:%M:%S',
            '%Y-%m-%d %H:%M',
            '%Y-%m-%d',
            '%m/%d/%Y %H:%M:%S',
            '%m/%d/%Y %H:%M',
            '%m/%d/%Y',
            '%d/%m/%Y %H:%M:%S',
            '%d/%m/%Y %H:%M',
            '%d/%m/%Y'
        ]
        
        for fmt in formats:
            try:
                return datetime.strptime(datetime_str, fmt)
            except ValueError:
                continue
        
        logger.warning(f"Could not parse datetime: {datetime_str}")
        return None
    except Exception as e:
        logger.warning(f"Error parsing datetime '{date_str}': {e}")
        return None

def find_customer_by_contact(cursor, contact_name, contact_phone):
    """Find existing customer by contact information."""
    try:
        contact_name = safe_string(contact_name)
        contact_phone = safe_string(contact_phone)
        
        if not contact_name and not contact_phone:
            return None
        
        # Try exact name match first
        if contact_name:
            cursor.execute("""
                SELECT id FROM customers 
                WHERE tenant_id = %s AND LOWER(name) = LOWER(%s)
                LIMIT 1
            """, (TENANT_ID, contact_name))
            result = cursor.fetchone()
            if result:
                return result['id']
        
        # Try phone match
        if contact_phone:
            cursor.execute("""
                SELECT id FROM customers 
                WHERE tenant_id = %s AND (phone = %s OR mobile = %s)
                LIMIT 1
            """, (TENANT_ID, contact_phone, contact_phone))
            result = cursor.fetchone()
            if result:
                return result['id']
        
        return None
    except Exception as e:
        logger.warning(f"Error finding customer: {e}")
        return None

def load_field_mappings(cursor):
    """Load field library mappings for form field instances."""
    try:
        cursor.execute("""
            SELECT ffi.form_template_id, fl.id as field_id, fl.name as field_name, 
                   fl.label, fl.field_type, fl.affects_pricing, fl.pricing_behavior, 
                   fl.unit_price, ffi.field_order
            FROM form_field_instances ffi
            JOIN field_library fl ON ffi.field_library_id = fl.id
            WHERE ffi.tenant_id = %s
            ORDER BY ffi.form_template_id, ffi.field_order
        """, (TENANT_ID,))
        
        mappings = {}
        for row in cursor.fetchall():
            template_id = row['form_template_id']
            if template_id not in mappings:
                mappings[template_id] = {}
            mappings[template_id][row['field_name']] = row
        
        return mappings
    except Exception as e:
        logger.error(f"Error loading field mappings: {e}")
        return {}

def create_field_mapping():
    """Create mapping from PowerApps fields to our field library."""
    return {
        # Nikkah mappings
        'ma_nikahfruityesno': 'fruit',
        'ma_nikahdesserttableyesno': 'dessert_table',
        'ma_nikahwelcomedrinksyesno': 'welcome_drinks',
        'ma_nikahfullcutleryyesno': 'full_cutlery',
        'ma_nikahtopuplambyesno': 'topup_lamb',
        'ma_nikahfogandsparkleyesno': 'fog_and_sparkle',
        'ma_nikahextrahoursyesno': 'extra_hours',
        'ma_nikahextra1yesno': 'extra_1',
        'ma_nikahextra2yesno': 'extra_2',
        'ma_nikahextra3yesno': 'extra_3',
        'ma_nikahextra4yesno': 'extra_4',
        'ma_nikahextra5yesno': 'extra_5',
        'ma_nikahextra6yesno': 'extra_6',
        'ma_nikahextra7yesno': 'extra_7',
        'ma_nikahextra8yesno': 'extra_8',
        
        # Reception mappings
        'ma_fruityesno': 'fruit',
        'ma_fruittableyesno': 'fruit_table',
        'ma_welcomedrinksyesno': 'welcome_drinks',
        'ma_receptionfogandsparkle': 'fog_and_sparkle',
        'ma_teacoffeestationyesno': 'tea_coffee_station',
        'ma_receptionextra1yesno': 'extra_1',
        'ma_receptionextra2yesno': 'extra_2',
        'ma_receptionextra3yesno': 'extra_3',
        'ma_receptionextra4yesno': 'extra_4',
        'ma_receptionextra5yesno': 'extra_5',
        'ma_receptionextra6yesno': 'extra_6',
        'ma_receptionextra7yesno': 'extra_7',
        'ma_receptionextra8yesno': 'extra_8',
    }

def extract_form_data(row, field_mappings, form_type='nikkah'):
    """Extract and transform form data from CSV row."""
    form_responses = {}
    form_total = Decimal('0.00')
    
    try:
        if form_type == 'nikkah':
            prefix = 'ma_nikah'
            price_prefix = 'ma_nikah'
            text_fields = [
                'ma_nikahdesserttabletext',
                'ma_nikahfruittabletext',
                'ma_nikahwelcomedrinkstext',
                'ma_nikahfullcutlerytext',
                'ma_nikahfogandsparkletext',
                'ma_nikahextra1text',
                'ma_nikahextra2text',
                'ma_nikahextra3text',
                'ma_nikahextra4text',
                'ma_nikahextra5text',
                'ma_nikahextra6text',
                'ma_nikahextra7text',
                'ma_nikahextra8text'
            ]
        else:  # reception
            prefix = 'ma_reception'
            price_prefix = 'ma_reception'
            text_fields = [
                'ma_receptiondesserttabletext',
                'ma_receptionfruittabletext',
                'ma_receptionwelcomedrinkstext',
                'ma_receptionfullcutlerytext',
                'ma_receptionfogandsparkletext',
                'ma_receptionextra1text',
                'ma_receptionextra2text',
                'ma_receptionextra3text',
                'ma_receptionextra4text',
                'ma_receptionextra5text',
                'ma_receptionextra6text',
                'ma_receptionextra7text',
                'ma_receptionextra8text'
            ]
        
        # Process boolean fields (yes/no toggles)
        for powerapp_field, our_field in field_mappings.items():
            if powerapp_field.startswith(prefix) and powerapp_field.endswith('yesno'):
                enabled = safe_bool(row.get(powerapp_field, False))
                
                # Get corresponding price field
                price_field = powerapp_field.replace('yesno', 'price')
                quantity_field = powerapp_field.replace('yesno', 'quantity')
                
                price = safe_decimal(row.get(price_field, 0))
                quantity = safe_int(row.get(quantity_field, 1), 1)
                
                if enabled and price > 0:
                    total_price = price * quantity
                    form_total += total_price
                    
                    form_responses[our_field] = {
                        'enabled': True,
                        'price': float(price),
                        'quantity': quantity,
                        'total': float(total_price)
                    }
                else:
                    form_responses[our_field] = {
                        'enabled': False,
                        'price': 0,
                        'quantity': 0,
                        'total': 0
                    }
        
        # Process text fields
        for text_field in text_fields:
            field_name = text_field.replace('text', '').replace(prefix, '').replace('ma_', '')
            text_value = safe_string(row.get(text_field, ''))
            if text_value:
                if field_name not in form_responses:
                    form_responses[field_name] = {}
                form_responses[field_name]['text'] = text_value
        
        return form_responses, form_total
    
    except Exception as e:
        logger.error(f"Error extracting form data for {form_type}: {e}")
        return {}, Decimal('0.00')

def import_all_days_events():
    """Main import function with comprehensive error handling."""
    logger.info("Starting All Days import process...")
    
    try:
        # Load CSV file
        logger.info("Loading CSV file...")
        df = pd.read_csv('all_days.csv')
        logger.info(f"Loaded {len(df)} records from CSV")
        
        # Connect to database
        logger.info("Connecting to database...")
        conn = psycopg2.connect(**DB_CONFIG)
        conn.autocommit = False  # We'll manage transactions manually
        
        field_mappings = create_field_mapping()
        
        success_count = 0
        error_count = 0
        errors = []
        
        for index, row in df.iterrows():
            try:
                logger.info(f"Processing row {index + 1}/{len(df)}")
                
                with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                    # Start new transaction for this row
                    conn.rollback()  # Clear any previous transaction state
                    
                    # Validate required fields
                    event_name = safe_string(row.get('ma_title', ''))
                    if not event_name:
                        raise ValueError("Missing event name (ma_title)")
                    
                    # Extract contact information
                    primary_contact = safe_string(row.get('ma_primarycontactname', ''))
                    primary_phone = safe_string(row.get('ma_primarycontactnumber', ''))
                    
                    # Find existing customer
                    customer_id = find_customer_by_contact(cursor, primary_contact, primary_phone)
                    
                    # Parse dates
                    event_start_date = parse_datetime(row.get('ma_originaleventdate'))
                    if not event_start_date:
                        event_start_date = datetime.now().date()
                    else:
                        event_start_date = event_start_date.date()
                    
                    # Guest counts with safe conversion
                    nikkah_men = safe_int(row.get('ma_nikahmencount', 0))
                    nikkah_ladies = safe_int(row.get('ma_nikahladiescount', 0))
                    reception_men = safe_int(row.get('ma_receptionmencount', 0))
                    reception_ladies = safe_int(row.get('ma_receptionladiescount', 0))
                    
                    total_guests = max(
                        nikkah_men + nikkah_ladies,
                        reception_men + reception_ladies,
                        safe_int(row.get('ma_nikahtotalguestcount', 0)),
                        safe_int(row.get('ma_receptiontotalguestcount', 0))
                    )
                    
                    # Financial data
                    nikkah_total = safe_decimal(row.get('ma_nikahtotalguestprice', 0))
                    reception_total = safe_decimal(row.get('ma_receptiontotalguestprice', 0))
                    total_amount = nikkah_total + reception_total
                    deposit_amount = safe_decimal(row.get('ma_depositamount', 0))
                    
                    # Create event record
                    event_id = str(uuid.uuid4())
                    
                    cursor.execute("""
                        INSERT INTO events (
                            id, tenant_id, customer_id, event_name, event_type, 
                            event_start_date, event_end_date, event_multiple_days,
                            start_time, end_time,
                            estimated_guests, total_guests, men_count, ladies_count,
                            total_amount, total_guest_price, deposit_amount,
                            status, booking_stage,
                            primary_contact_name, primary_contact_phone,
                            created_at, updated_at
                        ) VALUES (
                            %s, %s, %s, %s, %s,
                            %s, %s, %s,
                            %s, %s,
                            %s, %s, %s, %s,
                            %s, %s, %s,
                            %s, %s,
                            %s, %s,
                            %s, %s
                        )
                    """, (
                        event_id, TENANT_ID, customer_id, event_name, 'All Day',
                        event_start_date, event_start_date, True,  # All day events span same day
                        time(9, 0), time(23, 0),  # Default times
                        total_guests, total_guests, reception_men, reception_ladies,
                        float(total_amount), float(total_amount), float(deposit_amount),
                        'inquiry', 'initial',  # Use valid enum values
                        primary_contact, primary_phone,
                        datetime.now(), datetime.now()
                    ))
                    
                    # Extract form data
                    nikkah_responses, nikkah_total_calc = extract_form_data(row, field_mappings, 'nikkah')
                    reception_responses, reception_total_calc = extract_form_data(row, field_mappings, 'reception')
                    
                    # Create Nikkah form
                    nikkah_form_id = str(uuid.uuid4())
                    cursor.execute("""
                        INSERT INTO event_forms (
                            id, tenant_id, event_id, form_template_id,
                            form_label, tab_order, form_responses, form_total,
                            is_active, created_at, updated_at
                        ) VALUES (
                            %s, %s, %s, %s,
                            %s, %s, %s, %s,
                            %s, %s, %s
                        )
                    """, (
                        nikkah_form_id, TENANT_ID, event_id, NIKKAH_TEMPLATE_ID,
                        'Nikkah', 1, json.dumps(nikkah_responses), float(nikkah_total_calc),
                        True, datetime.now(), datetime.now()
                    ))
                    
                    # Create Reception form
                    reception_form_id = str(uuid.uuid4())
                    cursor.execute("""
                        INSERT INTO event_forms (
                            id, tenant_id, event_id, form_template_id,
                            form_label, tab_order, form_responses, form_total,
                            is_active, created_at, updated_at
                        ) VALUES (
                            %s, %s, %s, %s,
                            %s, %s, %s, %s,
                            %s, %s, %s
                        )
                    """, (
                        reception_form_id, TENANT_ID, event_id, RECEPTION_TEMPLATE_ID,
                        'Reception', 2, json.dumps(reception_responses), float(reception_total_calc),
                        True, datetime.now(), datetime.now()
                    ))
                    
                    # Update event with form totals
                    cursor.execute("""
                        UPDATE events 
                        SET form_total = %s, updated_at = %s
                        WHERE id = %s
                    """, (
                        float(nikkah_total_calc + reception_total_calc),
                        datetime.now(),
                        event_id
                    ))
                    
                    # Commit this row's transaction
                    conn.commit()
                    success_count += 1
                    logger.info(f"Successfully imported row {index + 1}: {event_name}")
                    
            except Exception as e:
                error_count += 1
                error_msg = f"Row {index + 1}: {str(e)}"
                errors.append(error_msg)
                logger.error(f"Error processing row {index + 1}: {e}")
                logger.error(traceback.format_exc())
                
                # Rollback this row's transaction
                conn.rollback()
                continue
        
        # Final summary
        logger.info("=" * 60)
        logger.info("IMPORT SUMMARY")
        logger.info("=" * 60)
        logger.info(f"Total rows processed: {len(df)}")
        logger.info(f"Successfully imported: {success_count}")
        logger.info(f"Errors encountered: {error_count}")
        
        if errors:
            logger.info("\nERROR DETAILS:")
            for error in errors[:10]:  # Show first 10 errors
                logger.info(f"  - {error}")
            if len(errors) > 10:
                logger.info(f"  ... and {len(errors) - 10} more errors")
        
        logger.info("=" * 60)
        
    except Exception as e:
        logger.error(f"Critical error in import process: {e}")
        logger.error(traceback.format_exc())
        return False
    finally:
        if 'conn' in locals():
            conn.close()
    
    return success_count > 0

if __name__ == "__main__":
    print("All Days Import Script - Fixed Version")
    print("=====================================")
    
    # Check if CSV file exists
    import os
    if not os.path.exists('all_days.csv'):
        print("ERROR: all_days.csv file not found!")
        print("Please ensure the CSV file is in the same directory as this script.")
        sys.exit(1)
    
    # Confirm before running
    response = input("This will import All Days events into the database. Continue? (y/N): ")
    if response.lower() != 'y':
        print("Import cancelled.")
        sys.exit(0)
    
    print("\nStarting import process...")
    success = import_all_days_events()
    
    if success:
        print("\n✅ Import completed! Check the log file for details.")
    else:
        print("\n❌ Import failed! Check the log file for error details.")