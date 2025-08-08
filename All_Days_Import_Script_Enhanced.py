#!/usr/bin/env python3
"""
Enhanced All Days Import Script - DATETIME PARSING FIX
Fixes PowerApps datetime parsing with robust string handling and debug logging
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
import re

# Configure logging with debug mode
logging.basicConfig(
    level=logging.DEBUG,  # Enhanced logging
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('all_days_import_enhanced.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Database configuration
DB_CONFIG = {
    'host': 'aws-0-eu-west-2.pooler.supabase.com',
    'database': 'postgres',
    'user': 'postgres.vbowtpkisiabdwwgttry',
    'password': 'Eventis55!gha',
    'port': '6543',
    'sslmode': 'require'
}

# Constants
TENANT_ID = 'e2a03656-036e-4041-a24e-c06e85747906'
NIKKAH_TEMPLATE_ID = 'cda42360-66d9-4f96-ba44-8618b15710de'
RECEPTION_TEMPLATE_ID = 'def554d7-b2a0-4e4b-afb5-b7b3380d4da5'

# Field Library ID mappings
NIKKAH_FIELD_MAPPINGS = {
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
    'special_request_5': '9e0d3245-1234-5678-9abc-def012345678',
    'dessert_table': 'e14f1e3f-d421-44cf-9e92-1bb37aa1c5e8',
    'fruit_table': '922c7c97-6b1e-4a11-a1a9-5bcfaca93d6a',
    'tea_coffee_station': '4a21a29f-f623-4b59-b02a-79dd6b45c1f3',
    'fog_and_sparkle': '99a0c16a-9cfe-4cb8-8b23-06e1c25b0b76',
    'welcome_drinks': '07c6ebfa-ae95-475b-9cd0-34fb45ec7edf',
    'tissues_on_plates': '75b41436-7bd0-415c-afd6-b4b4e19c3d58',
    'napkins': '5f22a9bb-b5e0-4b6c-adeb-bb17f0c79df9',
    'welcome_sign': '1b6a02d5-2ad3-40f0-9173-8e3fd2d65b5f',
    'dj_system': 'b54eefcb-06d3-4065-b54d-eca68e07833f',
    'invitation_by_card': 'b65d2fee-0c7c-4fb9-8b78-e3d9d147f0b4',
    'password': 'b078a50f-6569-4170-87bc-064869d820bd',
    'extra_1': 'cddad3e1-a3cc-45fe-a601-6b3510dfc993',
    'extra_2': '5249c17d-aeaf-44b4-9747-e47862d83f4c',
    'extra_3': '795afdf7-bb40-480a-b7d2-2d4c638f1a73',
    'extra_4': '96d9a682-b25d-4ce8-9886-961ccc5d8325'
}

# PowerApps field mappings
POWERAPP_NIKKAH_MAPPINGS = {
    'ma_nikahextrahoursyesno': ('extra_hour', 'ma_nikahextrahoursprice', 'number'),
    'ma_nikahtopuplambyesno': ('top_up_lamb', 'ma_nikahtopuplambprice', 'toggle'),
    'ma_nikahwelcomedrinksyesno': ('welcome_drinks', 'ma_nikahwelcomedrinksprice', 'toggle'),
    'ma_nikahchoiceofstage': ('choice_of_stage', 'ma_nikahchoiceofstage', 'toggle'),
    'ma_nikahdesserttableyesno': ('dessert_table', 'ma_nikahdesserttableprice', 'toggle'),
    'ma_nikahfruittableyesno': ('fruit_table', 'ma_nikahfruittableprice', 'toggle'),
    'ma_nikahfullcutleryyesno': ('full_cutlery', 'ma_nikahfullcutleryprice', 'toggle'),
    'ma_nikahfogandsparkleyesno': ('fog_and_sparkle', 'ma_nikahfogandsparkleprice', 'toggle'),
    'ma_nikahfruityesno': ('fruit', 'ma_nikahfruitprice', 'toggle'),
    'ma_nikahextra1yesno': ('extra_1', 'ma_nikahextra1price', 'toggle'),
    'ma_nikahextra2yesno': ('extra_2', 'ma_nikahextra2price', 'toggle'),
    'ma_nikahextra3yesno': ('extra_3', 'ma_nikahextra3price', 'toggle'),
    'ma_nikahextra4yesno': ('extra_4', 'ma_nikahextra4price', 'toggle'),
    'ma_nikahnotessection': ('notes', None, 'text')
}

POWERAPP_RECEPTION_MAPPINGS = {
    'ma_themecolour': ('theme', None, 'text'),
    'ma_stage': ('stage', None, 'text'),
    'ma_weddingfavours': ('wedding_favours', None, 'text'),
    'ma_centrepieces': ('centerpieces', None, 'text'),
    'ma_setup': ('setup', None, 'text'),
    'ma_dinnertime': ('dinner_time', None, 'text'),
    'ma_starter': ('starter', None, 'text'),
    'ma_maincourse': ('main_course', None, 'text'),
    'ma_dessert': ('dessert', None, 'text'),
    'ma_specialrequest1': ('special_request_1', None, 'text'),
    'ma_specialrequest2': ('special_request_2', None, 'text'),
    'ma_specialrequest3': ('special_request_3', None, 'text'),
    'ma_specialrequest4': ('special_request_4', None, 'text'),
    'ma_specialrequest5': ('special_request_5', None, 'text'),
    'ma_tissuesonplates': ('tissues_on_plates', None, 'text'),
    'ma_napkins': ('napkins', None, 'text'),
    'ma_welcomesign': ('welcome_sign', None, 'text'),
    'ma_djsystem': ('dj_system', None, 'text'),
    'ma_notessection': ('notes', None, 'text'),
    'ma_diningchairs': ('dining_chairs', None, 'select'),
    'ma_fullcutlery': ('full_cutlery', None, 'select'),
    'ma_cakefromnarmin': ('cake', 'ma_cakefromnarmin', 'toggle'),
    'ma_carpetrunner': ('carpet_runner', 'ma_carpetrunner', 'toggle'),
    'ma_desserttable': ('dessert_table', 'ma_desserttable', 'toggle'),
    'ma_fruittable': ('fruit_table', 'ma_fruittable', 'toggle'),
    'ma_teacoffeestation': ('tea_coffee_station', 'ma_teacoffeestation', 'toggle'),
    'ma_receptionfogandsparkle': ('fog_and_sparkle', 'ma_receptionfogandsparkle', 'toggle'),
    'ma_welcomedrinks': ('welcome_drinks', 'ma_welcomedrinks', 'toggle'),
    'ma_invitationbycard': ('invitation_by_card', 'ma_invitationbycard', 'toggle'),
    'ma_password': ('password', 'ma_password', 'toggle'),
    'ma_receptionextra1yesno': ('extra_1', 'ma_receptionextra1price', 'toggle'),
    'ma_receptionextra2yesno': ('extra_2', 'ma_receptionextra2price', 'toggle'),
    'ma_receptionextra3yesno': ('extra_3', 'ma_receptionextra3price', 'toggle'),
    'ma_receptionextra4yesno': ('extra_4', 'ma_receptionextra4price', 'toggle')
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

def normalize_datetime_string(date_str):
    """Enhanced string preprocessing for datetime parsing."""
    try:
        if not date_str or pd.isna(date_str):
            return None
        
        # Convert to string and clean
        date_str = str(date_str).strip()
        
        # Remove any non-printable characters
        date_str = re.sub(r'[^\x20-\x7E]', '', date_str)
        
        # Normalize whitespace: replace multiple spaces with single space
        date_str = re.sub(r'\s+', ' ', date_str)
        
        # Handle specific PowerApps patterns
        # Convert "10/11/2025  11:00:00 AM" to "10/11/2025 11:00:00 AM"
        date_str = re.sub(r'(\d{1,2}/\d{1,2}/\d{4})\s+(\d{1,2}:\d{2}:\d{2}\s+[AP]M)', r'\1 \2', date_str)
        
        # Handle double spaces before time: "10/11/2025  11:00 AM"
        date_str = re.sub(r'(\d{1,2}/\d{1,2}/\d{4})\s+(\d{1,2}:\d{2}\s+[AP]M)', r'\1 \2', date_str)
        
        logger.debug(f"Normalized datetime string: '{date_str}'")
        return date_str.strip()
        
    except Exception as e:
        logger.warning(f"Error normalizing datetime string '{date_str}': {e}")
        return str(date_str).strip() if date_str else None

def parse_powerapp_datetime(date_str, field_name="unknown"):
    """ENHANCED: Parse PowerApps datetime with robust preprocessing and detailed logging."""
    try:
        if pd.isna(date_str) or not date_str:
            logger.debug(f"Empty datetime for field '{field_name}'")
            return None
        
        original_str = str(date_str)
        logger.info(f"🔍 Parsing datetime for field '{field_name}': '{original_str}'")
        
        # Step 1: Normalize the string
        normalized_str = normalize_datetime_string(date_str)
        if not normalized_str:
            logger.warning(f"❌ Failed to normalize datetime string for '{field_name}': '{original_str}'")
            return None
        
        logger.debug(f"📝 Normalized: '{normalized_str}'")
        
        # Step 2: Enhanced format list with PowerApps formats prioritized
        formats = [
            # PRIMARY: PowerApps formats (most common first)
            '%m/%d/%Y %I:%M:%S %p',    # "10/11/2025 11:00:00 AM"
            '%m/%d/%Y %I:%M %p',       # "10/11/2025 11:00 AM"
            
            # Alternative US formats
            '%m/%d/%Y %H:%M:%S',       # "10/11/2025 23:00:00"
            '%m/%d/%Y %H:%M',          # "10/11/2025 23:00"
            '%m/%d/%Y',                # "10/11/2025"
            
            # UK/European formats
            '%d/%m/%Y %H:%M:%S',       # "11/10/2025 23:00:00"
            '%d/%m/%Y %H:%M',          # "11/10/2025 23:00"
            '%d/%m/%Y',                # "11/10/2025"
            
            # ISO formats
            '%Y-%m-%d %H:%M:%S',       # "2025-10-11 23:00:00"
            '%Y-%m-%d %H:%M',          # "2025-10-11 23:00"
            '%Y-%m-%d',                # "2025-10-11"
            '%Y-%m-%dT%H:%M:%S',       # "2025-10-11T23:00:00"
            '%Y-%m-%dT%H:%M:%SZ',      # "2025-10-11T23:00:00Z"
        ]
        
        # Step 3: Try each format with detailed logging
        for i, fmt in enumerate(formats):
            try:
                parsed_dt = datetime.strptime(normalized_str, fmt)
                logger.info(f"✅ SUCCESS: Parsed '{normalized_str}' using format #{i+1}: '{fmt}' -> {parsed_dt}")
                return parsed_dt
            except ValueError as e:
                logger.debug(f"❌ Format #{i+1} '{fmt}' failed: {e}")
                continue
        
        # Step 4: Last resort - try to extract date only
        logger.warning(f"⚠️  All datetime formats failed for '{field_name}': '{normalized_str}'")
        
        # Try to extract just the date part using regex
        date_match = re.search(r'(\d{1,2}/\d{1,2}/\d{4})', normalized_str)
        if date_match:
            date_part = date_match.group(1)
            logger.info(f"🔄 Attempting date-only fallback: '{date_part}'")
            
            for fmt in ['%m/%d/%Y', '%d/%m/%Y']:
                try:
                    parsed_date = datetime.strptime(date_part, fmt)
                    # Set default time to 12:00 PM
                    result = parsed_date.replace(hour=12, minute=0, second=0)
                    logger.info(f"✅ FALLBACK SUCCESS: Extracted date '{date_part}' -> {result}")
                    return result
                except ValueError:
                    continue
        
        logger.error(f"💥 COMPLETE FAILURE: Could not parse datetime '{original_str}' for field '{field_name}'")
        return None
        
    except Exception as e:
        logger.error(f"💥 EXCEPTION parsing datetime '{date_str}' for field '{field_name}': {e}")
        logger.error(traceback.format_exc())
        return None

def find_customer_by_contact(cursor, contact_name, contact_phone):
    """Find existing customer by contact information."""
    try:
        contact_name = safe_string(contact_name)
        contact_phone = safe_string(contact_phone)
        
        if not contact_name and not contact_phone:
            return None
        
        if contact_name:
            cursor.execute("""
                SELECT id FROM customers 
                WHERE tenant_id = %s AND LOWER(name) = LOWER(%s)
                LIMIT 1
            """, (TENANT_ID, contact_name))
            result = cursor.fetchone()
            if result:
                return result['id']
        
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
    """Create form_responses JSON structure with proper field type handling."""
    form_responses = {}
    form_total = Decimal('0.00')
    
    try:
        if form_type == 'nikkah':
            field_mappings = NIKKAH_FIELD_MAPPINGS
            powerapp_mappings = POWERAPP_NIKKAH_MAPPINGS
        else:
            field_mappings = RECEPTION_FIELD_MAPPINGS
            powerapp_mappings = POWERAPP_RECEPTION_MAPPINGS
        
        for powerapp_field, mapping_data in powerapp_mappings.items():
            our_field, price_field, field_type = mapping_data
            
            if our_field not in field_mappings:
                logger.warning(f"Field '{our_field}' not found in mappings")
                continue
                
            field_library_id = field_mappings[our_field]
            
            field_response = {
                'enabled': False,
                'price': 0,
                'quantity': 1,
                'pricing_type': 'fixed',
                'notes': '',
                'label': our_field.replace('_', ' ').title(),
                'selections': []
            }
            
            if field_type == 'toggle':
                enabled = safe_bool(row.get(powerapp_field, False))
                price = safe_decimal(row.get(price_field, 0)) if price_field else Decimal('0')
                
                field_response['enabled'] = enabled
                field_response['price'] = float(price)
                
                if enabled and price > 0:
                    form_total += price
            
            elif field_type == 'number':
                quantity = safe_int(row.get(powerapp_field, 0))
                price_per_unit = safe_decimal(row.get(price_field, 0)) if price_field else Decimal('0')
                
                field_response['enabled'] = quantity > 0
                field_response['quantity'] = quantity
                field_response['price'] = float(price_per_unit * quantity)
                
                if quantity > 0 and price_per_unit > 0:
                    form_total += price_per_unit * quantity
            
            elif field_type == 'select':
                selection = safe_string(row.get(powerapp_field, ''))
                field_response['enabled'] = bool(selection)
                field_response['selections'] = [selection] if selection else []
                field_response['notes'] = selection
            
            elif field_type == 'text':
                text_value = safe_string(row.get(powerapp_field, ''))
                field_response['enabled'] = bool(text_value)
                field_response['notes'] = text_value
            
            form_responses[field_library_id] = field_response
        
        logger.debug(f"Created {form_type} responses: {len(form_responses)} fields, total: {form_total}")
        return form_responses, form_total
    
    except Exception as e:
        logger.error(f"Error creating form responses for {form_type}: {e}")
        logger.error(traceback.format_exc())
        return {}, Decimal('0.00')

def import_all_days_events():
    """Main import function with enhanced datetime parsing."""
    logger.info("🚀 Starting Enhanced All Days import process...")
    
    try:
        # Load CSV file
        logger.info("📂 Loading CSV file...")
        df = pd.read_csv('ma_alldaies.csv')
        logger.info(f"📊 Loaded {len(df)} records from CSV")
        
        # Connect to database
        logger.info("🔌 Connecting to database...")
        conn = psycopg2.connect(**DB_CONFIG)
        conn.autocommit = False
        
        success_count = 0
        error_count = 0
        datetime_success_count = 0
        datetime_fail_count = 0
        errors = []
        
        logger.info("📅 Starting datetime parsing analysis...")
        
        for index, row in df.iterrows():
            try:
                logger.info(f"📝 Processing row {index + 1}/{len(df)}")
                
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
                    
                    # ENHANCED: Parse dates with detailed logging
                    logger.info(f"📅 Parsing datetime fields for event: '{event_name}'")
                    
                    event_start_datetime = parse_powerapp_datetime(
                        row.get('ma_nikahstartdatetime'), 
                        'ma_nikahstartdatetime'
                    )
                    event_end_datetime = parse_powerapp_datetime(
                        row.get('ma_nikahendatetime'), 
                        'ma_nikahendatetime'
                    )
                    
                    # Enhanced date/time extraction
                    if event_start_datetime:
                        event_start_date = event_start_datetime.date()
                        start_time_obj = event_start_datetime.time()
                        datetime_success_count += 1
                        
                        logger.info(f"✅ Start datetime parsed: {event_start_datetime} -> Date: {event_start_date}, Time: {start_time_obj}")
                        
                        if event_end_datetime:
                            event_end_date = event_end_datetime.date()
                            end_time_obj = event_end_datetime.time()
                            logger.info(f"✅ End datetime parsed: {event_end_datetime} -> Date: {event_end_date}, Time: {end_time_obj}")
                        else:
                            event_end_date = event_start_date
                            # Default to 4 hours later
                            end_hour = (event_start_datetime.hour + 4) % 24
                            end_time_obj = time(end_hour, event_start_datetime.minute)
                            logger.info(f"⚠️  End datetime missing, using default: {end_time_obj}")
                    else:
                        datetime_fail_count += 1
                        logger.error(f"❌ CRITICAL: No valid start date found for '{event_name}' - SKIPPING this event")
                        error_count += 1
                        errors.append(f"Row {index + 1}: No valid start date for event '{event_name}'")
                        continue
                    
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
                    
                    logger.info(f"💾 Inserting event: '{event_name}' on {event_start_date} at {start_time_obj}")
                    
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
                    
                    # Create form responses
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
                    logger.info(f"✅ Successfully imported: '{event_name}' on {event_start_date}")
                    
            except Exception as e:
                # Rollback this row and continue
                conn.rollback()
                error_msg = f"Row {index + 1}: {str(e)}"
                logger.error(f"❌ Error importing: {error_msg}")
                logger.error(traceback.format_exc())
                errors.append(error_msg)
                error_count += 1
                continue
        
        # Final detailed summary
        logger.info("=" * 80)
        logger.info("📊 IMPORT SUMMARY")
        logger.info("=" * 80)
        logger.info(f"✅ Successfully imported: {success_count} events")
        logger.info(f"❌ Failed imports: {error_count} events")
        logger.info(f"📅 DateTime parsing successful: {datetime_success_count}")
        logger.info(f"⚠️  DateTime parsing failed: {datetime_fail_count}")
        logger.info("=" * 80)
        
        if errors:
            logger.info("❌ ERRORS ENCOUNTERED:")
            for error in errors:
                logger.info(f"  - {error}")
        
        if success_count > 0:
            logger.info("🎉 Import completed! Check your calendar at /events to see the imported events.")
            logger.info("💡 Events should now appear on their correct dates (August 2025, October 2025, etc.)")
        
        return success_count, error_count, errors
        
    except Exception as e:
        logger.error(f"💥 Critical error during import: {e}")
        logger.error(traceback.format_exc())
        return 0, 0, [str(e)]
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    # Check if CSV file exists
    import os
    if not os.path.exists('ma_alldaies.csv'):
        print("❌ Error: ma_alldaies.csv file not found!")
        print("Please ensure the CSV file is in the same directory as this script.")
        sys.exit(1)
    
    # Enhanced confirmation
    print("🚀 ENHANCED ALL DAYS IMPORT SCRIPT")
    print("=" * 50)
    print("📅 DATETIME PARSING ENHANCEMENTS:")
    print("✅ PowerApps format prioritized: '10/11/2025  11:00:00 AM'")
    print("✅ Robust string preprocessing and normalization")
    print("✅ Enhanced error handling with detailed logging")
    print("✅ Date extraction fallback (never defaults to today)")
    print("✅ Debug logging for datetime parsing analysis")
    print("")
    print("📊 This will import events from ma_alldaies.csv with:")
    print("  - Correct dates and times from PowerApps data")
    print("  - Complete form field mappings")
    print("  - Proper financial calculations")
    print("  - Enhanced error reporting")
    print("")
    
    response = input("🤔 Do you want to proceed with the enhanced import? (y/N): ").strip().lower()
    if response != 'y' and response != 'yes':
        print("❌ Import cancelled.")
        sys.exit(0)
    
    # Run enhanced import
    print("\n🚀 Starting enhanced import process...")
    success, errors, error_list = import_all_days_events()
    
    print("\n" + "=" * 50)
    if success > 0:
        print(f"🎉 Import completed successfully!")
        print(f"✅ Records imported: {success}")
        print(f"📅 Check your calendar at /events to see events on correct dates!")
        if errors > 0:
            print(f"⚠️  Records with errors: {errors}")
    else:
        print("❌ Import failed or no records were imported.")
        if error_list:
            print("💥 Errors:")
            for error in error_list:
                print(f"  - {error}")
    print("=" * 50)