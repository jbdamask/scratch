import os
import base64

# Read the PEM file and encode it to base64
with open("replit-saveplay.pem", "rb") as pem_file:
    pem_content = pem_file.read()
    base64_encoded_key = base64.b64encode(pem_content).decode('utf-8')

# Set the environment variable in Python (for this session)
os.environ['RSA_SECRET'] = base64_encoded_key

# Verify the environment variable is set correctly
print("RSA_SECRET:", os.getenv('RSA_SECRET'))

