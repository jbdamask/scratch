import os
import socket
import fitz  # PyMuPDF
import re
import logging
import json
import tempfile
import time
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, resources={
    r"/*": {
        "origins": ["http://localhost:5173", "http://127.0.0.1:5173"],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type"]
    }
})

# Ollama configuration
OLLAMA_BASE_URL = "http://localhost:11434"
OLLAMA_MODEL = "llama3.2:3b"

# Global state for tracking processing
processing_state = {
    'is_processing': False,
    'should_stop': False
}

def extract_paragraphs_from_pdf(pdf_file):
    """Extract paragraphs from PDF file"""
    doc = fitz.open(stream=pdf_file.read(), filetype="pdf")
    text = ""
    
    for page in doc:
        text += page.get_text()
        text += "\n\n"  # Add page breaks
    
    doc.close()
    
    logger.info(f"Raw text length: {len(text)} characters")
    logger.info(f"First 500 characters: {repr(text[:500])}")
    
    # Try multiple splitting strategies
    # Strategy 1: Split on double newlines or more
    paragraphs = re.split(r'\n\s*\n+', text.strip())
    logger.info(f"Strategy 1 (double newlines): Found {len(paragraphs)} paragraphs")
    
    # If we only get 1 paragraph, try splitting on single newlines with sentence endings
    if len(paragraphs) <= 1:
        # Strategy 2: Split on lines that end with sentence-ending punctuation
        paragraphs = re.split(r'(?<=[.!?])\s*\n+(?=[A-Z])', text.strip())
        logger.info(f"Strategy 2 (sentence endings): Found {len(paragraphs)} paragraphs")
    
    # If still only 1 paragraph, split on any significant whitespace
    if len(paragraphs) <= 1:
        # Strategy 3: Split on multiple sentences (periods followed by space and capital)
        paragraphs = re.split(r'(?<=[.!?])\s+(?=[A-Z][a-z])', text.strip())
        logger.info(f"Strategy 3 (sentence splits): Found {len(paragraphs)} paragraphs")
        
        # Group sentences into paragraphs (every 3-5 sentences)
        if len(paragraphs) > 5:
            grouped_paragraphs = []
            for i in range(0, len(paragraphs), 4):  # Group every 4 sentences
                paragraph_group = ' '.join(paragraphs[i:i+4])
                grouped_paragraphs.append(paragraph_group)
            paragraphs = grouped_paragraphs
            logger.info(f"Strategy 3 grouped: Created {len(paragraphs)} paragraph groups")
    
    # Filter out empty paragraphs and very short ones
    original_count = len(paragraphs)
    paragraphs = [p.strip() for p in paragraphs if p.strip() and len(p.strip()) > 50]
    logger.info(f"After filtering: {len(paragraphs)} paragraphs (removed {original_count - len(paragraphs)} short ones)")
    
    # Log first few paragraphs for debugging
    for i, p in enumerate(paragraphs[:3]):
        logger.info(f"Paragraph {i+1} preview: {repr(p[:100])}...")
    
    return paragraphs

def call_ollama_api(prompt):
    """Make a request to the Ollama API"""
    try:
        response = requests.post(
            f"{OLLAMA_BASE_URL}/api/generate",
            json={
                "model": OLLAMA_MODEL,
                "prompt": prompt,
                "stream": False
            },
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            return data.get("response", "").strip()
        else:
            logger.error(f"Ollama API error: {response.status_code} - {response.text}")
            return f"Error: Ollama API returned {response.status_code}"
            
    except requests.exceptions.Timeout:
        logger.error("Ollama API request timed out")
        return "Error: Request timed out"
    except requests.exceptions.ConnectionError:
        logger.error("Could not connect to Ollama API")
        return "Error: Could not connect to Ollama (is ollama serve running?)"
    except Exception as e:
        logger.error(f"Ollama API error: {str(e)}")
        return f"Error: {str(e)}"

def process_paragraphs_ollama(paragraphs):
    """Process all paragraphs using Ollama API"""
    global processing_state
    
    logger.info(f"Processing {len(paragraphs)} paragraphs with Ollama")
    results = []
    
    for i, paragraph in enumerate(paragraphs, 1):
        # Check if we should stop
        if processing_state['should_stop']:
            logger.info(f"Processing stopped after {len(results)} paragraphs")
            break
        
        logger.info(f"Processing paragraph {i}/{len(paragraphs)}")
        prompt = f"Your task is to read this entire paragraph and reduce the content to a single sentence that captures the major theme. You will only return the summary sentence. You will never preface the sentence. This is the paragraph to process:\n\n{paragraph}"
        
        try:
            summary = call_ollama_api(prompt)
        except Exception as e:
            logger.error(f"Error processing paragraph {i}: {str(e)}")
            summary = f"Error summarizing paragraph: {str(e)}"
        
        results.append({
            'paragraph_number': i,
            'original': paragraph,
            'summary': summary
        })
        
        # Small delay to prevent overwhelming Ollama
        time.sleep(0.1)
    
    logger.info(f"Successfully processed {len(results)} paragraphs with Ollama")
    return results


@app.route('/upload', methods=['POST'])
def upload_file():
    global processing_state
    
    logger.info(f"Received upload request from {request.remote_addr}")
    logger.info(f"Request headers: {dict(request.headers)}")
    
    # Check if already processing
    if processing_state['is_processing']:
        logger.warning("Already processing a file")
        return jsonify({'error': 'Already processing a file. Please stop current processing first.'}), 409
    
    if 'file' not in request.files:
        logger.warning("No file provided in request")
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    logger.info(f"File received: {file.filename}")
    
    if file.filename == '':
        logger.warning("Empty filename provided")
        return jsonify({'error': 'No file selected'}), 400
    
    if not file.filename.lower().endswith('.pdf'):
        logger.warning(f"Invalid file type: {file.filename}")
        return jsonify({'error': 'Please upload a PDF file'}), 400
    
    try:
        logger.info("Starting PDF processing...")
        # Set processing state
        processing_state['is_processing'] = True
        processing_state['should_stop'] = False
        
        # Extract paragraphs from PDF
        paragraphs = extract_paragraphs_from_pdf(file)
        logger.info(f"Extracted {len(paragraphs)} paragraphs from PDF")
        
        # Check if we should stop before processing
        if processing_state['should_stop']:
            logger.info("Processing stopped before paragraph processing")
            processing_state['is_processing'] = False
            return jsonify({'success': False, 'message': 'Processing stopped'})
        
        # Process paragraphs using Ollama API
        results = process_paragraphs_ollama(paragraphs)
        
        # Reset processing state
        processing_state['is_processing'] = False
        processing_state['should_stop'] = False
        
        if processing_state.get('was_stopped', False):
            processing_state['was_stopped'] = False
            logger.info("Processing was stopped by user")
            return jsonify({'success': False, 'message': 'Processing stopped by user'})
        
        logger.info(f"Successfully processed {len(results)} paragraphs")
        return jsonify({
            'success': True,
            'results': results
        })
        
    except Exception as e:
        logger.error(f"Error processing PDF: {str(e)}")
        # Reset processing state on error
        processing_state['is_processing'] = False
        processing_state['should_stop'] = False
        return jsonify({'error': f'Error processing PDF: {str(e)}'}), 500

def find_available_port(start_port=5000):
    """Find an available port starting from start_port"""
    for port in range(start_port, start_port + 10):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(('', port))
                return port
            except OSError:
                continue
    return None

@app.route('/stop', methods=['POST'])
def stop_processing():
    global processing_state
    
    logger.info(f"Stop request from {request.remote_addr}")
    
    if not processing_state['is_processing']:
        logger.info("No processing to stop")
        return jsonify({'success': False, 'message': 'No processing in progress'})
    
    logger.info("Stopping processing...")
    processing_state['should_stop'] = True
    processing_state['was_stopped'] = True
    
    return jsonify({'success': True, 'message': 'Stop signal sent'})

@app.route('/status', methods=['GET'])
def get_status():
    global processing_state
    
    return jsonify({
        'is_processing': processing_state['is_processing'],
        'model': OLLAMA_MODEL,
        'ollama_url': OLLAMA_BASE_URL
    })

@app.route('/health', methods=['GET'])
def health():
    logger.info(f"Health check from {request.remote_addr}")
    return jsonify({'status': 'healthy'})

if __name__ == '__main__':
    port = find_available_port(5000)
    if port is None:
        print("No available ports found in range 5000-5009")
        exit(1)
    
    print(f"Starting server on port {port}")
    if port != 5000:
        print(f"Note: Default port 5000 was in use, using port {port} instead")
        print(f"Update frontend to use: http://localhost:{port}/upload")
    
    app.run(debug=True, host='0.0.0.0', port=port)