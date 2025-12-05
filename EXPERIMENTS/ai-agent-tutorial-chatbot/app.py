"""
Educational Chatbot with Live Tutorial
Uses Anthropic SDK to demonstrate how AI agents work
"""

import os
import json
import math
import random
from datetime import datetime
from flask import Flask, render_template, request
from flask_socketio import SocketIO, emit
from anthropic import Anthropic
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app, cors_allowed_origins="*")

# Initialize Anthropic client
client = Anthropic()

# Store conversation history per session
conversations = {}

# Define available tools - mix of custom tools and Claude's built-in web search
CUSTOM_TOOLS = [
    {
        "name": "get_current_time",
        "description": "Get the current date and time in various formats",
        "input_schema": {
            "type": "object",
            "properties": {
                "format": {
                    "type": "string",
                    "description": "The format for the time (e.g., 'iso', 'human', 'unix')",
                    "enum": ["iso", "human", "unix"]
                }
            },
            "required": []
        }
    },
    {
        "name": "calculate",
        "description": "Perform mathematical calculations",
        "input_schema": {
            "type": "object",
            "properties": {
                "expression": {
                    "type": "string",
                    "description": "Mathematical expression to evaluate (e.g., '2 + 2', 'sqrt(16)', '10 * 5')"
                }
            },
            "required": ["expression"]
        }
    }
]

# Claude's built-in web search tool
WEB_SEARCH_TOOL = {
    "type": "web_search_20250305",
    "name": "web_search",
    "max_uses": 5
}

# Combined tools list for display purposes
TOOLS_DISPLAY = ["get_current_time", "calculate", "web_search (built-in)"]


def execute_tool(tool_name: str, tool_input: dict) -> dict:
    """Execute a custom tool and return the result"""
    if tool_name == "get_current_time":
        fmt = tool_input.get("format", "iso")
        now = datetime.now()
        if fmt == "iso":
            return {"time": now.isoformat()}
        elif fmt == "human":
            return {"time": now.strftime("%A, %B %d, %Y at %I:%M %p")}
        elif fmt == "unix":
            return {"time": int(now.timestamp())}
        return {"time": now.isoformat()}

    elif tool_name == "calculate":
        expression = tool_input.get("expression", "0")
        try:
            safe_dict = {
                "abs": abs, "round": round,
                "min": min, "max": max,
                "sum": sum, "pow": pow,
                "sqrt": math.sqrt, "sin": math.sin,
                "cos": math.cos, "tan": math.tan,
                "log": math.log, "pi": math.pi,
                "e": math.e
            }
            result = eval(expression, {"__builtins__": {}}, safe_dict)
            return {"result": result, "expression": expression}
        except Exception as e:
            return {"error": str(e), "expression": expression}

    return {"error": f"Unknown tool: {tool_name}"}


def emit_tutorial(sid, event_type: str, data: dict):
    """Emit a tutorial event to the client"""
    socketio.emit('tutorial_event', {
        'type': event_type,
        'data': data,
        'timestamp': datetime.now().isoformat()
    }, room=sid)


@app.route('/')
def index():
    return render_template('index.html')


@socketio.on('connect')
def handle_connect():
    """Handle new client connection"""
    sid = request.sid
    conversations[sid] = []


@socketio.on('disconnect')
def handle_disconnect():
    """Handle client disconnection"""
    sid = request.sid
    if sid in conversations:
        del conversations[sid]


def get_app_source_code():
    """Read the app.py source code for context"""
    try:
        with open(__file__, 'r') as f:
            return f.read()
    except Exception:
        return "# Source code not available"


def format_conversation_for_context(conv_history):
    """Format conversation history for the tutor context"""
    if not conv_history:
        return "No messages yet."

    formatted = []
    for msg in conv_history:
        role = msg.get('role', 'unknown')
        content = msg.get('content', '')

        # Handle different content types
        if isinstance(content, str):
            formatted.append(f"**{role.upper()}**: {content[:500]}{'...' if len(content) > 500 else ''}")
        elif isinstance(content, list):
            # Tool use or tool result
            for item in content:
                if isinstance(item, dict):
                    if item.get('type') == 'tool_use':
                        formatted.append(f"**{role.upper()}**: [Tool Use: {item.get('name', 'unknown')}]")
                    elif item.get('type') == 'tool_result':
                        formatted.append(f"**{role.upper()}**: [Tool Result]")
                    else:
                        formatted.append(f"**{role.upper()}**: [Complex content]")
                else:
                    # It's a content block object
                    if hasattr(item, 'type'):
                        if item.type == 'text':
                            text = getattr(item, 'text', '')[:300]
                            formatted.append(f"**{role.upper()}**: {text}{'...' if len(getattr(item, 'text', '')) > 300 else ''}")
                        elif item.type == 'tool_use':
                            formatted.append(f"**{role.upper()}**: [Tool Use: {getattr(item, 'name', 'unknown')}]")
                        else:
                            formatted.append(f"**{role.upper()}**: [{item.type}]")

    return "\n".join(formatted[-10:])  # Last 10 messages


@socketio.on('tutorial_question')
def handle_tutorial_question(data):
    """Handle questions about specific tutorial steps"""
    sid = request.sid
    card_id = data.get('card_id', '')
    question = data.get('question', '')
    step_data = data.get('step_data', {})

    # Get the actual app source code
    app_source = get_app_source_code()

    # Get the current conversation history for this session
    conv_history = conversations.get(sid, [])
    formatted_conversation = format_conversation_for_context(conv_history)

    # Build context about this step
    step_context = f"""
## Tutorial Step Information

**Step {step_data.get('stepNumber', '?')}:** {step_data.get('title', 'Unknown')}
**Type:** {step_data.get('type', 'Unknown')}
"""

    if step_data.get('concept'):
        concept = step_data['concept']
        step_context += f"""
### Concept: {concept.get('title', '')}
{concept.get('explanation', '')}
"""

    if step_data.get('code'):
        step_context += f"""
### Code Snippet Shown to User:
```python
{step_data['code']}
```
"""

    if step_data.get('request'):
        step_context += f"""
### Request Data:
```json
{json.dumps(step_data['request'], indent=2)}
```
"""

    if step_data.get('response'):
        step_context += f"""
### Response Data:
```json
{json.dumps(step_data['response'], indent=2)}
```
"""

    # Create the prompt for the tutor with full context
    system_prompt = """You are an expert programming tutor explaining how AI chatbots and the Anthropic Claude API work.

You have access to:
1. The FULL source code of the chatbot application (app.py)
2. The current conversation history between the user and the chatbot
3. Details about the specific tutorial step the user is viewing

Use this context to give detailed, accurate answers. You can reference specific line numbers, functions, or code patterns from the actual source code. When explaining concepts, relate them to the real implementation.

Key concepts you can explain:
- Conversation context (the messages array that maintains chat history)
- The Anthropic Messages API and how requests are structured
- Tool definitions and how Claude decides to use tools
- The agentic loop pattern (repeated API calls until end_turn)
- Server-side tools like web_search vs custom tools
- WebSocket communication for real-time updates
- How responses are parsed and returned to the user

Be educational and thorough. Use code examples from the actual source when relevant."""

    messages = [
        {
            "role": "user",
            "content": f"""## Full Application Source Code (app.py)

```python
{app_source}
```

## Current Chatbot Conversation History

{formatted_conversation}

## Current Tutorial Step Context

{step_context}

## User's Question

{question}

Please answer their question using the full context available. Reference specific parts of the code when helpful."""
        }
    ]

    try:
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1500,  # More tokens for detailed explanations with code
            system=system_prompt,
            messages=messages
        )

        answer = ""
        for block in response.content:
            if hasattr(block, 'text'):
                answer = block.text
                break

        socketio.emit('tutorial_qa_response', {
            'card_id': card_id,
            'answer': answer
        }, room=sid)

    except Exception as e:
        socketio.emit('tutorial_qa_response', {
            'card_id': card_id,
            'answer': f'Sorry, I encountered an error: {str(e)}'
        }, room=sid)


@socketio.on('chat_message')
def handle_message(data):
    """Handle incoming chat message"""
    sid = request.sid
    user_message = data.get('message', '')

    if sid not in conversations:
        conversations[sid] = []

    # Step 1: User Input Received
    emit_tutorial(sid, 'user_input', {
        'title': 'Message Received',
        'subtitle': f'"{user_message[:40]}..."' if len(user_message) > 40 else f'"{user_message}"',
        'concept': {
            'title': 'Conversation Context',
            'explanation': 'Every message you send is added to a "conversation history" - a list of all messages exchanged. This gives the AI context about the entire conversation, allowing it to remember what was said earlier and provide coherent responses.'
        },
        'code': '''# Your message is received via WebSocket
user_message = data.get('message', '')

# Add to conversation history (this is the "context")
conversations[session_id].append({
    "role": "user",      # Who sent it
    "content": message   # What they said
})

# The history now contains all messages in the conversation
# This is what makes the AI "remember" previous messages''',
        'request': {
            'role': 'user',
            'content': user_message
        }
    })

    # Add user message to history
    conversations[sid].append({
        "role": "user",
        "content": user_message
    })

    # Step 2: API Preparation
    emit_tutorial(sid, 'api_preparation', {
        'title': 'Preparing API Request',
        'subtitle': f'Packaging {len(conversations[sid])} message(s) + custom & built-in tools',
        'concept': {
            'title': 'The Messages API',
            'explanation': 'The Anthropic Messages API is how we communicate with Claude. We send: (1) a system prompt defining Claude\'s behavior, (2) the conversation history, and (3) a list of tools Claude can use. This includes both custom tools (like calculate) AND Claude\'s built-in web search tool for real-time information.'
        },
        'code': '''# Build the API request with custom + built-in tools
response = client.messages.create(
    model="claude-sonnet-4-20250514",
    max_tokens=4096,
    system="You are a helpful AI...",
    tools=[
        *CUSTOM_TOOLS,        # Our custom tools (time, calculate)
        WEB_SEARCH_TOOL       # Claude's built-in web search!
    ],
    messages=conversation_history
)''',
        'request': {
            'model': 'claude-sonnet-4-20250514',
            'max_tokens': 4096,
            'tools': TOOLS_DISPLAY,
            'messages_count': len(conversations[sid])
        }
    })

    # Run the agent loop
    run_agent_loop(sid)


def run_agent_loop(sid):
    """Run the agentic loop until completion"""
    max_iterations = 10
    iteration = 0

    while iteration < max_iterations:
        iteration += 1

        # Step 3: Making API Call
        emit_tutorial(sid, 'api_call', {
            'title': f'API Call #{iteration}',
            'subtitle': 'Sending request to Anthropic servers',
            'concept': {
                'title': 'The Agentic Loop',
                'explanation': f'This is iteration {iteration} of the "agentic loop". The loop continues until Claude responds with text (stop_reason="end_turn") instead of requesting a tool. Each iteration: (1) call the API, (2) check if Claude wants to use a tool, (3) if yes, execute the tool and loop again.'
            },
            'code': f'''# Iteration {iteration} of the agentic loop
response = client.messages.create(
    model="claude-sonnet-4-20250514",
    max_tokens=4096,
    system=SYSTEM_PROMPT,
    tools=[*CUSTOM_TOOLS, WEB_SEARCH_TOOL],
    messages=conversations[sid]  # Now has {len(conversations[sid])} messages
)

# After this call, we check response.stop_reason:
# - "end_turn" = Claude is done, has text response
# - "tool_use" = Claude wants to use a custom tool
# Web search is handled automatically by Claude!'''
        })

        try:
            # Make the actual API call with custom + built-in tools
            response = client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=4096,
                system="""You are a helpful AI assistant demonstrating how AI agents work.
You have access to tools and should use them when appropriate to answer questions.
Use the web search tool for current information like weather, news, or any real-time data.
Use calculate for math. Use get_current_time for the current time.
IMPORTANT: Always use web search when asked about weather, news, or current events.""",
                tools=[*CUSTOM_TOOLS, WEB_SEARCH_TOOL],
                messages=conversations[sid]
            )

            # Debug: Print response details
            print(f"[DEBUG] stop_reason: {response.stop_reason}")
            print(f"[DEBUG] content blocks: {[(b.type, getattr(b, 'name', None)) for b in response.content]}")

            # Step 4: Response Received
            content_types = [block.type for block in response.content]
            emit_tutorial(sid, 'api_response', {
                'title': 'Response Received',
                'subtitle': f'stop_reason="{response.stop_reason}"',
                'concept': {
                    'title': 'Understanding stop_reason',
                    'explanation': f'Claude responded with stop_reason="{response.stop_reason}". This is crucial! "end_turn" means Claude has a final text answer. "tool_use" means Claude wants to execute a tool first. The response contains {len(response.content)} content block(s): {content_types}'
                },
                'code': f'''# Parse the API response
stop_reason = response.stop_reason  # "{response.stop_reason}"
content_blocks = response.content   # {len(response.content)} block(s)

# Content block types in this response: {content_types}

if stop_reason == "end_turn":
    # Claude has a text response - we're done!
    pass
elif stop_reason == "tool_use":
    # Claude wants to use a tool - execute it
    pass''',
                'response': {
                    'stop_reason': response.stop_reason,
                    'content_blocks': len(response.content),
                    'block_types': content_types
                }
            })

            # Check if we're done
            if response.stop_reason == "end_turn":
                # Check if web search was used (built-in tool)
                has_web_search = any(
                    block.type in ["server_tool_use", "web_search_tool_result"]
                    for block in response.content
                )

                if has_web_search:
                    emit_tutorial(sid, 'tool_invocation', {
                        'title': 'Web Search (Built-in)',
                        'subtitle': 'Claude searched the web for real-time info',
                        'concept': {
                            'title': 'Built-in Web Search',
                            'explanation': 'Claude\'s built-in web search is different from custom tools - Anthropic\'s servers execute it automatically and return everything in one response! The search results are processed server-side, so we get both the search results AND Claude\'s interpretation in a single API call.'
                        },
                        'code': '''# Built-in web search - executed by Anthropic servers!
WEB_SEARCH_TOOL = {
    "type": "web_search_20250305",
    "name": "web_search",
    "max_uses": 5  # Optional limit
}

# Unlike custom tools, server tools are:
# 1. Executed server-side by Anthropic
# 2. Results returned in same response
# 3. stop_reason is "end_turn" (not "tool_use")

# The response contains:
# - server_tool_use: Claude's request to search
# - web_search_tool_result: Search results
# - text blocks: Claude's interpretation''',
                        'response': {
                            'type': 'builtin_web_search',
                            'note': 'Search executed server-side by Anthropic'
                        }
                    })

                # Collect all text blocks (web search responses may have multiple)
                text_parts = []
                for block in response.content:
                    if hasattr(block, 'text') and block.text.strip():
                        text_parts.append(block.text)

                if text_parts:
                    final_text = '\n'.join(text_parts)

                    # Step: Final Response
                    emit_tutorial(sid, 'final_response', {
                        'title': 'Final Response',
                        'subtitle': 'Claude finished processing',
                        'concept': {
                            'title': 'Response Complete',
                            'explanation': 'Claude has finished processing and returned a text response. The agentic loop ends here. The response is extracted from the content blocks and sent back to you via WebSocket. The full response is also saved to conversation history for future context.'
                        },
                        'code': '''# Extract text from all content blocks
text_parts = []
for block in response.content:
    if hasattr(block, 'text') and block.text.strip():
        text_parts.append(block.text)

final_text = '\\n'.join(text_parts)

# Save to conversation history
conversations[sid].append({
    "role": "assistant",
    "content": response.content
})

# Send to user via WebSocket
socketio.emit('chat_response', {
    'message': final_text
}, room=sid)''',
                        'response': {
                            'text_preview': final_text[:200] + '...' if len(final_text) > 200 else final_text
                        }
                    })

                    conversations[sid].append({
                        "role": "assistant",
                        "content": response.content
                    })

                    socketio.emit('chat_response', {
                        'message': final_text
                    }, room=sid)
                    return
                return

            # Handle tool use
            if response.stop_reason == "tool_use":
                conversations[sid].append({
                    "role": "assistant",
                    "content": response.content
                })

                tool_results = []
                has_custom_tools = False

                for block in response.content:
                    # Handle web search results (built-in, already executed by Anthropic)
                    if block.type in ["web_search_tool_result", "server_tool_result"]:
                        emit_tutorial(sid, 'tool_invocation', {
                            'title': 'Web Search (Built-in)',
                            'subtitle': 'Claude searched the web for real-time info',
                            'concept': {
                                'title': 'Built-in Web Search',
                                'explanation': 'Claude\'s built-in web search is different from custom tools - Anthropic\'s servers execute it automatically! We don\'t need to do anything. The search results are returned directly in the response. This gives Claude access to real-time information like current weather, news, and more.'
                            },
                            'code': '''# Built-in web search - executed by Anthropic!
# Unlike custom tools, we don't execute this ourselves.
# The results come back automatically in the response.

WEB_SEARCH_TOOL = {
    "type": "web_search_20250305",
    "name": "web_search",
    "max_uses": 5
}

# Results are in block.type == "web_search_tool_result"''',
                            'response': {
                                'type': 'web_search_tool_result',
                                'note': 'Search results provided by Anthropic servers'
                            }
                        })

                    # Handle custom tool requests
                    elif block.type == "tool_use":
                        has_custom_tools = True
                        tool_name = block.name
                        tool_input = block.input

                        # Step: Tool Invocation
                        tool_code_examples = {
                            'get_current_time': '''def get_current_time(format="iso"):
    now = datetime.now()
    if format == "iso":
        return {"time": now.isoformat()}
    elif format == "human":
        return {"time": now.strftime("%A, %B %d, %Y")}
    elif format == "unix":
        return {"time": int(now.timestamp())}''',
                            'calculate': '''def calculate(expression):
    # Safe math evaluation
    safe_funcs = {"sqrt": math.sqrt, "sin": math.sin, ...}
    result = eval(expression, {"__builtins__": {}}, safe_funcs)
    return {"result": result}'''
                        }

                        emit_tutorial(sid, 'tool_invocation', {
                            'title': f'Tool: {tool_name}',
                            'subtitle': f'Claude wants to use this custom tool',
                            'concept': {
                                'title': 'Custom Tools',
                                'explanation': f'Claude has decided to use our custom "{tool_name}" tool. Unlike built-in tools, WE execute custom tools on our server and return results to Claude. This lets you extend Claude with any capability you can code!'
                            },
                            'code': tool_code_examples.get(tool_name, f'# Tool: {tool_name}'),
                            'request': {
                                'tool_name': tool_name,
                                'tool_input': tool_input,
                                'tool_use_id': block.id
                            }
                        })

                        # Execute the custom tool
                        result = execute_tool(tool_name, tool_input)

                        # Step: Tool Result
                        emit_tutorial(sid, 'tool_result', {
                            'title': f'Tool Result',
                            'subtitle': f'{tool_name} executed successfully',
                            'concept': {
                                'title': 'Returning Results to Claude',
                                'explanation': 'The tool executed and returned data. This result is formatted as a "tool_result" message and added to the conversation. In the next iteration of the loop, Claude will see this result and can use it to formulate a response.'
                            },
                            'code': f'''# Tool executed successfully
result = execute_tool("{tool_name}", {json.dumps(tool_input)})

# Format as tool_result for Claude
tool_result = {{
    "type": "tool_result",
    "tool_use_id": "{block.id}",
    "content": json.dumps(result)
}}''',
                            'response': result
                        })

                        tool_results.append({
                            "type": "tool_result",
                            "tool_use_id": block.id,
                            "content": json.dumps(result)
                        })

                # Only add tool results if we have custom tools that need results
                if has_custom_tools and tool_results:
                    conversations[sid].append({
                        "role": "user",
                        "content": tool_results
                    })

                    # Step: Loop Continues
                    emit_tutorial(sid, 'agent_loop', {
                        'title': 'Loop Continues',
                        'subtitle': f'Tool results added, making next API call',
                        'concept': {
                            'title': 'The Agentic Pattern',
                            'explanation': 'This is the key insight of agentic AI: the loop continues! We\'ve added the tool results to the conversation, and now we\'ll call the API again. Claude will see the results and either (1) provide a final text response, or (2) use another tool.'
                        },
                        'code': '''# Tool results added to conversation
# The conversation now looks like:
# 1. User: "What time is it?"
# 2. Assistant: [tool_use: get_current_time]
# 3. User: [tool_result: {"time": "..."}]

# Loop continues - call API again'''
                    })
                else:
                    # Web search was used - results are already in the response
                    # Continue the loop to let Claude process them
                    emit_tutorial(sid, 'agent_loop', {
                        'title': 'Processing Search Results',
                        'subtitle': 'Claude will now use the search results',
                        'concept': {
                            'title': 'Built-in Tool Flow',
                            'explanation': 'For built-in tools like web search, Claude already has the results. The loop continues so Claude can process these results and formulate a response.'
                        },
                        'code': '''# Built-in web search results already in response
# No need to add tool_result manually
# Continue loop for Claude to process results'''
                    })
            else:
                break

        except Exception as e:
            emit_tutorial(sid, 'error', {
                'title': 'Error Occurred',
                'subtitle': str(e)[:50],
                'concept': {
                    'title': 'Error Handling',
                    'explanation': f'An error occurred during API communication: {str(e)}'
                },
                'code': f'''# Error caught
try:
    response = client.messages.create(...)
except Exception as e:
    # Handle error gracefully
    error_message = str(e)'''
            })

            socketio.emit('chat_response', {
                'message': f'Sorry, an error occurred: {str(e)}'
            }, room=sid)
            return

    emit_tutorial(sid, 'max_iterations', {
        'title': 'Max Iterations',
        'subtitle': 'Safety limit reached',
        'concept': {
            'title': 'Preventing Infinite Loops',
            'explanation': 'The agentic loop has a safety limit of 10 iterations. This prevents infinite loops where Claude might keep calling tools indefinitely.'
        },
        'code': '''# Safety check
MAX_ITERATIONS = 10
if iteration >= MAX_ITERATIONS:
    break  # Stop the loop'''
    })


if __name__ == '__main__':
    print("Starting Educational Chatbot...")
    print("Open http://localhost:5001 in your browser")
    socketio.run(app, debug=True, port=5001, allow_unsafe_werkzeug=True)
