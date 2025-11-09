import os
import base64
import sys

def encode_pem_file(pem_file_path):
    # Read the PEM file and encode it to base64
    with open(pem_file_path, "rb") as pem_file:
        pem_content = pem_file.read()
        base64_encoded_key = base64.b64encode(pem_content).decode('utf-8')

    # Set the environment variable in Python (for this session)
    os.environ['RSA_SECRET'] = base64_encoded_key

    # Verify the environment variable is set correctly
    print("RSA_SECRET:", os.getenv('RSA_SECRET'))

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python encode_key.py <pem_file_path>")
        sys.exit(1)

    pem_file_path = sys.argv[1]
    encode_pem_file(pem_file_path)
