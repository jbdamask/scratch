from langfuse import Langfuse
from dotenv import load_dotenv
import os
import json
from datetime import datetime

load_dotenv(override=False)

# Initialize client
langfuse = Langfuse(
    public_key=os.environ.get("LANGFUSE_PUBLIC_KEY", ""),
    secret_key=os.environ.get("LANGFUSE_SECRET_KEY", ""),
    host=os.environ.get("LANGFUSE_HOST", "")
)

# Fetch traces with filters using the correct API method
traces_response = langfuse.api.trace.list(
    limit=100,  # adjust as needed
    # Optional filters:
    # name="specific_trace_name",
    # user_id="specific_user",
    # tags=["production"],
    # from_timestamp="2025-01-01T00:00:00Z",
    # to_timestamp="2025-12-31T23:59:59Z"
)

# Collect all trace data
all_traces = []

# Access trace data
for trace in traces_response.data:
    print(f"Trace ID: {trace.id}")

    # Get full trace details including all observations
    full_trace = langfuse.api.trace.get(trace.id)

    # Convert trace to dict for JSON serialization
    trace_dict = {
        "id": full_trace.id,
        "timestamp": full_trace.timestamp.isoformat() if hasattr(full_trace.timestamp, 'isoformat') else str(full_trace.timestamp),
        "name": full_trace.name,
        "user_id": full_trace.user_id,
        "session_id": full_trace.session_id,
        "metadata": full_trace.metadata,
        "input": full_trace.input,
        "output": full_trace.output,
        "tags": full_trace.tags,
        "public": full_trace.public,
    }

    # Get observations for this trace (with pagination if needed)
    trace_dict["observations"] = []
    page = 1
    while True:
        observations_response = langfuse.api.observations.get_many(
            trace_id=trace.id,
            limit=100,  # max allowed by API
            page=page
        )

        if not observations_response.data:
            break

        for obs in observations_response.data:
            obs_dict = {
                "id": obs.id,
                "type": obs.type,
                "name": obs.name,
                "start_time": obs.start_time.isoformat() if hasattr(obs.start_time, 'isoformat') else str(obs.start_time),
                "end_time": obs.end_time.isoformat() if hasattr(obs.end_time, 'isoformat') and obs.end_time else None,
                "metadata": obs.metadata,
                "input": obs.input,
                "output": obs.output,
                "level": obs.level,
                "status_message": obs.status_message,
                "parent_observation_id": obs.parent_observation_id,
            }
            trace_dict["observations"].append(obs_dict)

        # Check if there are more pages
        if len(observations_response.data) < 100:
            break
        page += 1

    all_traces.append(trace_dict)
    print(f"  - Collected trace with {len(trace_dict['observations'])} observations")

# Export to JSON file
json_filename = f"traces_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
with open(json_filename, 'w') as f:
    json.dump(all_traces, f, indent=2, default=str)

print(f"\nExported {len(all_traces)} traces to {json_filename}")

# Generate HTML viewer with embedded trace data
html_filename = f"trace_viewer_{datetime.now().strftime('%Y%m%d_%H%M%S')}.html"

# Read the template HTML file
with open('trace_viewer.html', 'r') as f:
    html_template = f.read()

# Embed the trace data into the HTML
traces_json = json.dumps(all_traces, default=str)
html_with_data = html_template.replace('TRACES_DATA_PLACEHOLDER', traces_json)

# Write the generated HTML file
with open(html_filename, 'w') as f:
    f.write(html_with_data)

print(f"Generated HTML viewer: {html_filename}")
print(f"\nOpen {html_filename} in your browser to view and annotate traces")
