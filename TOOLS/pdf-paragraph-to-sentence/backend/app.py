import os
import socket
import fitz  # PyMuPDF
import re
import logging
import json
import tempfile
import time
import requests
import subprocess
import atexit
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import queue
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
OLLAMA_MODEL = "llama3.2:3b"
OLLAMA_INSTANCES = 4  # Number of Ollama instances to spawn
OLLAMA_BASE_PORT = 11434

# Global state for tracking processing and Ollama instances
processing_state = {
    'is_processing': False,
    'should_stop': False,
    'total_paragraphs': 0,
    'completed_paragraphs': 0,
    'current_status': 'idle',
    'results': None,
    'error': None
}

# SSE event queue for real-time updates
event_queues = []

ollama_processes = []
ollama_ports = []

def broadcast_event(event_type, data):
    """Broadcast SSE event to all connected clients"""
    global event_queues
    event = f"event: {event_type}\ndata: {json.dumps(data)}\n\n"
    # Remove closed queues and send to active ones
    active_queues = []
    for q in event_queues:
        try:
            q.put(event, block=False)
            active_queues.append(q)
        except:
            pass  # Queue is closed or full
    event_queues = active_queues

def is_port_available(port):
    """Check if a port is available"""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        try:
            s.bind(('localhost', port))
            return True
        except OSError:
            return False

def wait_for_ollama(port, timeout=30):
    """Wait for Ollama instance to be ready"""
    start_time = time.time()
    while time.time() - start_time < timeout:
        try:
            response = requests.get(f"http://localhost:{port}/api/tags", timeout=2)
            if response.status_code == 200:
                logger.info(f"Ollama instance on port {port} is ready")
                return True
        except requests.exceptions.RequestException:
            pass
        time.sleep(1)
    return False

def start_ollama_instances():
    """Start multiple Ollama instances on different ports"""
    global ollama_processes, ollama_ports
    
    logger.info(f"Starting {OLLAMA_INSTANCES} Ollama instances...")
    
    for i in range(OLLAMA_INSTANCES):
        port = OLLAMA_BASE_PORT + i
        
        # Check if port is available
        if not is_port_available(port):
            logger.warning(f"Port {port} is already in use, skipping...")
            continue
        
        try:
            # Start Ollama instance on specific port
            env = os.environ.copy()
            env['OLLAMA_HOST'] = f'127.0.0.1:{port}'
            
            process = subprocess.Popen(
                ['ollama', 'serve'],
                env=env,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                start_new_session=True
            )
            
            ollama_processes.append(process)
            ollama_ports.append(port)
            
            logger.info(f"Started Ollama instance {i+1} on port {port} (PID: {process.pid})")
            
        except Exception as e:
            logger.error(f"Failed to start Ollama instance on port {port}: {str(e)}")
    
    # Wait for all instances to be ready
    ready_ports = []
    for port in ollama_ports:
        if wait_for_ollama(port):
            ready_ports.append(port)
        else:
            logger.error(f"Ollama instance on port {port} failed to start")
    
    ollama_ports = ready_ports
    logger.info(f"Successfully started {len(ollama_ports)} Ollama instances on ports: {ollama_ports}")

def stop_ollama_instances():
    """Stop all Ollama instances"""
    global ollama_processes, ollama_ports
    
    logger.info("Stopping Ollama instances...")
    
    for process in ollama_processes:
        try:
            process.terminate()
            process.wait(timeout=5)
            logger.info(f"Stopped Ollama process (PID: {process.pid})")
        except subprocess.TimeoutExpired:
            process.kill()
            logger.warning(f"Force killed Ollama process (PID: {process.pid})")
        except Exception as e:
            logger.error(f"Error stopping Ollama process: {str(e)}")
    
    ollama_processes.clear()
    ollama_ports.clear()

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

def get_ollama_port_for_paragraph(paragraph_num):
    """Get an Ollama port for load balancing"""
    if not ollama_ports:
        return OLLAMA_BASE_PORT  # Fallback to default port
    
    # Round-robin distribution
    index = (paragraph_num - 1) % len(ollama_ports)
    return ollama_ports[index]

def call_ollama_api(prompt, paragraph_num=None):
    """Make a request to the Ollama API"""
    port = get_ollama_port_for_paragraph(paragraph_num) if paragraph_num else OLLAMA_BASE_PORT
    base_url = f"http://localhost:{port}"
    
    try:
        if paragraph_num:
            logger.info(f"Starting Ollama API call for paragraph {paragraph_num} on port {port}")
        
        start_time = time.time()
        response = requests.post(
            f"{base_url}/api/generate",
            json={
                "model": OLLAMA_MODEL,
                "prompt": prompt,
                "stream": False
            },
            timeout=30
        )
        end_time = time.time()
        
        if paragraph_num:
            logger.info(f"Finished Ollama API call for paragraph {paragraph_num} on port {port} in {end_time - start_time:.2f} seconds")
        
        if response.status_code == 200:
            data = response.json()
            return data.get("response", "").strip()
        else:
            logger.error(f"Ollama API error on port {port}: {response.status_code} - {response.text}")
            return f"Error: Ollama API returned {response.status_code}"
            
    except requests.exceptions.Timeout:
        logger.error(f"Ollama API request timed out on port {port}")
        return "Error: Request timed out"
    except requests.exceptions.ConnectionError:
        logger.error(f"Could not connect to Ollama API on port {port}")
        return f"Error: Could not connect to Ollama on port {port}"
    except Exception as e:
        logger.error(f"Ollama API error on port {port}: {str(e)}")
        return f"Error: {str(e)}"

def process_single_paragraph(paragraph_data):
    """Process a single paragraph with Ollama API"""
    paragraph_num, paragraph = paragraph_data
    
    # Check if we should stop before processing this paragraph
    if processing_state['should_stop']:
        return None
    
    logger.info(f"Processing paragraph {paragraph_num}")
    prompt = f"Your task is to read this entire paragraph and reduce the content to a single sentence that captures the major theme. You will only return the summary sentence. You will never preface the sentence. This is the paragraph to process:\n\n{paragraph}"
    
    try:
        summary = call_ollama_api(prompt, paragraph_num)
        return {
            'paragraph_number': paragraph_num,
            'original': paragraph,
            'summary': summary
        }
    except Exception as e:
        logger.error(f"Error processing paragraph {paragraph_num}: {str(e)}")
        return {
            'paragraph_number': paragraph_num,
            'original': paragraph,
            'summary': f"Error summarizing paragraph: {str(e)}"
        }

def process_paragraphs_ollama(paragraphs):
    """Process all paragraphs using Ollama API with parallel processing"""
    global processing_state
    
    logger.info(f"Processing {len(paragraphs)} paragraphs with Ollama (parallel)")
    results = []
    
    # Update processing state
    processing_state['total_paragraphs'] = len(paragraphs)
    processing_state['completed_paragraphs'] = 0
    processing_state['current_status'] = 'processing'
    
    # Broadcast processing start
    broadcast_event('status', {
        'current_status': 'processing',
        'total_paragraphs': len(paragraphs),
        'completed_paragraphs': 0,
        'progress_percent': 0
    })
    
    # Create paragraph data with numbers for parallel processing
    paragraph_data = [(i + 1, paragraph) for i, paragraph in enumerate(paragraphs)]
    
    # Use ThreadPoolExecutor for parallel processing
    # Limit to 4 concurrent threads to not overwhelm Ollama
    max_workers = min(4, len(paragraphs))
    
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        # Submit all tasks
        logger.info(f"Submitting {len(paragraph_data)} tasks to thread pool with {max_workers} workers")
        future_to_paragraph = {
            executor.submit(process_single_paragraph, data): data[0] 
            for data in paragraph_data
        }
        logger.info(f"All {len(future_to_paragraph)} tasks submitted to thread pool")
        
        # Process completed tasks as they finish
        for future in as_completed(future_to_paragraph):
            # Check if we should stop
            if processing_state['should_stop']:
                logger.info("Processing stopped, cancelling remaining tasks")
                processing_state['current_status'] = 'stopping'
                # Cancel all pending futures
                for f in future_to_paragraph:
                    f.cancel()
                break
            
            try:
                result = future.result()
                if result is not None:  # None means the task was stopped
                    results.append(result)
                    processing_state['completed_paragraphs'] = len(results)
                    
                    # Broadcast progress update
                    broadcast_event('progress', {
                        'completed_paragraphs': processing_state['completed_paragraphs'],
                        'total_paragraphs': processing_state['total_paragraphs'],
                        'progress_percent': (processing_state['completed_paragraphs'] / processing_state['total_paragraphs'] * 100) if processing_state['total_paragraphs'] > 0 else 0
                    })
                    
                    logger.info(f"Completed paragraph {result['paragraph_number']}/{len(paragraphs)} ({processing_state['completed_paragraphs']}/{processing_state['total_paragraphs']})")
            except Exception as e:
                paragraph_num = future_to_paragraph[future]
                logger.error(f"Exception in paragraph {paragraph_num}: {str(e)}")
                results.append({
                    'paragraph_number': paragraph_num,
                    'original': paragraphs[paragraph_num - 1],
                    'summary': f"Error processing paragraph: {str(e)}"
                })
                processing_state['completed_paragraphs'] = len(results)
    
    # Sort results by paragraph number to maintain order
    results.sort(key=lambda x: x['paragraph_number'])
    
    processing_state['current_status'] = 'completed' if not processing_state['should_stop'] else 'stopped'
    logger.info(f"Successfully processed {len(results)} paragraphs with Ollama (parallel)")
    return results

def background_process_pdf(file_data):
    """Process PDF in background thread"""
    global processing_state
    
    try:
        logger.info("Starting background PDF processing...")
        
        # Update status to extracting
        processing_state['current_status'] = 'extracting'
        broadcast_event('status', {
            'current_status': 'extracting',
            'total_paragraphs': 0,
            'completed_paragraphs': 0,
            'progress_percent': 0
        })
        
        # Extract paragraphs from PDF
        paragraphs = extract_paragraphs_from_pdf(file_data)
        logger.info(f"Extracted {len(paragraphs)} paragraphs from PDF")
        
        # Check if we should stop before processing
        if processing_state['should_stop']:
            logger.info("Processing stopped before paragraph processing")
            processing_state['is_processing'] = False
            processing_state['current_status'] = 'stopped'
            return
        
        # Process paragraphs using Ollama API
        results = process_paragraphs_ollama(paragraphs)
        
        # Store results in global state
        processing_state['results'] = results
        processing_state['is_processing'] = False
        processing_state['should_stop'] = False
        processing_state['current_status'] = 'completed' if results else 'stopped'
        
        # Broadcast completion event
        broadcast_event('completed', {
            'results': results,
            'total_results': len(results)
        })
        
        logger.info(f"Background processing completed with {len(results)} results")
        
    except Exception as e:
        logger.error(f"Background processing error: {str(e)}")
        processing_state['error'] = str(e)
        processing_state['is_processing'] = False
        processing_state['should_stop'] = False
        processing_state['current_status'] = 'error'


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
        logger.info("Starting async PDF processing...")
        
        # Reset state
        processing_state['is_processing'] = True
        processing_state['should_stop'] = False
        processing_state['current_status'] = 'starting'
        processing_state['total_paragraphs'] = 0
        processing_state['completed_paragraphs'] = 0
        processing_state['results'] = None
        processing_state['error'] = None
        
        # Read file data into memory for background processing  
        file_data = file.read()
        
        # Create a simple file-like object for background processing
        class FileData:
            def __init__(self, data):
                self.data = data
                self.pos = 0
            
            def read(self):
                return self.data
        
        file_obj = FileData(file_data)
        
        # Start background processing
        thread = threading.Thread(target=background_process_pdf, args=(file_obj,))
        thread.daemon = True
        thread.start()
        
        logger.info("Background processing started, returning immediately")
        return jsonify({'success': True, 'message': 'Processing started', 'async': True})
        
    except Exception as e:
        logger.error(f"Error starting PDF processing: {str(e)}")
        processing_state['is_processing'] = False
        processing_state['should_stop'] = False
        processing_state['current_status'] = 'error'
        processing_state['error'] = str(e)
        return jsonify({'error': f'Error starting PDF processing: {str(e)}'}), 500

@app.route('/results', methods=['GET'])
def get_results():
    """Get processing results when complete"""
    global processing_state
    
    if processing_state['current_status'] == 'completed' and processing_state['results']:
        results = processing_state['results']
        # Clear results after returning them
        processing_state['results'] = None
        processing_state['current_status'] = 'idle'
        return jsonify({'success': True, 'results': results})
    elif processing_state['current_status'] == 'error' and processing_state['error']:
        error = processing_state['error']
        # Clear error after returning it  
        processing_state['error'] = None
        processing_state['current_status'] = 'idle'
        return jsonify({'success': False, 'error': error})
    else:
        return jsonify({'success': False, 'message': 'Processing not complete yet'})

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
        'current_status': processing_state['current_status'],
        'total_paragraphs': processing_state['total_paragraphs'],
        'completed_paragraphs': processing_state['completed_paragraphs'],
        'progress_percent': (processing_state['completed_paragraphs'] / processing_state['total_paragraphs'] * 100) if processing_state['total_paragraphs'] > 0 else 0,
        'model': OLLAMA_MODEL,
        'ollama_instances': len(ollama_ports),
        'ollama_ports': ollama_ports
    })

@app.route('/events')
def stream_events():
    """Server-Sent Events endpoint for real-time updates"""
    def event_generator():
        q = queue.Queue()
        event_queues.append(q)
        
        try:
            while True:
                try:
                    # Send current status immediately on connection
                    initial_event = f"event: status\ndata: {json.dumps(processing_state)}\n\n"
                    yield initial_event
                    break
                except:
                    break
                    
            while True:
                try:
                    event = q.get(timeout=30)  # 30 second timeout
                    yield event
                except queue.Empty:
                    # Send heartbeat to keep connection alive
                    yield "event: heartbeat\ndata: {}\n\n"
        except GeneratorExit:
            # Client disconnected
            if q in event_queues:
                event_queues.remove(q)
    
    return Response(event_generator(), mimetype='text/event-stream',
                   headers={'Cache-Control': 'no-cache',
                           'Connection': 'keep-alive'})

@app.route('/health', methods=['GET'])
def health():
    logger.info(f"Health check from {request.remote_addr}")
    return jsonify({'status': 'healthy'})

if __name__ == '__main__':
    # Register cleanup function
    atexit.register(stop_ollama_instances)
    
    # Start Ollama instances
    try:
        start_ollama_instances()
        if not ollama_ports:
            logger.error("Failed to start any Ollama instances. Exiting...")
            print("❌ Failed to start Ollama instances. Make sure 'ollama' is installed and available in PATH.")
            exit(1)
        
        print(f"✅ Started {len(ollama_ports)} Ollama instances on ports: {ollama_ports}")
        
    except Exception as e:
        logger.error(f"Error starting Ollama instances: {str(e)}")
        print(f"❌ Error starting Ollama instances: {str(e)}")
        exit(1)
    
    # Find available port for Flask
    port = find_available_port(5000)
    if port is None:
        print("No available ports found in range 5000-5009")
        stop_ollama_instances()
        exit(1)
    
    print(f"🚀 Starting Flask server on port {port}")
    if port != 5000:
        print(f"Note: Default port 5000 was in use, using port {port} instead")
        print(f"Update frontend to use: http://localhost:{port}/upload")
    
    try:
        app.run(debug=False, host='0.0.0.0', port=port)  # Set debug=False to avoid reloader issues
    except KeyboardInterrupt:
        print("\n🛑 Shutting down...")
        stop_ollama_instances()
    except Exception as e:
        logger.error(f"Flask server error: {str(e)}")
        stop_ollama_instances()
        exit(1)