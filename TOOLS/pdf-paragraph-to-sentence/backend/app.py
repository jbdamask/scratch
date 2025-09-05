import os
import socket
import fitz  # PyMuPDF
import re
import logging
import json
import tempfile
import time
from flask import Flask, request, jsonify
from flask_cors import CORS
from openai import OpenAI
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

client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

# Global state for tracking processing
processing_state = {
    'is_processing': False,
    'should_stop': False,
    'batch_id': None,
    'file_id': None
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

def create_batch_requests(paragraphs):
    """Create batch requests for all paragraphs"""
    batch_requests = []
    
    for i, paragraph in enumerate(paragraphs):
        request = {
            "custom_id": f"paragraph_{i+1}",
            "method": "POST",
            "url": "/v1/chat/completions",
            "body": {
                "model": "gpt-4o-mini",
                "messages": [
                    {
                        "role": "user",
                        "content": f"Read this entire paragraph and reduce the content to a single sentence that captures the paragraph's theme:\n\n{paragraph}"
                    }
                ],
                "max_tokens": 100,
                "temperature": 0.7
            }
        }
        batch_requests.append(request)
    
    return batch_requests

def process_paragraphs_batch(paragraphs):
    """Process all paragraphs using OpenAI Batch API"""
    global processing_state
    
    try:
        logger.info(f"Creating batch requests for {len(paragraphs)} paragraphs")
        
        # Check if we should stop before starting
        if processing_state['should_stop']:
            logger.info("Processing stopped before batch creation")
            return []
        
        # Create batch requests
        batch_requests = create_batch_requests(paragraphs)
        
        # Create temporary JSONL file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.jsonl', delete=False) as f:
            for request in batch_requests:
                f.write(json.dumps(request) + '\n')
            temp_file_path = f.name
        
        logger.info(f"Created JSONL file: {temp_file_path}")
        
        # Check if we should stop
        if processing_state['should_stop']:
            logger.info("Processing stopped before file upload")
            os.unlink(temp_file_path)
            return []
        
        # Upload file to OpenAI
        with open(temp_file_path, 'rb') as f:
            file_response = client.files.create(
                file=f,
                purpose="batch"
            )
        
        file_id = file_response.id
        processing_state['file_id'] = file_id
        logger.info(f"Uploaded file with ID: {file_id}")
        
        # Check if we should stop
        if processing_state['should_stop']:
            logger.info("Processing stopped before batch creation")
            os.unlink(temp_file_path)
            client.files.delete(file_id)
            processing_state['file_id'] = None
            return []
        
        # Create batch job
        batch_job = client.batches.create(
            input_file_id=file_id,
            endpoint="/v1/chat/completions",
            completion_window="24h"
        )
        
        batch_id = batch_job.id
        processing_state['batch_id'] = batch_id
        logger.info(f"Created batch job with ID: {batch_id}")
        
        # Poll for completion (with timeout)
        max_wait_time = 300  # 5 minutes max wait
        start_time = time.time()
        
        while time.time() - start_time < max_wait_time:
            # Check if we should stop
            if processing_state['should_stop']:
                logger.info("Processing stopped, cancelling batch")
                try:
                    client.batches.cancel(batch_id)
                except Exception as e:
                    logger.error(f"Error cancelling batch: {e}")
                
                # Cleanup
                os.unlink(temp_file_path)
                try:
                    client.files.delete(file_id)
                except Exception as e:
                    logger.error(f"Error deleting file: {e}")
                
                processing_state['batch_id'] = None
                processing_state['file_id'] = None
                return []
            
            batch_status = client.batches.retrieve(batch_id)
            logger.info(f"Batch status: {batch_status.status}")
            
            if batch_status.status == "completed":
                # Download results
                result_file_id = batch_status.output_file_id
                result_content = client.files.content(result_file_id)
                
                # Parse results
                results = []
                for line in result_content.text.strip().split('\n'):
                    if line.strip():
                        result = json.loads(line)
                        custom_id = result['custom_id']
                        paragraph_num = int(custom_id.split('_')[1])
                        
                        if result['response']['status_code'] == 200:
                            summary = result['response']['body']['choices'][0]['message']['content'].strip()
                        else:
                            summary = f"Error processing paragraph {paragraph_num}"
                        
                        results.append({
                            'paragraph_number': paragraph_num,
                            'original': paragraphs[paragraph_num - 1],
                            'summary': summary
                        })
                
                # Sort by paragraph number
                results.sort(key=lambda x: x['paragraph_number'])
                
                # Cleanup
                os.unlink(temp_file_path)
                client.files.delete(file_id)
                processing_state['batch_id'] = None
                processing_state['file_id'] = None
                
                logger.info(f"Successfully processed {len(results)} paragraphs via batch")
                return results
            
            elif batch_status.status in ["failed", "expired", "cancelled"]:
                logger.error(f"Batch job failed with status: {batch_status.status}")
                break
            
            # Wait before checking again
            time.sleep(2)
        
        # If we get here, batch didn't complete in time - fall back to individual processing
        logger.warning("Batch processing timed out, falling back to individual requests")
        os.unlink(temp_file_path)
        client.files.delete(file_id)
        processing_state['batch_id'] = None
        processing_state['file_id'] = None
        
        return process_paragraphs_individual(paragraphs)
        
    except Exception as e:
        logger.error(f"Batch processing failed: {str(e)}")
        # Clean up state
        processing_state['batch_id'] = None
        processing_state['file_id'] = None
        # Fall back to individual processing
        return process_paragraphs_individual(paragraphs)

def process_paragraphs_individual(paragraphs):
    """Fallback: Process paragraphs individually"""
    global processing_state
    
    logger.info("Using individual processing as fallback")
    results = []
    
    for i, paragraph in enumerate(paragraphs, 1):
        # Check if we should stop
        if processing_state['should_stop']:
            logger.info(f"Processing stopped after {len(results)} paragraphs")
            break
            
        try:
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "user",
                        "content": f"Read this entire paragraph and reduce the content to a single sentence that captures the paragraph's theme:\n\n{paragraph}"
                    }
                ],
                max_tokens=100,
                temperature=0.7
            )
            summary = response.choices[0].message.content.strip()
        except Exception as e:
            summary = f"Error summarizing paragraph: {str(e)}"
        
        results.append({
            'paragraph_number': i,
            'original': paragraph,
            'summary': summary
        })
    
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
        processing_state['batch_id'] = None
        processing_state['file_id'] = None
        
        # Extract paragraphs from PDF
        paragraphs = extract_paragraphs_from_pdf(file)
        logger.info(f"Extracted {len(paragraphs)} paragraphs from PDF")
        
        # Check if we should stop before processing
        if processing_state['should_stop']:
            logger.info("Processing stopped before paragraph processing")
            processing_state['is_processing'] = False
            return jsonify({'success': False, 'message': 'Processing stopped'})
        
        # Process paragraphs using batch API (with fallback to individual)
        results = process_paragraphs_batch(paragraphs)
        
        # Reset processing state
        processing_state['is_processing'] = False
        processing_state['should_stop'] = False
        processing_state['batch_id'] = None
        processing_state['file_id'] = None
        
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
        processing_state['batch_id'] = None
        processing_state['file_id'] = None
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
        'has_batch_id': processing_state['batch_id'] is not None,
        'has_file_id': processing_state['file_id'] is not None
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