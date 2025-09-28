connectors.py is a script from landing.ai that's a nice general-purpose file access utility script.
Source url: https://github.com/landing-ai/agentic-doc/blob/main/agentic_doc/connectors.py

Test files for AWS S3 and Google Drive require credentials:
AWS - Log into identity center and create short lived tokens. Export these in the shell where you run this file.
Google Drive - Create Google project if doesn't exist.

Python environment:
Create a virtual environment and install packages in requirements.txt

Configuring Google Drive for your connector:
To configure your Google Drive so that you can get the keys needed to use with this server (as seen in the GoogleDriveConnector class in the agentic-doc repo), follow these steps:

Go to the Google Cloud Console and log in with the Google account you want to use for Drive access.

Create a New Project (if you don’t already have one for your integration).

Enable the Google Drive API for your project:

In the “APIs & Services” section, go to “Library”.

Search for “Google Drive API” and enable it.

Create OAuth Client Credentials:

Go to “APIs & Services” > “Credentials”.

Click “Create Credentials” → “OAuth client ID”.

Set the application type to “Desktop app” (for development and server-side).

Name your credential and click “Create”.

Download the resulting client_secret.json file and store it securely. This is your client secret file—you’ll reference this in your connector configuration.

Authenticate and Generate token.json:

Run your code that uses the GoogleDriveConnector. The first time, it will trigger an OAuth consent flow using the information in your client_secret.json.

Upon successful authentication (in your browser), a token.json file will be created automatically. This file contains the access and refresh tokens your application needs to access Drive.

Connector Usage:

In your server configuration, reference the downloaded client_secret.json using the client_secret_file parameter.

On future runs, your code will use the token from token.json and refresh it as needed.
