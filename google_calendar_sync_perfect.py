#!/usr/bin/env python3
"""
Perfect Google Calendar Sync Script
Syncs Supabase events to Google Calendar with proper formatting
Handles Nikkah, Reception, and All Day event types
"""

import os
import json
import time
from datetime import datetime, date, timedelta
from typing import Dict, List, Optional, Any
import logging

# Google Calendar API
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

# Supabase
from supabase import create_client, Client

# Configuration
SCOPES = ['https://www.googleapis.com/auth/calendar']
SUPABASE_URL = "https://vbowtpkisiabdwwgttry.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZib3d0cGtpc2lhYmR3d2d0dHJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAzNTY0MDUsImV4cCI6MjA2NTkzMjQwNX0.g-2yp1SgMTYA9doXALsPRO0dMJX4sE7Ol1DNBIymSFU"

# Your tenant ID - update this
TENANT_ID = "your-tenant-id-here"  # Replace with actual tenant ID

# Rate limiting
REQUEST_DELAY = 1.2  # seconds between API calls

# Logging setup
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('calendar_sync.log'),
        logging.StreamHandler()
    ]
)

class GoogleCalendarSync:
    def __init__(self):
        self.supabase: Client = None
        self.calendar_service = None
        self.calendar_id = None
        self.field_mappings = self._get_field_mappings()
        
    def _get_field_mappings(self) -> Dict[str, str]:
        """Map form field IDs to human-readable names"""
        return {
            # Nikkah fields
            "quick_time_nikkah": "Quick Time",
            "top_up_lamb": "Top Up Lamb",
            "fruit_basket_nikkah": "Fruit Basket", 
            "fruit_table_nikkah": "Fruit Table",
            "pancake_station_nikkah": "Pancake Station",
            
            # Reception fields  
            "quick_time_reception": "Quick Time",
            "starter": "Starter",
            "main_course": "Main Course", 
            "dessert": "Dessert",
            "fruit_basket_reception": "Fruit Basket",
            "fruit_table_reception": "Fruit Table",
            "dessert_table": "Dessert Table",
            "pancake_station_reception": "Pancake Station",
            "welcome_drinks": "Welcome Drinks",
        }
    
    def setup_google_auth(self, credentials_file: str = 'credentials.json', 
                         token_file: str = 'token.json'):
        """Setup Google Calendar API authentication"""
        creds = None
        
        if os.path.exists(token_file):
            creds = Credentials.from_authorized_user_file(token_file, SCOPES)
            
        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                creds.refresh(Request())
            else:
                if not os.path.exists(credentials_file):
                    raise FileNotFoundError(f"Please download your Google API credentials to {credentials_file}")
                
                flow = InstalledAppFlow.from_client_secrets_file(credentials_file, SCOPES)
                creds = flow.run_local_server(port=0)
                
            with open(token_file, 'w') as token:
                token.write(creds.to_json())
        
        self.calendar_service = build('calendar', 'v3', credentials=creds)
        logging.info("Google Calendar API authenticated successfully")
    
    def setup_supabase(self):
        """Setup Supabase client"""
        self.supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        logging.info("Supabase client initialized")
    
    def get_calendar_integration(self) -> Optional[str]:
        """Get the active calendar integration for the tenant"""
        try:
            result = self.supabase.table('calendar_integrations').select('calendar_id').eq('tenant_id', TENANT_ID).eq('is_active', True).single().execute()
            
            if result.data:
                self.calendar_id = result.data['calendar_id']
                logging.info(f"Found calendar integration: {self.calendar_id}")
                return self.calendar_id
            else:
                logging.error("No active calendar integration found")
                return None
                
        except Exception as e:
            logging.error(f"Error fetching calendar integration: {e}")
            return None
    
    def cleanup_calendar(self, from_date: str = "2025-08-01", dry_run: bool = False):
        """Delete all Google Calendar events from specified date onwards"""
        if not self.calendar_id:
            logging.error("No calendar ID available")
            return
            
        logging.info(f"{'DRY RUN: ' if dry_run else ''}Cleaning up calendar from {from_date}")
        
        try:
            # Convert date to RFC3339 format
            start_time = f"{from_date}T00:00:00Z"
            end_time = "2028-12-31T23:59:59Z"
            
            # Get all events in the date range
            events_result = self.calendar_service.events().list(
                calendarId=self.calendar_id,
                timeMin=start_time,
                timeMax=end_time,
                singleEvents=True,
                orderBy='startTime'
            ).execute()
            
            events = events_result.get('items', [])
            logging.info(f"Found {len(events)} events to delete")
            
            deleted_count = 0
            for event in events:
                if dry_run:
                    logging.info(f"Would delete: {event.get('summary', 'No title')} on {event.get('start', {}).get('date', event.get('start', {}).get('dateTime', 'Unknown'))}")
                else:
                    try:
                        self.calendar_service.events().delete(
                            calendarId=self.calendar_id,
                            eventId=event['id']
                        ).execute()
                        deleted_count += 1
                        logging.info(f"Deleted event {deleted_count}: {event.get('summary', 'No title')}")
                        time.sleep(REQUEST_DELAY)  # Rate limiting
                    except HttpError as e:
                        logging.error(f"Error deleting event {event['id']}: {e}")
            
            if not dry_run:
                logging.info(f"Successfully deleted {deleted_count} events from calendar")
            
        except Exception as e:
            logging.error(f"Error during calendar cleanup: {e}")
    
    def format_nikkah_description(self, event: Dict, form_data: Dict) -> str:
        """Format description for Nikkah events"""
        description_parts = []
        
        # Contact info
        if event.get('primary_contact_name'):
            description_parts.append(f"Primary Contact: {event['primary_contact_name']}")
        if event.get('primary_contact_number'):
            description_parts.append(f"Primary Contact No.: {event['primary_contact_number']}")
        
        description_parts.append("")  # Empty line
        
        # Quick time and counts
        quick_time = self._get_field_value(form_data, 'quick_time_nikkah')
        if quick_time:
            description_parts.append(f"Nikkah - {quick_time}:")
        else:
            description_parts.append("Nikkah:")
            
        men_count = form_data.get('men_count', 0)
        ladies_count = form_data.get('ladies_count', 0)
        description_parts.append(f"Men Count: {men_count}")
        description_parts.append(f"Ladies Count: {ladies_count}")
        
        description_parts.append("")  # Empty line
        
        # Toggle fields (only show if enabled and has price/notes)
        toggle_fields = ['top_up_lamb', 'fruit_basket_nikkah', 'fruit_table_nikkah', 'pancake_station_nikkah']
        for field_id in toggle_fields:
            field_info = self._get_field_info(form_data, field_id)
            if field_info and self._should_show_field(field_info):
                field_name = self.field_mappings.get(field_id, field_id)
                toggle_value = "Yes" if field_info.get('enabled') else "No"
                notes = field_info.get('notes', '').strip()
                
                if notes:
                    description_parts.append(f"{field_name} - {toggle_value} - {notes}")
                else:
                    description_parts.append(f"{field_name} - {toggle_value}")
        
        return "\n".join(description_parts)
    
    def format_reception_description(self, event: Dict, form_data: Dict) -> str:
        """Format description for Reception events"""
        description_parts = []
        
        # Contact info
        if event.get('primary_contact_name'):
            description_parts.append(f"Primary Contact: {event['primary_contact_name']}")
        if event.get('primary_contact_number'):
            description_parts.append(f"Primary Contact No.: {event['primary_contact_number']}")
        
        description_parts.append("")  # Empty line
        
        # Quick time and counts
        quick_time = self._get_field_value(form_data, 'quick_time_reception')
        if quick_time:
            description_parts.append(f"Reception - {quick_time}:")
        else:
            description_parts.append("Reception:")
            
        men_count = form_data.get('men_count', 0)
        ladies_count = form_data.get('ladies_count', 0)
        description_parts.append(f"Men Count: {men_count}")
        description_parts.append(f"Ladies Count: {ladies_count}")
        
        description_parts.append("")  # Empty line
        
        # Text fields (only show if has value)
        text_fields = ['starter', 'main_course', 'dessert']
        for field_id in text_fields:
            field_value = self._get_field_value(form_data, field_id)
            if field_value and field_value.strip():
                field_name = self.field_mappings.get(field_id, field_id)
                description_parts.append(f"{field_name} - {field_value.strip()}")
        
        # Toggle fields (only show if enabled and has price/notes)
        toggle_fields = ['fruit_basket_reception', 'fruit_table_reception', 'dessert_table', 
                        'pancake_station_reception', 'welcome_drinks']
        for field_id in toggle_fields:
            field_info = self._get_field_info(form_data, field_id)
            if field_info and self._should_show_field(field_info):
                field_name = self.field_mappings.get(field_id, field_id)
                toggle_value = "Yes" if field_info.get('enabled') else "No"
                notes = field_info.get('notes', '').strip()
                
                if notes:
                    description_parts.append(f"{field_name} - {toggle_value} - {notes}")
                else:
                    description_parts.append(f"{field_name} - {toggle_value}")
        
        return "\n".join(description_parts)
    
    def format_all_day_description(self, event: Dict, nikkah_form: Dict, reception_form: Dict) -> str:
        """Format description for All Day events (combination of Nikkah and Reception)"""
        nikkah_desc = self.format_nikkah_description(event, nikkah_form)
        reception_desc = self.format_reception_description(event, reception_form)
        
        separator = "\n" + "-" * 60 + "\n"
        return nikkah_desc + separator + reception_desc
    
    def _get_field_value(self, form_data: Dict, field_id: str) -> Optional[str]:
        """Get simple field value from form responses"""
        form_responses = form_data.get('form_responses', {})
        field_data = form_responses.get(field_id, {})
        return field_data.get('value') if isinstance(field_data, dict) else field_data
    
    def _get_field_info(self, form_data: Dict, field_id: str) -> Optional[Dict]:
        """Get complete field info from form responses"""
        form_responses = form_data.get('form_responses', {})
        return form_responses.get(field_id) if isinstance(form_responses.get(field_id), dict) else None
    
    def _should_show_field(self, field_info: Dict) -> bool:
        """Check if field should be shown in calendar (has price or notes)"""
        if not field_info:
            return False
            
        # Check if field is enabled/toggled
        if not field_info.get('enabled', False):
            return False
            
        # Check if has price or notes
        price = field_info.get('price', 0)
        notes = field_info.get('notes', '').strip()
        
        return price > 0 or len(notes) > 0
    
    def fetch_events_from_supabase(self, from_date: str = "2025-08-01", 
                                  to_date: str = "2028-01-31") -> List[Dict]:
        """Fetch all events from Supabase in the specified date range"""
        try:
            result = self.supabase.rpc('get_all_events_for_sync', {
                'p_tenant_id': TENANT_ID,
                'p_from_date': from_date
            }).execute()
            
            events = result.data if result.data else []
            
            # Filter by end date
            filtered_events = []
            for event in events:
                event_date = datetime.strptime(event['event_date'], '%Y-%m-%d').date()
                end_date = datetime.strptime(to_date, '%Y-%m-%d').date()
                
                if event_date <= end_date:
                    filtered_events.append(event)
            
            logging.info(f"Fetched {len(filtered_events)} events from Supabase")
            return filtered_events
            
        except Exception as e:
            logging.error(f"Error fetching events from Supabase: {e}")
            return []
    
    def determine_event_type(self, event_forms: List[Dict]) -> str:
        """Determine event type based on available forms"""
        form_labels = [form.get('form_label', '').lower() for form in event_forms]
        
        has_nikkah = any('nikkah' in label for label in form_labels)
        has_reception = any('reception' in label for label in form_labels)
        
        if has_nikkah and has_reception:
            return 'All Day'
        elif has_nikkah:
            return 'Nikkah'
        elif has_reception:
            return 'Reception'
        else:
            return 'Unknown'
    
    def create_google_calendar_event(self, event: Dict) -> Optional[str]:
        """Create a Google Calendar event and return its ID"""
        try:
            event_forms = event.get('event_forms', [])
            event_type = self.determine_event_type(event_forms)
            
            # Prepare event data
            start_time = event.get('start_time')
            end_time = event.get('end_time')
            event_date = event.get('event_date')
            
            # Create datetime objects
            if start_time and end_time:
                start_datetime = f"{event_date}T{start_time}"
                end_datetime = f"{event_date}T{end_time}"
            else:
                # All-day event
                start_datetime = event_date
                end_datetime = event.get('event_end_date', event_date)
            
            # Format description based on event type
            description = ""
            if event_type == 'Nikkah':
                nikkah_form = next((form for form in event_forms if 'nikkah' in form.get('form_label', '').lower()), {})
                description = self.format_nikkah_description(event, nikkah_form)
            elif event_type == 'Reception':
                reception_form = next((form for form in event_forms if 'reception' in form.get('form_label', '').lower()), {})
                description = self.format_reception_description(event, reception_form)
            elif event_type == 'All Day':
                nikkah_form = next((form for form in event_forms if 'nikkah' in form.get('form_label', '').lower()), {})
                reception_form = next((form for form in event_forms if 'reception' in form.get('form_label', '').lower()), {})
                description = self.format_all_day_description(event, nikkah_form, reception_form)
            
            # Create Google Calendar event
            calendar_event = {
                'summary': event.get('title', 'Untitled Event'),
                'description': description,
            }
            
            # Set time/date
            if start_time and end_time:
                calendar_event['start'] = {'dateTime': start_datetime, 'timeZone': 'Europe/London'}
                calendar_event['end'] = {'dateTime': end_datetime, 'timeZone': 'Europe/London'}
            else:
                calendar_event['start'] = {'date': start_datetime}
                calendar_event['end'] = {'date': end_datetime}
            
            # Create the event
            created_event = self.calendar_service.events().insert(
                calendarId=self.calendar_id,
                body=calendar_event
            ).execute()
            
            logging.info(f"Created Google Calendar event: {event.get('title')} ({event_type})")
            return created_event['id']
            
        except Exception as e:
            logging.error(f"Error creating Google Calendar event for {event.get('title', 'Unknown')}: {e}")
            return None
    
    def update_supabase_external_id(self, event_id: str, external_calendar_id: str) -> bool:
        """Update the external_calendar_id in Supabase"""
        try:
            result = self.supabase.table('events').update({
                'external_calendar_id': external_calendar_id
            }).eq('id', event_id).execute()
            
            if result.data:
                logging.info(f"Updated external_calendar_id for event {event_id}")
                return True
            else:
                logging.error(f"Failed to update external_calendar_id for event {event_id}")
                return False
                
        except Exception as e:
            logging.error(f"Error updating external_calendar_id for event {event_id}: {e}")
            return False
    
    def sync_all_events(self, dry_run: bool = False):
        """Main sync function - sync all events to Google Calendar"""
        logging.info(f"{'DRY RUN: ' if dry_run else ''}Starting complete event sync")
        
        # Fetch events
        events = self.fetch_events_from_supabase()
        
        if not events:
            logging.error("No events found to sync")
            return
        
        successful_syncs = 0
        failed_syncs = 0
        
        for i, event in enumerate(events, 1):
            logging.info(f"Processing event {i}/{len(events)}: {event.get('title', 'Untitled')}")
            
            if dry_run:
                event_type = self.determine_event_type(event.get('event_forms', []))
                logging.info(f"Would sync: {event.get('title')} ({event_type}) on {event.get('event_date')}")
                successful_syncs += 1
            else:
                # Create Google Calendar event
                external_id = self.create_google_calendar_event(event)
                
                if external_id:
                    # Update Supabase with external ID
                    if self.update_supabase_external_id(event['id'], external_id):
                        successful_syncs += 1
                    else:
                        failed_syncs += 1
                else:
                    failed_syncs += 1
                
                # Rate limiting
                time.sleep(REQUEST_DELAY)
        
        logging.info(f"Sync completed. Successful: {successful_syncs}, Failed: {failed_syncs}")
        
        if not dry_run and successful_syncs != len(events):
            logging.warning(f"Expected {len(events)} events but only {successful_syncs} were successfully synced")

def main():
    """Main function"""
    print("Perfect Google Calendar Sync Script")
    print("=" * 50)
    
    # Initialize sync class
    sync = GoogleCalendarSync()
    
    try:
        # Setup authentication and connections
        print("Setting up Google Calendar authentication...")
        sync.setup_google_auth()
        
        print("Setting up Supabase connection...")
        sync.setup_supabase()
        
        print("Getting calendar integration...")
        if not sync.get_calendar_integration():
            print("ERROR: No active calendar integration found. Please set up Google Calendar integration first.")
            return
        
        # Interactive menu
        while True:
            print("\nOptions:")
            print("1. Clean up calendar (delete events from date)")
            print("2. Dry run sync (preview what would be synced)")
            print("3. Full sync (create events and update Supabase)")
            print("4. Exit")
            
            choice = input("\nEnter your choice (1-4): ").strip()
            
            if choice == '1':
                from_date = input("Delete events from date (YYYY-MM-DD, default: 2025-08-01): ").strip()
                if not from_date:
                    from_date = "2025-08-01"
                
                confirm = input(f"Are you sure you want to delete all events from {from_date}? (yes/no): ").strip().lower()
                if confirm == 'yes':
                    sync.cleanup_calendar(from_date, dry_run=False)
                else:
                    print("Operation cancelled")
                    
            elif choice == '2':
                print("Running dry run sync...")
                sync.sync_all_events(dry_run=True)
                
            elif choice == '3':
                confirm = input("This will create Google Calendar events and update Supabase. Continue? (yes/no): ").strip().lower()
                if confirm == 'yes':
                    print("Starting full sync...")
                    sync.sync_all_events(dry_run=False)
                else:
                    print("Operation cancelled")
                    
            elif choice == '4':
                print("Goodbye!")
                break
                
            else:
                print("Invalid choice. Please try again.")
    
    except Exception as e:
        logging.error(f"Fatal error: {e}")
        print(f"Fatal error: {e}")

if __name__ == "__main__":
    main()