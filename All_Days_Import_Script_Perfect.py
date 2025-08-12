#!/usr/bin/env python3
"""
Perfect All Days Import Script - Updated for New Schema
Maps every field perfectly with toggles, prices, quantities, and notes
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

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('all_days_import_perfect.log', encoding='utf-8'),
        logging.StreamHandler(sys.stdout)
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
ALL_DAY_EVENT_TYPE = 'All Day'

# Form IDs (from database query)
NIKKAH_FORM_ID = 'b4c302ae-9a3b-45e9-9c0e-95e857a8592f'
RECEPTION_FORM_ID = '1600029b-735b-4e93-b4a9-baaf20872d70'

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
        
        date_str = str(date_str).strip()
        date_str = re.sub(r'[^\x20-\x7E]', '', date_str)
        date_str = re.sub(r'\s+', ' ', date_str)
        
        # Handle PowerApps formats
        if re.match(r'\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d+', date_str):
            match = re.match(r'(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\.(\d+)', date_str)
            if match:
                main_part = match.group(1)
                microsec_part = match.group(2)[:6]
                date_str = f"{main_part}.{microsec_part}"
        
        date_str = re.sub(r'(\d{1,2}/\d{1,2}/\d{4})\s+(\d{1,2}:\d{2}:\d{2}\s+[AP]M)', r'\1 \2', date_str)
        date_str = re.sub(r'(\d{1,2}/\d{1,2}/\d{4})\s+(\d{1,2}:\d{2}\s+[AP]M)', r'\1 \2', date_str)
        
        logger.debug(f"Normalized datetime string: '{date_str}'")
        return date_str.strip()
        
    except Exception as e:
        logger.warning(f"Error normalizing datetime string '{date_str}': {e}")
        return str(date_str).strip() if date_str else None

def parse_powerapp_datetime(date_str, field_name="unknown"):
    """Parse PowerApps datetime with robust preprocessing and detailed logging."""
    try:
        if pd.isna(date_str) or not date_str:
            logger.debug(f"Empty datetime for field '{field_name}'")
            return None
        
        original_str = str(date_str)
        logger.info(f"🔍 Parsing datetime for field '{field_name}': '{original_str}'")
        
        normalized_str = normalize_datetime_string(date_str)
        if not normalized_str:
            logger.warning(f"❌ Failed to normalize datetime string for '{field_name}': '{original_str}'")
            return None
        
        logger.debug(f"📝 Normalized: '{normalized_str}'")
        
        # Enhanced format list with PowerApps formats prioritized
        formats = [
            '%Y-%m-%d %H:%M:%S.%f',    # "2024-08-23 11:00:00.000000"
            '%Y-%m-%d %H:%M:%S',       # "2025-10-11 23:00:00"
            '%Y-%m-%d %H:%M',          # "2025-10-11 23:00"
            '%Y-%m-%d',                # "2025-10-11"
            '%m/%d/%Y %I:%M:%S %p',    # "10/11/2025 11:00:00 AM"
            '%m/%d/%Y %I:%M %p',       # "10/11/2025 11:00 AM"
            '%m/%d/%Y %H:%M:%S',       # "10/11/2025 23:00:00"
            '%m/%d/%Y %H:%M',          # "10/11/2025 23:00"
            '%m/%d/%Y',                # "10/11/2025"
            '%d/%m/%Y %H:%M:%S',       # "11/10/2025 23:00:00"
            '%d/%m/%Y %H:%M',          # "11/10/2025 23:00"
            '%d/%m/%Y',                # "11/10/2025"
            '%Y-%m-%dT%H:%M:%S',       # "2025-10-11T23:00:00"
            '%Y-%m-%dT%H:%M:%SZ',      # "2025-10-11T23:00:00Z"
        ]
        
        for i, fmt in enumerate(formats):
            try:
                parsed_dt = datetime.strptime(normalized_str, fmt)
                logger.info(f"✅ SUCCESS: Parsed '{normalized_str}' using format #{i+1}: '{fmt}' -> {parsed_dt}")
                return parsed_dt
            except ValueError as e:
                logger.debug(f"❌ Format #{i+1} '{fmt}' failed: {e}")
                continue
        
        # Fallback - extract date only
        date_match = re.search(r'(\d{1,2}/\d{1,2}/\d{4})', normalized_str)
        if date_match:
            date_part = date_match.group(1)
            logger.info(f"🔄 Attempting date-only fallback: '{date_part}'")
            
            for fmt in ['%m/%d/%Y', '%d/%m/%Y']:
                try:
                    parsed_date = datetime.strptime(date_part, fmt)
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

def get_field_library_mappings(cursor):
    """Get field library mappings from database."""
    logger.info("📚 Loading field library mappings from database...")
    
    # Check if field library is populated
    cursor.execute("""
        SELECT COUNT(*) as count FROM field_library 
        WHERE tenant_id = %s AND active = true
    """, (TENANT_ID,))
    count = cursor.fetchone()['count']
    
    if count == 0:
        logger.warning("⚠️ Field library is empty - will use form_fields table instead")
        # Get mappings from old form_fields table
        cursor.execute("""
            SELECT id, name, field_type, has_pricing, default_price_gbp 
            FROM form_fields 
            WHERE tenant_id = %s AND is_active = true
            ORDER BY name
        """, (TENANT_ID,))
        fields = cursor.fetchall()
        
        field_mappings = {}
        for field in fields:
            field_mappings[field['name']] = {
                'id': field['id'],
                'field_type': field['field_type'],
                'has_pricing': field['has_pricing'],
                'unit_price': field['default_price_gbp'] or 0
            }
        
        logger.info(f"📝 Loaded {len(field_mappings)} fields from form_fields table")
        return field_mappings
    else:
        # Get mappings from field library
        cursor.execute("""
            SELECT id, name, label, field_type, has_pricing, unit_price
            FROM field_library 
            WHERE tenant_id = %s AND active = true
            ORDER BY name
        """, (TENANT_ID,))
        fields = cursor.fetchall()
        
        field_mappings = {}
        for field in fields:
            field_mappings[field['name']] = {
                'id': field['id'],
                'field_type': field['field_type'],
                'has_pricing': field['has_pricing'],
                'unit_price': field['unit_price'] or 0
            }
        
        logger.info(f"📝 Loaded {len(field_mappings)} fields from field_library")
        return field_mappings

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

def create_form_responses_perfect(row, form_type='nikkah', field_mappings=None):
    """Create perfect form_responses JSON structure with proper toggle handling."""
    form_responses = {}
    form_total = Decimal('0.00')
    
    try:
        if not field_mappings:
            return {}, Decimal('0.00')
        
        # PowerApps to internal field mappings
        if form_type == 'nikkah':
            powerapp_mappings = {
                'ma_nikahextrahoursyesno': ('extra_hour', 'ma_nikahextrahoursprice', 'fixed_price_quantity_notes_toggle'),
                'ma_nikahtopuplambyesno': ('top_up_lamb', 'ma_nikahtopuplambprice', 'fixed_price_notes_toggle'),
                'ma_nikahwelcomedrinksyesno': ('welcome_drinks', 'ma_nikahwelcomedrinksprice', 'fixed_price_notes_toggle'),
                'ma_nikahchoiceofstage': ('choice_of_stage', None, 'text_field'),
                'ma_nikahdesserttableyesno': ('dessert_table', 'ma_nikahdesserttableprice', 'fixed_price_notes_toggle'),
                'ma_nikahfruittableyesno': ('fruit_table', 'ma_nikahfruittableprice', 'fixed_price_notes_toggle'),
                'ma_nikahfullcutleryyesno': ('full_cutlery', 'ma_nikahfullcutleryprice', 'fixed_price_notes_toggle'),
                'ma_nikahfogandsparkleyesno': ('fog_and_sparkle', 'ma_nikahfogandsparkleprice', 'fixed_price_notes_toggle'),
                'ma_nikahfruityesno': ('fruit', 'ma_nikahfruitprice', 'fixed_price_notes_toggle'),
                'ma_nikahextra1yesno': ('extra_1', 'ma_nikahextra1price', 'fixed_price_notes_toggle'),
                'ma_nikahextra2yesno': ('extra_2', 'ma_nikahextra2price', 'fixed_price_notes_toggle'),
                'ma_nikahextra3yesno': ('extra_3', 'ma_nikahextra3price', 'fixed_price_notes_toggle'),
                'ma_nikahextra4yesno': ('extra_4', 'ma_nikahextra4price', 'fixed_price_notes_toggle'),
                'ma_nikahnotessection': ('notes', None, 'textarea_field')
            }
        else:  # reception
            powerapp_mappings = {
                'ma_themecolour': ('theme', None, 'text_field'),
                'ma_stage': ('stage', None, 'text_field'),
                'ma_weddingfavours': ('wedding_favours', None, 'text_field'),
                'ma_centrepieces': ('centerpieces', None, 'text_field'),
                'ma_setup': ('setup', None, 'text_field'),
                'ma_dinnertime': ('dinner_time', None, 'text_field'),
                'ma_starter': ('starter', None, 'text_field'),
                'ma_maincourse': ('main_course', None, 'text_field'),
                'ma_dessert': ('dessert', None, 'text_field'),
                'ma_specialrequest1': ('special_request_1', None, 'text_field'),
                'ma_specialrequest2': ('special_request_2', None, 'text_field'),
                'ma_specialrequest3': ('special_request_3', None, 'text_field'),
                'ma_specialrequest4': ('special_request_4', None, 'text_field'),
                'ma_specialrequest5': ('special_request_5', None, 'text_field'),
                'ma_tissuesonplates': ('tissues_on_plates', None, 'text_field'),
                'ma_napkins': ('napkins', None, 'text_field'),
                'ma_welcomesign': ('welcome_sign', None, 'text_field'),
                'ma_djsystem': ('dj_system', None, 'text_field'),
                'ma_diningchairs': ('dining_chairs', None, 'select_field'),
                'ma_fullcutlery': ('full_cutlery', None, 'select_field'),
                'ma_cakefromnarmin': ('cake', 'ma_cakefromnarmin', 'fixed_price_notes_toggle'),
                'ma_carpetrunner': ('carpet_runner', 'ma_carpetrunner', 'fixed_price_notes_toggle'),
                'ma_desserttable': ('dessert_table', 'ma_desserttable', 'fixed_price_notes_toggle'),
                'ma_fruittable': ('fruit_table', 'ma_fruittable', 'fixed_price_notes_toggle'),
                'ma_teacoffeestation': ('tea_coffee_station', 'ma_teacoffeestation', 'fixed_price_notes_toggle'),
                'ma_receptionfogandsparkle': ('fog_and_sparkle', 'ma_receptionfogandsparkle', 'fixed_price_notes_toggle'),
                'ma_welcomedrinks': ('welcome_drinks', 'ma_welcomedrinks', 'fixed_price_notes_toggle'),
                'ma_invitationbycard': ('invitation_by_card', 'ma_invitationbycard', 'fixed_price_notes_toggle'),
                'ma_password': ('password', 'ma_password', 'fixed_price_notes_toggle'),
                'ma_receptionextra1yesno': ('extra_1', 'ma_receptionextra1price', 'fixed_price_notes_toggle'),
                'ma_receptionextra2yesno': ('extra_2', 'ma_receptionextra2price', 'fixed_price_notes_toggle'),
                'ma_receptionextra3yesno': ('extra_3', 'ma_receptionextra3price', 'fixed_price_notes_toggle'),
                'ma_receptionextra4yesno': ('extra_4', 'ma_receptionextra4price', 'fixed_price_notes_toggle'),
                'ma_notessection': ('notes', None, 'textarea_field')
            }
        
        for powerapp_field, mapping_data in powerapp_mappings.items():
            our_field, price_field, expected_field_type = mapping_data
            
            if our_field not in field_mappings:
                logger.debug(f"Field '{our_field}' not found in field library - skipping")
                continue
                
            field_info = field_mappings[our_field]
            field_library_id = field_info['id']
            
            # Create base field response structure
            field_response = {
                'enabled': False,
                'price': 0,
                'quantity': 1,
                'pricing_type': 'fixed',
                'notes': '',
                'label': our_field.replace('_', ' ').title(),
                'selections': []
            }
            
            # Handle different field types
            if expected_field_type == 'fixed_price_notes_toggle':
                enabled = safe_bool(row.get(powerapp_field, False))
                price = safe_decimal(row.get(price_field, 0)) if price_field else Decimal('0')
                
                field_response['enabled'] = enabled
                field_response['price'] = float(price)
                
                if enabled and price > 0:
                    form_total += price
                    
            elif expected_field_type == 'fixed_price_quantity_notes_toggle':
                enabled = safe_bool(row.get(powerapp_field, False))
                quantity = safe_int(row.get(powerapp_field.replace('yesno', 'quantity'), 1))
                price_per_unit = safe_decimal(row.get(price_field, 0)) if price_field else Decimal('0')
                
                field_response['enabled'] = enabled
                field_response['quantity'] = quantity
                field_response['price'] = float(price_per_unit * quantity)
                
                if enabled and price_per_unit > 0:
                    form_total += price_per_unit * quantity
                    
            elif expected_field_type == 'select_field':
                selection = safe_string(row.get(powerapp_field, ''))
                field_response['enabled'] = bool(selection)
                field_response['selections'] = [selection] if selection else []
                field_response['notes'] = selection
                
            elif expected_field_type in ['text_field', 'textarea_field']:
                text_value = safe_string(row.get(powerapp_field, ''))
                field_response['enabled'] = bool(text_value)
                field_response['notes'] = text_value
            
            form_responses[field_library_id] = field_response
        
        logger.debug(f"Created {form_type} responses: {len(form_responses)} fields, total: £{form_total}")
        return form_responses, form_total
    
    except Exception as e:
        logger.error(f"Error creating form responses for {form_type}: {e}")
        logger.error(traceback.format_exc())
        return {}, Decimal('0.00')

def import_all_days_events():
    """Main import function with perfect field mapping."""
    logger.info("🚀 Starting PERFECT All Days import process...")
    
    try:
        # Load CSV file
        logger.info("📂 Loading CSV file...")
        df = pd.read_csv('ma_alldaies.csv')
        logger.info(f"📊 Loaded {len(df)} records from CSV")
        
        # Connect to database
        logger.info("🔌 Connecting to database...")
        conn = psycopg2.connect(**DB_CONFIG)
        conn.autocommit = False
        
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            # Load field mappings from database
            field_mappings = get_field_library_mappings(cursor)
        
        success_count = 0
        error_count = 0
        errors = []
        
        logger.info("📝 Starting import process...")
        
        for index, row in df.iterrows():
            try:
                logger.info(f"📝 Processing row {index + 1}/{len(df)}")
                
                with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                    # Start new transaction
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
                    
                    # Parse dates
                    event_start_datetime = parse_powerapp_datetime(
                        row.get('ma_nikahstartdatetime'), 
                        'ma_nikahstartdatetime'
                    )
                    event_end_datetime = parse_powerapp_datetime(
                        row.get('ma_nikahendatetime'), 
                        'ma_nikahendatetime'
                    )
                    
                    if event_start_datetime:
                        event_start_date = event_start_datetime.date()
                        start_time_obj = event_start_datetime.time()
                        
                        if event_end_datetime:
                            event_end_date = event_end_datetime.date()
                            end_time_obj = event_end_datetime.time()
                        else:
                            event_end_date = event_start_date
                            end_hour = (event_start_datetime.hour + 4) % 24
                            end_time_obj = time(end_hour, event_start_datetime.minute)
                    else:
                        logger.error(f"❌ No valid start date found for '{event_name}' - SKIPPING")
                        error_count += 1
                        errors.append(f"Row {index + 1}: No valid start date for event '{event_name}'")
                        continue
                    
                    # Guest counts - separate for Nikkah and Reception
                    nikkah_men = safe_int(row.get('ma_nikahmencount', 0))
                    nikkah_ladies = safe_int(row.get('ma_nikahladiescount', 0))
                    reception_men = safe_int(row.get('ma_receptionmencount', 0))
                    reception_ladies = safe_int(row.get('ma_receptionladiescount', 0))
                    
                    # Use reception counts for main event (as it's usually the larger number)
                    event_men_count = reception_men
                    event_ladies_count = reception_ladies
                    total_guests = event_men_count + event_ladies_count
                    
                    # Financial data
                    nikkah_guest_price = safe_decimal(row.get('ma_nikahtotalguestprice', 0))
                    reception_guest_price = safe_decimal(row.get('ma_receptiontotalguestprice', 0))
                    total_guest_price = nikkah_guest_price + reception_guest_price
                    deposit_amount = safe_decimal(row.get('ma_depositamount', 0))
                    
                    # Create event record
                    event_id = str(uuid.uuid4())
                    
                    logger.info(f"💾 Inserting event: '{event_name}' on {event_start_date}")
                    
                    cursor.execute("""
                        INSERT INTO events (
                            id, tenant_id, customer_id, title, event_type, 
                            event_date, event_end_date,
                            start_time, end_time,
                            men_count, ladies_count,
                            total_guest_price_gbp, deposit_amount_gbp,
                            primary_contact_name, primary_contact_number,
                            ethnicity,
                            created_at, updated_at
                        ) VALUES (
                            %s, %s, %s, %s, %s,
                            %s, %s,
                            %s, %s,
                            %s, %s,
                            %s, %s,
                            %s, %s,
                            %s,
                            %s, %s
                        )
                    """, (
                        event_id, TENANT_ID, customer_id, event_name, ALL_DAY_EVENT_TYPE,
                        event_start_date, event_end_date,
                        start_time_obj, end_time_obj,
                        event_men_count, event_ladies_count,
                        float(total_guest_price), float(deposit_amount),
                        primary_contact, primary_phone,
                        safe_string(row.get('ma_ethnicity', '')),
                        datetime.now(), datetime.now()
                    ))
                    
                    # Create Nikkah form responses
                    nikkah_responses, nikkah_total = create_form_responses_perfect(
                        row, 'nikkah', field_mappings
                    )
                    
                    # Create Reception form responses
                    reception_responses, reception_total = create_form_responses_perfect(
                        row, 'reception', field_mappings
                    )
                    
                    # Create Nikkah event form
                    nikkah_form_id = str(uuid.uuid4())
                    cursor.execute("""
                        INSERT INTO event_forms (
                            id, tenant_id, event_id, form_id,
                            form_label, tab_order, form_responses, form_total,
                            men_count, ladies_count, guest_count,
                            is_active, created_at, updated_at
                        ) VALUES (
                            %s, %s, %s, %s,
                            %s, %s, %s, %s,
                            %s, %s, %s,
                            %s, %s, %s
                        )
                    """, (
                        nikkah_form_id, TENANT_ID, event_id, NIKKAH_FORM_ID,
                        'Nikkah', 1, json.dumps(nikkah_responses), float(nikkah_total),
                        nikkah_men, nikkah_ladies, nikkah_men + nikkah_ladies,
                        True, datetime.now(), datetime.now()
                    ))
                    
                    # Create Reception event form
                    reception_form_id = str(uuid.uuid4())
                    cursor.execute("""
                        INSERT INTO event_forms (
                            id, tenant_id, event_id, form_id,
                            form_label, tab_order, form_responses, form_total,
                            men_count, ladies_count, guest_count,
                            is_active, created_at, updated_at
                        ) VALUES (
                            %s, %s, %s, %s,
                            %s, %s, %s, %s,
                            %s, %s, %s,
                            %s, %s, %s
                        )
                    """, (
                        reception_form_id, TENANT_ID, event_id, RECEPTION_FORM_ID,
                        'Reception', 2, json.dumps(reception_responses), float(reception_total),
                        reception_men, reception_ladies, reception_men + reception_ladies,
                        True, datetime.now(), datetime.now()
                    ))
                    
                    # Update event with calculated totals
                    total_form_amount = nikkah_total + reception_total
                    total_event_amount = total_guest_price + total_form_amount
                    
                    cursor.execute("""
                        UPDATE events SET 
                            form_total_gbp = %s,
                            updated_at = %s
                        WHERE id = %s
                    """, (
                        float(total_form_amount),
                        datetime.now(),
                        event_id
                    ))
                    
                    # Commit transaction
                    conn.commit()
                    success_count += 1
                    logger.info(f"✅ Successfully imported: '{event_name}' with £{total_form_amount} forms total")
                    
            except Exception as e:
                conn.rollback()
                error_msg = f"Row {index + 1}: {str(e)}"
                logger.error(f"❌ Error importing: {error_msg}")
                logger.error(traceback.format_exc())
                errors.append(error_msg)
                error_count += 1
                continue
        
        # Summary
        logger.info("=" * 80)
        logger.info("📊 PERFECT IMPORT SUMMARY")
        logger.info("=" * 80)
        logger.info(f"✅ Successfully imported: {success_count} events")
        logger.info(f"❌ Failed imports: {error_count} events")
        logger.info("=" * 80)
        
        if errors:
            logger.info("❌ ERRORS:")
            for error in errors:
                logger.info(f"  - {error}")
        
        return success_count, error_count, errors
        
    except Exception as e:
        logger.error(f"💥 Critical error: {e}")
        logger.error(traceback.format_exc())
        return 0, 0, [str(e)]
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    import os
    if not os.path.exists('ma_alldaies.csv'):
        print("❌ Error: ma_alldaies.csv file not found!")
        sys.exit(1)
    
    print("🚀 PERFECT ALL DAYS IMPORT SCRIPT")
    print("=" * 50)
    print("✅ Perfect field mapping with toggles, prices, quantities, and notes")
    print("✅ Proper guest count handling for Nikkah and Reception forms")
    print("✅ Financial calculations with form totals")
    print("✅ All Day event type with automatic form assignment")
    print("")
    
    response = input("🤔 Proceed with perfect import? (y/N): ").strip().lower()
    if response not in ['y', 'yes']:
        print("❌ Import cancelled.")
        sys.exit(0)
    
    print("\n🚀 Starting perfect import...")
    success, errors, error_list = import_all_days_events()
    
    print("\n" + "=" * 50)
    if success > 0:
        print(f"🎉 Perfect import completed!")
        print(f"✅ Records imported: {success}")
        if errors > 0:
            print(f"⚠️  Records with errors: {errors}")
    else:
        print("❌ Import failed.")
        if error_list:
            print("💥 Errors:")
            for error in error_list:
                print(f"  - {error}")
    print("=" * 50)