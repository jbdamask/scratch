#!/usr/bin/env python3
"""
Simple test script for Google Drive connector.
Requires Google Drive API credentials file (client_secret.json) in the current directory.
Uses the folder ID: 1F52cpSAj2uDt2dDKIUoq0KCsJDzEUEV-
"""

import os
from connectors import GoogleDriveConnectorConfig, create_connector

def test_google_drive_connector():
    """Test the Google Drive connector with the specified folder."""

    # Folder ID from the provided Google Drive URL
    folder_id = "1F52cpSAj2uDt2dDKIUoq0KCsJDzEUEV-"

    # Check for client secret file
    client_secret_file = "client_secret.json"
    if not os.path.exists(client_secret_file):
        print(f"❌ Client secret file not found: {client_secret_file}")
        print("Please download your Google Drive API credentials and save as 'client_secret.json'")
        print("Instructions: https://developers.google.com/drive/api/quickstart/python")
        return False

    # Create Google Drive connector config
    config = GoogleDriveConnectorConfig(
        client_secret_file=client_secret_file,
        folder_id=folder_id
    )

    # Create connector
    connector = create_connector(config)

    print(f"Testing Google Drive connector for folder: {folder_id}")
    print(f"Client secret file: {client_secret_file}")

    try:
        # List files in the folder
        print("\n--- Listing files ---")
        files = connector.list_files()
        if files:
            print(f"Found {len(files)} files:")
            for file_id in files[:10]:  # Show first 10 files
                # Get file info to show the name
                try:
                    file_info = connector.get_file_info(file_id)
                    print(f"  - {file_info['name']} (ID: {file_id})")
                except Exception as e:
                    print(f"  - {file_id} (could not get name: {e})")
            if len(files) > 10:
                print(f"  ... and {len(files) - 10} more files")
        else:
            print("No files found in folder")

        # If we have files, test getting info for the first one
        if files:
            first_file = files[0]
            print(f"\n--- Getting detailed info for first file ---")
            file_info = connector.get_file_info(first_file)
            for key, value in file_info.items():
                print(f"  {key}: {value}")

            # Test download (to temp directory)
            print(f"\n--- Downloading: {file_info['name']} ---")
            local_path = connector.download_file(first_file)
            print(f"Downloaded to: {local_path}")
            print(f"File size: {local_path.stat().st_size} bytes")

        print("\n✅ Google Drive connector test completed successfully!")

    except Exception as e:
        print(f"\n❌ Error testing Google Drive connector: {e}")
        print("\nTroubleshooting tips:")
        print("1. Make sure client_secret.json is valid")
        print("2. Ensure you have access to the specified folder")
        print("3. Check your internet connection")
        print("4. You may need to authorize the application in your browser")
        return False

    return True

if __name__ == "__main__":
    # Check if client secret file exists
    if not os.path.exists("client_secret.json"):
        print("❌ Missing client_secret.json file")
        print("\nTo use this test, you need to:")
        print("1. Go to the Google Cloud Console: https://console.cloud.google.com/")
        print("2. Create a new project or select an existing one")
        print("3. Enable the Google Drive API")
        print("4. Create credentials (OAuth 2.0 Client ID)")
        print("5. Download the credentials as 'client_secret.json'")
        print("6. Place the file in the same directory as this script")
        exit(1)

    print("🔑 Found client_secret.json - proceeding with test...")
    test_google_drive_connector()