#!/usr/bin/env python3
"""
CORRECTED All Days Import Script - Schema Compliant
Fixes all critical issues: JSON ethnicity, proper field mappings, correct table structure
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
        logging.FileHandler('all_days_import_corrected.log', encoding='utf-8'),
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

# Form IDs for Nikkah and Reception forms (will be loaded from DB)
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

def validate_database_schema(cursor):
    """Validate database schema before import."""
    logger.info("🔍 Validating database schema...")
    
    try:
        # Check events table structure
        cursor.execute("""
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'events' AND table_schema = 'public'
            ORDER BY ordinal_position
        """)
        events_columns = cursor.fetchall()
        
        required_events_fields = ['id', 'tenant_id', 'title', 'event_date', 'ethnicity']
        missing_fields = []
        
        column_names = [col['column_name'] for col in events_columns]
        for field in required_events_fields:
            if field not in column_names:
                missing_fields.append(field)
        
        if missing_fields:
            raise ValueError(f"Missing required fields in events table: {missing_fields}")
        
        logger.info(f"✅ Events table schema validated - {len(events_columns)} columns found")
        
        # Check form_fields table
        cursor.execute("""
            SELECT COUNT(*) as count FROM form_fields 
            WHERE tenant_id = %s AND is_active = true
        """, (TENANT_ID,))
        
        form_fields_count = cursor.fetchone()['count']
        if form_fields_count == 0:
            raise ValueError("No active form fields found for tenant")
        
        logger.info(f"✅ Form fields validated - {form_fields_count} active fields found")
        
        # Check ethnicity options
        cursor.execute("""
            SELECT COUNT(*) as count FROM event_ethnicity_options 
            WHERE tenant_id = %s AND is_active = true
        """, (TENANT_ID,))
        
        ethnicity_count = cursor.fetchone()['count']
        logger.info(f"✅ Ethnicity options validated - {ethnicity_count} options found")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Schema validation failed: {e}")
        return False

def load_form_field_mappings(cursor):
    """Load form field mappings from database."""
    logger.info("📚 Loading form field mappings...")
    
    cursor.execute("""
        SELECT id, name, field_type, has_pricing, default_price_gbp 
        FROM form_fields 
        WHERE tenant_id = %s AND is_active = true
        ORDER BY name
    """, (TENANT_ID,))
    
    fields = cursor.fetchall()
    field_mappings = {}
    
    for field in fields:
        field_mappings[field['name'].lower().replace(' ', '_')] = {
            'id': field['id'],
            'name': field['name'],
            'field_type': field['field_type'],
            'has_pricing': field['has_pricing'],
            'unit_price': field['default_price_gbp'] or 0
        }
    
    logger.info(f"📝 Loaded {len(field_mappings)} field mappings")
    return field_mappings

def load_ethnicity_mappings(cursor):
    """Load ethnicity mappings from database."""
    logger.info("🌍 Loading ethnicity mappings...")
    
    cursor.execute("""
        SELECT id, ethnicity_name 
        FROM event_ethnicity_options 
        WHERE tenant_id = %s AND is_active = true
        ORDER BY ethnicity_name
    """, (TENANT_ID,))
    
    ethnicities = cursor.fetchall()
    ethnicity_mappings = {}
    
    for ethnicity in ethnicities:
        ethnicity_mappings[ethnicity['ethnicity_name'].lower()] = ethnicity['id']
    
    logger.info(f"🌍 Loaded {len(ethnicity_mappings)} ethnicity mappings")
    return ethnicity_mappings

def map_ethnicity_to_json(ethnicity_string, ethnicity_mappings):
    """Convert ethnicity string to JSON array of ethnicity IDs."""
    if not ethnicity_string or pd.isna(ethnicity_string):
        return None
    
    ethnicity_string = safe_string(ethnicity_string).lower().strip()
    if not ethnicity_string:
        return None
    
    # Try exact match first
    if ethnicity_string in ethnicity_mappings:
        return [ethnicity_mappings[ethnicity_string]]
    
    # Try partial matches
    matches = []
    for name, id in ethnicity_mappings.items():
        if ethnicity_string in name or name in ethnicity_string:
            matches.append(id)
    
    if matches:
        return matches[:1]  # Return first match
    
    logger.warning(f"No ethnicity mapping found for: '{ethnicity_string}'")
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

def create_form_responses_corrected(row, form_type='nikkah', field_mappings=None):
    """Create corrected form_responses JSON structure."""
    form_responses = {}
    form_total = Decimal('0.00')
    
    try:
        if not field_mappings:
            return {}, Decimal('0.00')
        
        # PowerApps to internal field mappings with correct field names
        if form_type == 'nikkah':
            powerapp_mappings = {
                'ma_nikahextrahoursyesno': ('extra_hour', 'ma_nikahextrahoursprice'),
                'ma_nikahtopuplambyesno': ('extra_1', 'ma_nikahtopuplambprice'),  # Map to available fields
                'ma_nikahwelcomedrinksyesno': ('extra_2', 'ma_nikahwelcomedrinksprice'),
                'ma_nikahdesserttableyesno': ('dessert_table', 'ma_nikahdesserttableprice'),
                'ma_nikahfruittableyesno': ('fruit_table', 'ma_nikahfruittableprice'),
                'ma_nikahfullcutleryyesno': ('full_cutlery', 'ma_nikahfullcutleryprice'),
                'ma_nikahfogandsparkleyesno': ('fog_and_sparkles', 'ma_nikahfogandsparkleprice'),
                'ma_nikahfruityesno': ('fruit_baskets', 'ma_nikahfruitprice'),
                'ma_nikahextra1yesno': ('extra_3', 'ma_nikahextra1price'),
                'ma_nikahextra2yesno': ('extra_4', 'ma_nikahextra2price'),
                'ma_nikahextra3yesno': ('extra_5', 'ma_nikahextra3price'),
                'ma_nikahextra4yesno': ('extra_6', 'ma_nikahextra4price'),
                'ma_nikahnotessection': ('notes_section', None)
            }
        else:  # reception
            powerapp_mappings = {
                'ma_themecolour': ('notes_section', None),  # Map theme to notes
                'ma_stage': ('notes_section', None),
                'ma_weddingfavours': ('notes_section', None),
                'ma_centrepieces': ('centrepieces', None),
                'ma_setup': ('setup', None),
                'ma_dinnertime': ('dinner_time', None),
                'ma_starter': ('notes_section', None),
                'ma_maincourse': ('main_course', None),
                'ma_dessert': ('dessert', None),
                'ma_specialrequest1': ('special_request_1', None),
                'ma_specialrequest2': ('special_request_2', None),
                'ma_diningchairs': ('dining_chairs', None),
                'ma_fullcutlery': ('full_cutlery', None),
                'ma_cakefromnarmin': ('cake', 'ma_cakefromnarmin'),
                'ma_carpetrunner': ('carpet_runner', 'ma_carpetrunner'),
                'ma_desserttable': ('dessert_table', 'ma_desserttable'),
                'ma_fruittable': ('fruit_table', 'ma_fruittable'),
                'ma_receptionfogandsparkle': ('fog_and_sparkles', 'ma_receptionfogandsparkle'),
                'ma_invitationbycard': ('invitation_by_card', 'ma_invitationbycard'),
                'ma_password': ('password', 'ma_password'),
                'ma_receptionextra1yesno': ('extra_1', 'ma_receptionextra1price'),
                'ma_receptionextra2yesno': ('extra_2', 'ma_receptionextra2price'),
                'ma_receptionextra3yesno': ('extra_3', 'ma_receptionextra3price'),
                'ma_receptionextra4yesno': ('extra_4', 'ma_receptionextra4price'),
                'ma_notessection': ('notes_section', None)
            }
        
        for powerapp_field, mapping_data in powerapp_mappings.items():
            our_field, price_field = mapping_data
            
            if our_field not in field_mappings:
                logger.debug(f"Field '{our_field}' not found in mappings - skipping")
                continue
                
            field_info = field_mappings[our_field]
            field_id = field_info['id']
            field_type = field_info['field_type']
            
            # Create base field response structure
            field_response = {
                'enabled': False,
                'price': 0,
                'quantity': 1,
                'notes': '',
                'selections': []
            }
            
            # Handle different field types based on actual database schema
            if field_type == 'fixed_price_notes_toggle' and field_info['has_pricing']:
                enabled = safe_bool(row.get(powerapp_field, False))
                price = safe_decimal(row.get(price_field, 0)) if price_field else Decimal('0')
                
                field_response['enabled'] = enabled
                field_response['price'] = float(price)
                
                if enabled and price > 0:
                    form_total += price
                    
            elif field_type == 'dropdown_options':
                selection = safe_string(row.get(powerapp_field, ''))
                field_response['enabled'] = bool(selection)
                field_response['selections'] = [selection] if selection else []
                field_response['notes'] = selection
                
            elif field_type == 'text_notes_only':
                text_value = safe_string(row.get(powerapp_field, ''))
                field_response['enabled'] = bool(text_value)
                field_response['notes'] = text_value
            
            form_responses[field_id] = field_response
        
        logger.debug(f"Created {form_type} responses: {len(form_responses)} fields, total: £{form_total}")
        return form_responses, form_total
    
    except Exception as e:
        logger.error(f"Error creating form responses for {form_type}: {e}")
        logger.error(traceback.format_exc())
        return {}, Decimal('0.00')

def import_all_days_events():
    """Main import function with schema compliance."""
    logger.info("🚀 Starting CORRECTED All Days import process...")
    
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
            # Validate schema first
            if not validate_database_schema(cursor):
                raise ValueError("Database schema validation failed")
            
            # Load mappings
            field_mappings = load_form_field_mappings(cursor)
            ethnicity_mappings = load_ethnicity_mappings(cursor)
        
        success_count = 0
        error_count = 0
        errors = []
        
        logger.info("📝 Starting corrected import process...")
        
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
                    
                    # Guest counts
                    nikkah_men = safe_int(row.get('ma_nikahmencount', 0))
                    nikkah_ladies = safe_int(row.get('ma_nikahladiescount', 0))
                    reception_men = safe_int(row.get('ma_receptionmencount', 0))
                    reception_ladies = safe_int(row.get('ma_receptionladiescount', 0))
                    
                    # Use reception counts for main event (as it's usually the larger number)
                    event_men_count = reception_men
                    event_ladies_count = reception_ladies
                    
                    # Financial data
                    nikkah_guest_price = safe_decimal(row.get('ma_nikahtotalguestprice', 0))
                    reception_guest_price = safe_decimal(row.get('ma_receptiontotalguestprice', 0))
                    total_guest_price = nikkah_guest_price + reception_guest_price
                    deposit_amount = safe_decimal(row.get('ma_depositamount', 0))
                    
                    # Handle ethnicity properly as JSON
                    ethnicity_string = safe_string(row.get('ma_ethnicity', ''))
                    ethnicity_json = map_ethnicity_to_json(ethnicity_string, ethnicity_mappings)
                    
                    # Create event record with correct field names and proper JSON handling
                    event_id = str(uuid.uuid4())
                    
                    logger.info(f"💾 Inserting event: '{event_name}' on {event_start_date}")
                    logger.debug(f"Ethnicity: '{ethnicity_string}' -> {ethnicity_json}")
                    
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
                        json.dumps(ethnicity_json) if ethnicity_json else None,
                        datetime.now(), datetime.now()
                    ))
                    
                    # Create Nikkah form responses
                    nikkah_responses, nikkah_total = create_form_responses_corrected(
                        row, 'nikkah', field_mappings
                    )
                    
                    # Create Reception form responses
                    reception_responses, reception_total = create_form_responses_corrected(
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
                
                # Stop after 5 consecutive errors to avoid flooding
                if error_count >= 5 and success_count == 0:
                    logger.error("💥 Too many consecutive errors - stopping import")
                    break
                continue
        
        # Summary
        logger.info("=" * 80)
        logger.info("📊 CORRECTED IMPORT SUMMARY")
        logger.info("=" * 80)
        logger.info(f"✅ Successfully imported: {success_count} events")
        logger.info(f"❌ Failed imports: {error_count} events")
        logger.info("=" * 80)
        
        if errors:
            logger.info("❌ ERRORS:")
            for error in errors[:10]:  # Show first 10 errors
                logger.info(f"  - {error}")
            if len(errors) > 10:
                logger.info(f"  ... and {len(errors) - 10} more errors")
        
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
    
    print("🚀 CORRECTED ALL DAYS IMPORT SCRIPT")
    print("=" * 50)
    print("✅ Schema-compliant with proper JSON handling")
    print("✅ Dynamic field mapping from database")
    print("✅ Ethnicity conversion to proper JSON format")
    print("✅ Enhanced error handling and validation")
    print("✅ Early termination on fundamental errors")
    print("")
    
    response = input("🤔 Proceed with corrected import? (y/N): ").strip().lower()
    if response not in ['y', 'yes']:
        print("❌ Import cancelled.")
        sys.exit(0)
    
    print("\n🚀 Starting corrected import...")
    success, errors, error_list = import_all_days_events()
    
    print("\n" + "=" * 50)
    if success > 0:
        print(f"🎉 Corrected import completed!")
        print(f"✅ Records imported: {success}")
        if errors > 0:
            print(f"⚠️  Records with errors: {errors}")
    else:
        print("❌ Import failed.")
        if error_list:
            print("💥 First few errors:")
            for error in error_list[:5]:
                print(f"  - {error}")
    print("=" * 50)