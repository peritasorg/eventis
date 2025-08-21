# Google Calendar Sync Setup Instructions

## Prerequisites

1. **Python 3.8+** installed on your system
2. **Google Cloud Project** with Calendar API enabled
3. **Your Tenant ID** from Supabase

## Setup Steps

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Google Calendar API Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Google Calendar API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google Calendar API"
   - Click "Enable"

4. Create OAuth 2.0 Credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Choose "Desktop application"
   - Download the JSON file and save it as `credentials.json` in the same directory as the script

### 3. Get Your Tenant ID

1. Go to your Supabase project
2. Open the SQL Editor
3. Run this query to find your tenant ID:
```sql
SELECT id, business_name FROM tenants WHERE active = true;
```
4. Copy your tenant ID

### 4. Configure the Script

1. Open `google_calendar_sync_perfect.py`
2. Replace `TENANT_ID = "your-tenant-id-here"` with your actual tenant ID
3. Save the file

### 5. Set Up Google Calendar Integration in Supabase

Make sure you have an active calendar integration in your Supabase `calendar_integrations` table:
- The script will automatically find it using your tenant ID
- The integration should have `is_active = true`

## Running the Script

```bash
python google_calendar_sync_perfect.py
```

### First Run
- The script will open a browser window for Google authentication
- Allow access to your Google Calendar
- The script will save your authentication token for future use

### Script Options

1. **Clean up calendar**: Delete all events from a specified date
2. **Dry run sync**: Preview what events would be synced (recommended first)
3. **Full sync**: Create Google Calendar events and update Supabase with external IDs

## Important Notes

- **Tenant ID**: You MUST update the TENANT_ID in the script
- **Rate Limiting**: The script includes 1.2-second delays between API calls
- **Date Range**: Syncs events from August 1, 2025 to January 31, 2028
- **Logging**: All operations are logged to `calendar_sync.log`
- **Backup**: Always run a dry run first to preview changes

## Troubleshooting

### "No active calendar integration found"
- Check that you have a record in `calendar_integrations` table
- Ensure `is_active = true` and `tenant_id` matches your tenant

### Authentication Issues
- Delete `token.json` and re-authenticate
- Ensure `credentials.json` is in the correct location
- Check that Calendar API is enabled in Google Cloud Console

### Field Mapping Issues
- The script maps field IDs to human names - update `_get_field_mappings()` if needed
- Only fields with prices or notes are shown in calendar descriptions

## Field Mapping Reference

The script looks for these specific field IDs in your form responses:

**Nikkah Fields:**
- `quick_time_nikkah`
- `top_up_lamb`
- `fruit_basket_nikkah`
- `fruit_table_nikkah`
- `pancake_station_nikkah`

**Reception Fields:**
- `quick_time_reception`
- `starter`
- `main_course`
- `dessert`
- `fruit_basket_reception`
- `fruit_table_reception`
- `dessert_table`
- `pancake_station_reception`
- `welcome_drinks`

Update the `_get_field_mappings()` method if your field IDs are different.