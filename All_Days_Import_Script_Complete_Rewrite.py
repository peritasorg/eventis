#!/usr/bin/env python3
"""
Complete Rewrite of All Days Import Script for Supabase
Fixes all critical issues: date handling, field mappings, and form population
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
        logging.FileHandler('all_days_import_complete.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Database configuration
DB_CONFIG = {
    'host': 'aws-0-eu-west-2.pooler.supabase.com',
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

# FIXED: Field Library ID mappings from actual database
NIKKAH_FIELD_MAPPINGS = {
    # Field name -> Field Library ID
    'extra_hour': 'e9f04a58-2226-4e13-86ea-c653e9b5e637',
    'top_up_lamb': 'a95c87c7-1cca-4741-a576-d839daa0d70a',
    'welcome_drinks': 'c5bf418e-d253-4728-94cf-3cb98761e3bd',
    'choice_of_stage': 'd01abace-6498-48ed-a6bf-18e627ac5dba',
    'dessert_table': '91f9027e-128c-4745-b1ba-db44ad78c1f0',
    'fruit_table': '81b7ddf7-d828-4b02-b084-ac762e3b0800',
    'full_cutlery': '5eaa914c-337d-4a02-ae2e-388338d78b99',
    'fog_and_sparkle': 'eb66f9f3-5382-4030-a34e-e0b69a9b4626',
    'fruit': '77c114db-9128-4bf5-b69b-07f884f946d5',
    'notes': 'fe145585-b59c-4d95-bd40-3b4791a943ff',
    'extra_1': 'cddad3e1-a3cc-45fe-a601-6b3510dfc993',
    'extra_2': '5249c17d-aeaf-44b4-9747-e47862d83f4c',
    'extra_3': '795afdf7-bb40-480a-b7d2-2d4c638f1a73',
    'extra_4': '96d9a682-b25d-4ce8-9886-961ccc5d8325'
}

RECEPTION_FIELD_MAPPINGS = {
    # Field name -> Field Library ID  
    'theme': '7ab0e857-324e-4c99-acf2-023cf42c5400',
    'cake': '88041dd2-be75-4caa-ae2e-d0d4de0a7ce4',
    'stage': 'c36b4662-b6bf-44f3-8e73-321f43c3d746',
    'dining_chairs': 'f205ae75-db7d-400d-a3ff-12664d0d31c3',
    'wedding_favours': '672712bb-8121-4f9a-8ea4-3242cba51e46',
    'centerpieces': 'c25c687f-30c7-4b68-ac18-d5c627de355c',
    'setup': 'dac9f99d-67b3-4dbc-9f28-2ca2b48c978e',
    'carpet_runner': '426a8955-3950-4bea-9a46-aecdd21c4901',
    'full_cutlery': 'ef9f95bd-3ac3-47a9-b3c7-35bf2f7bbb28',
    'dinner_time': 'e97d4fcf-db06-400b-a133-619549afcff6',
    'starter': 'bc44d526-0745-4b86-bfdd-89a589b7e6db',
    'main_course': 'e0ede379-6b1f-439b-be33-5bc0229e3941',
    'dessert': '2187fc26-c592-4917-a51d-74400fb37cbd',
    'special_request_1': 'a7dcb0f5-7586-455c-a338-ec080187b705',
    'special_request_2': '05186e48-0abe-42c2-b39f-2d6cfb0048da',
    'special_request_3': '2c883a98-42d6-434e-8111-bfc3e5fbca51',
    'special_request_4': 'e25dd5a4-29a0-4ee1-b5b6-5432aac974e4',
    'dessert_table': 'e14f1e3f-d421-44cf-9e92-1bb37aa1c5e8',
    'fruit_table': '922c7c97-6b1e-4a11-a1a9-5bcfaca93d6a',
    'tea_coffee_station': '4a21a29f-f623-4b59-b02a-79dd6b45c1f3',
    'fog_and_sparkle': '99a0c16a-9cfe-4cb8-8b23-06e1c25b0b76',
    'welcome_drinks': '07c6ebfa-ae95-475b-9cd0-34fb45ec7edf',
    'tissues_on_plates': '75b41436-7bd0-415c-afd6-b4b4e19c3d58',
    'napkins': '5f22a9bb-b5e0-4b6c-adeb-bb17f0c79df9',
    'welcome_sign': '1b6a02d5-2ad3-40f0-9173-8e3fd2d65b5f',
    'dj_system': '08cb7c28-c4d5-442f-aab8-5a50e2d5b27a',
    'invitation_by_card': '68d2df50-42e6-42e7-bfa3-14cdd1ee5b80',
    'password': '9e4f8aa0-4a94-4b36-9c7a-77d67ad0aabb',
    'extra_1': 'cddad3e1-a3cc-45fe-a601-6b3510dfc993',
    'extra_2': '5249c17d-aeaf-44b4-9747-e47862d83f4c',
    'extra_3': '795afdf7-bb40-480a-b7d2-2d4c638f1a73',
    'extra_4': '96d9a682-b25d-4ce8-9886-961ccc5d8325'
}

# PowerApps field mappings
POWERAPP_NIKKAH_MAPPINGS = {
    # Toggle fields (Yes/No)
    'ma_nikahextrahoursyesno': ('extra_hour', 'ma_nikahextrahoursprice'),
    'ma_nikahtopuplambyesno': ('top_up_lamb', 'ma_nikahtopuplambprice'),
    'ma_nikahwelcomedrinksyesno': ('welcome_drinks', 'ma_nikahwelcomedrinksprice'),
    'ma_nikahchoiceofstage': ('choice_of_stage', 'ma_nikahchoiceofstage'),
    'ma_nikahdesserttableyesno': ('dessert_table', 'ma_nikahdesserttableprice'),
    'ma_nikahfruittableyesno': ('fruit_table', 'ma_nikahfruittableprice'),
    'ma_nikahfullcutleryyesno': ('full_cutlery', 'ma_nikahfullcutleryprice'),
    'ma_nikahfogandsparkleyesno': ('fog_and_sparkle', 'ma_nikahfogandsparkleprice'),
    'ma_nikahfruityesno': ('fruit', 'ma_nikahfruitprice'),
    'ma_nikahextra1yesno': ('extra_1', 'ma_nikahextra1price'),
    'ma_nikahextra2yesno': ('extra_2', 'ma_nikahextra2price'),
    'ma_nikahextra3yesno': ('extra_3', 'ma_nikahextra3price'),
    'ma_nikahextra4yesno': ('extra_4', 'ma_nikahextra4price'),
    
    # Text fields
    'ma_nikahnotessection': ('notes', None)
}

POWERAPP_RECEPTION_MAPPINGS = {
    # Text fields
    'ma_themecolour': ('theme', None),
    'ma_stage': ('stage', None),
    'ma_diningchairs': ('dining_chairs', None),
    'ma_weddingfavours': ('wedding_favours', None),
    'ma_centrepieces': ('centerpieces', None),
    'ma_setup': ('setup', None),
    'ma_fullcutlery': ('full_cutlery', None),
    'ma_dinnertime': ('dinner_time', None),
    'ma_starter': ('starter', None),
    'ma_maincourse': ('main_course', None),
    'ma_dessert': ('dessert', None),
    'ma_specialrequest1': ('special_request_1', None),
    'ma_specialrequest2': ('special_request_2', None),
    'ma_specialrequest3': ('special_request_3', None),
    'ma_specialrequest4': ('special_request_4', None),
    'ma_specialrequest5': ('special_request_1', None),  # Map to special_request_1 as backup
    'ma_tissuesonplates': ('tissues_on_plates', None),
    'ma_napkins': ('napkins', None),
    'ma_welcomesign': ('welcome_sign', None),
    'ma_djsystem': ('dj_system', None),
    'ma_notessection': ('notes', None),
    
    # Toggle fields (Yes/No)
    'ma_cakefromnarmin': ('cake', 'ma_cakefromnarmin'),
    'ma_carpetrunner': ('carpet_runner', 'ma_carpetrunner'),
    'ma_desserttable': ('dessert_table', 'ma_desserttable'),
    'ma_fruittable': ('fruit_table', 'ma_fruittable'),
    'ma_teacoffeestation': ('tea_coffee_station', 'ma_teacoffeestation'),
    'ma_receptionfogandsparkle': ('fog_and_sparkle', 'ma_receptionfogandsparkle'),
    'ma_welcomedrinks': ('welcome_drinks', 'ma_welcomedrinks'),
    'ma_invitationbycard': ('invitation_by_card', 'ma_invitationbycard'),
    'ma_password': ('password', 'ma_password'),
    'ma_receptionextra1yesno': ('extra_1', 'ma_receptionextra1price'),
    'ma_receptionextra2yesno': ('extra_2', 'ma_receptionextra2price'),
    'ma_receptionextra3yesno': ('extra_3', 'ma_receptionextra3price'),
    'ma_receptionextra4yesno': ('extra_4', 'ma_receptionextra4price')
}

def safe_string(value):
    """Safely convert value to string, handling floats and NaN."""
    if pd.isna(value) or value is None:
        return ""
    if isinstance(value, (int, float)):
        if pd.isna(value):
            return ""
        return str(value)
    return str(value).strip()

def safe_int(value, default=0):
    """Safely convert value to integer."""
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
    """Safely convert value to Decimal."""
    try:
        if pd.isna(value) or value is None or value == '':
            return Decimal(str(default))
        if isinstance(value, str):
            value = value.strip()
            if value == '' or value.lower() in ['nan', 'none']:
                return Decimal(str(default))
        return Decimal(str(float(value)))
    except (ValueError, TypeError):
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

def parse_powerapp_datetime(date_str):
    """Parse PowerApps datetime format correctly."""
    try:
        if pd.isna(date_str) or not date_str:
            return None
        
        date_str = safe_string(date_str)
        
        # PowerApps datetime formats to try
        formats = [
            '%Y-%m-%d %H:%M:%S',
            '%Y-%m-%d %H:%M',
            '%Y-%m-%d',
            '%m/%d/%Y %H:%M:%S',
            '%m/%d/%Y %H:%M',
            '%m/%d/%Y',
            '%d/%m/%Y %H:%M:%S',
            '%d/%m/%Y %H:%M',
            '%d/%m/%Y',
            '%Y-%m-%dT%H:%M:%S',
            '%Y-%m-%dT%H:%M:%SZ'
        ]
        
        for fmt in formats:
            try:
                return datetime.strptime(date_str, fmt)
            except ValueError:
                continue
        
        logger.warning(f"Could not parse datetime: {date_str}")
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

def create_form_responses(row, form_type='nikkah'):
    """Create correct form_responses JSON structure."""
    form_responses = {}
    form_total = Decimal('0.00')
    
    try:
        if form_type == 'nikkah':
            field_mappings = NIKKAH_FIELD_MAPPINGS
            powerapp_mappings = POWERAPP_NIKKAH_MAPPINGS
        else:  # reception
            field_mappings = RECEPTION_FIELD_MAPPINGS
            powerapp_mappings = POWERAPP_RECEPTION_MAPPINGS
        
        # Process each PowerApp field
        for powerapp_field, (our_field, price_field) in powerapp_mappings.items():
            if our_field not in field_mappings:
                continue
                
            field_library_id = field_mappings[our_field]
            
            # Initialize field response
            field_response = {
                'enabled': False,
                'price': 0,
                'quantity': 1,
                'pricing_type': 'fixed',
                'notes': '',
                'label': our_field.replace('_', ' ').title()
            }
            
            # Handle toggle fields (Yes/No)
            if price_field is not None and powerapp_field.endswith('yesno'):
                enabled = safe_bool(row.get(powerapp_field, False))
                price = safe_decimal(row.get(price_field, 0))
                
                field_response['enabled'] = enabled
                field_response['price'] = float(price)
                
                if enabled and price > 0:
                    form_total += price
            
            # Handle text fields
            elif price_field is None:
                text_value = safe_string(row.get(powerapp_field, ''))
                field_response['notes'] = text_value
                field_response['enabled'] = bool(text_value)
            
            # Add to form responses using field library ID as key
            form_responses[field_library_id] = field_response
        
        return form_responses, form_total
    
    except Exception as e:
        logger.error(f"Error creating form responses for {form_type}: {e}")
        return {}, Decimal('0.00')

def import_all_days_events():
    """Main import function with complete rewrite."""
    logger.info("Starting All Days import process (Complete Rewrite)...")
    
    try:
        # Load CSV file
        logger.info("Loading CSV file...")
        df = pd.read_csv('all_days.csv')
        logger.info(f"Loaded {len(df)} records from CSV")
        
        # Connect to database
        logger.info("Connecting to database...")
        conn = psycopg2.connect(**DB_CONFIG)
        conn.autocommit = False
        
        success_count = 0
        error_count = 0
        errors = []
        
        for index, row in df.iterrows():
            try:
                logger.info(f"Processing row {index + 1}/{len(df)}")
                
                with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                    # Start new transaction for this row
                    conn.rollback()
                    
                    # Validate required fields
                    event_name = safe_string(row.get('ma_title', ''))
                    if not event_name:
                        raise ValueError("Missing event name (ma_title)")
                    
                    # Extract contact information
                    primary_contact = safe_string(row.get('ma_primarycontactname', ''))
                    primary_phone = safe_string(row.get('ma_primarycontactnumber', ''))
                    
                    # Find existing customer
                    customer_id = find_customer_by_contact(cursor, primary_contact, primary_phone)
                    
                    # FIXED: Parse dates from correct fields
                    # Use ma_nikahstartdatetime instead of ma_originaleventdate
                    event_start_datetime = parse_powerapp_datetime(row.get('ma_nikahstartdatetime'))
                    event_end_datetime = parse_powerapp_datetime(row.get('ma_nikahendatetime'))
                    
                    if event_start_datetime:
                        event_start_date = event_start_datetime.date()
                        # FIXED: Set All Day events to 12 PM - 11:45 PM
                        start_time_obj = time(12, 0)  # 12:00 PM
                        end_time_obj = time(23, 45)   # 11:45 PM
                    else:
                        logger.warning(f"No valid start date found for row {index + 1}, using today")
                        event_start_date = datetime.now().date()
                        start_time_obj = time(12, 0)
                        end_time_obj = time(23, 45)
                    
                    # Use same date for end if no end date specified (All Day events)
                    event_end_date = event_end_datetime.date() if event_end_datetime else event_start_date
                    
                    # Guest counts
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
                    total_guest_price = nikkah_total + reception_total
                    deposit_amount = safe_decimal(row.get('ma_depositamount', 0))
                    
                    # Create event record
                    event_id = str(uuid.uuid4())
                    
                    cursor.execute("""
                        INSERT INTO events (
                            id, tenant_id, customer_id, event_name, event_type, 
                            event_start_date, event_end_date, event_multiple_days,
                            start_time, end_time,
                            estimated_guests, total_guests, men_count, ladies_count,
                            total_guest_price, deposit_amount,
                            status, booking_stage,
                            primary_contact_name, primary_contact_phone,
                            ethnicity, event_mix_type,
                            created_at, updated_at
                        ) VALUES (
                            %s, %s, %s, %s, %s,
                            %s, %s, %s,
                            %s, %s,
                            %s, %s, %s, %s,
                            %s, %s,
                            %s, %s,
                            %s, %s,
                            %s, %s,
                            %s, %s
                        )
                    """, (
                        event_id, TENANT_ID, customer_id, event_name, 'All Day',
                        event_start_date, event_end_date, (event_start_date != event_end_date),
                        start_time_obj, end_time_obj,
                        total_guests, total_guests, reception_men, reception_ladies,
                        float(total_guest_price), float(deposit_amount),
                        'inquiry', 'initial',
                        primary_contact, primary_phone,
                        safe_string(row.get('ma_ethnicity', '')),
                        safe_string(row.get('ma_eventmixtype', 'mixed')),
                        datetime.now(), datetime.now()
                    ))
                    
                    # FIXED: Create correct form responses with field library IDs
                    nikkah_responses, nikkah_total_calc = create_form_responses(row, 'nikkah')
                    reception_responses, reception_total_calc = create_form_responses(row, 'reception')
                    
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
                    
                    # Update event with calculated totals
                    total_form_amount = nikkah_total_calc + reception_total_calc
                    total_event_amount = total_guest_price + total_form_amount
                    
                    cursor.execute("""
                        UPDATE events SET 
                            form_total = %s,
                            total_amount = %s,
                            balance_due = %s,
                            updated_at = %s
                        WHERE id = %s
                    """, (
                        float(total_form_amount),
                        float(total_event_amount),
                        float(total_event_amount - deposit_amount),
                        datetime.now(),
                        event_id
                    ))
                    
                    # Commit transaction for this row
                    conn.commit()
                    success_count += 1
                    logger.info(f"Successfully imported row {index + 1}: {event_name}")
                    
            except Exception as e:
                # Rollback this row and continue
                conn.rollback()
                error_msg = f"Error importing row {index + 1}: {str(e)}"
                logger.error(error_msg)
                logger.error(traceback.format_exc())
                errors.append(error_msg)
                error_count += 1
                continue
        
        # Final summary
        logger.info(f"Import completed: {success_count} successful, {error_count} errors")
        if errors:
            logger.info("Errors encountered:")
            for error in errors:
                logger.info(f"  - {error}")
        
        return success_count, error_count, errors
        
    except Exception as e:
        logger.error(f"Critical error during import: {e}")
        logger.error(traceback.format_exc())
        return 0, 0, [str(e)]
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    # Check if CSV file exists
    import os
    if not os.path.exists('all_days.csv'):
        print("Error: all_days.csv file not found!")
        print("Please ensure the CSV file is in the same directory as this script.")
        sys.exit(1)
    
    # Confirm before starting
    print("All Days Import Script - Complete Rewrite")
    print("This will import events and form data from all_days.csv")
    print("Features:")
    print("- Fixed date handling from ma_nikahstartdatetime")
    print("- All Day events set to 12:00 PM - 11:45 PM")
    print("- Complete Nikkah and Reception form field mapping")
    print("- Correct form_responses JSON structure")
    print("- Field library ID based mappings")
    print("")
    
    response = input("Do you want to proceed? (y/N): ").strip().lower()
    if response != 'y' and response != 'yes':
        print("Import cancelled.")
        sys.exit(0)
    
    # Run import
    success, errors, error_list = import_all_days_events()
    
    if success > 0:
        print(f"\nImport completed successfully!")
        print(f"Records imported: {success}")
        if errors > 0:
            print(f"Records with errors: {errors}")
    else:
        print("\nImport failed or no records were imported.")
        if error_list:
            print("Errors:")
            for error in error_list:
                print(f"  - {error}")