from typing import Any, List, Dict, Optional
import httpx
import os
import logging
import json
from dotenv import load_dotenv
from fastmcp import FastMCP

"""
MCP API Template

This template provides a foundation for creating Model Context Protocol (MCP) servers
that wrap around third-party APIs. It includes:

1. Logging configuration
2. Environment variable handling
3. A reusable API client class
4. MCP tool and resource definitions

To use this template:
1. Replace API_NAME with your target API name
2. Configure API_BASE and API_KEY_NAME
3. Implement client methods in APIClient for your specific API endpoints
4. Define MCP tools that utilize those client methods
5. Define MCP resources if needed

Or you can just point your AI to it an vibe code

"""

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(os.path.join(os.path.dirname(os.path.abspath(__file__)), "mcp-api-template.log")),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger('api-template-mcp')
logger.info("Starting API Template MCP server")

# Load environment variables from .env file
load_dotenv()

# Configuration - Replace these with your API's specific values
API_NAME = "YOUR_API_NAME"  # e.g., "github", "stripe", "twilio"
API_BASE = "https://api.example.com/v1"  # Replace with actual API base URL
API_KEY_NAME = "API_KEY"  # Environment variable name for the API key

# Get API_KEY from environment variables
API_KEY = os.getenv(API_KEY_NAME)
if not API_KEY:
    raise ValueError(f"{API_KEY_NAME} environment variable is required")

# Initialize FastMCP server
mcp = FastMCP(API_NAME)

class APIClient:
    """Client for interacting with the target API"""
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
    
    async def get_resource(self, endpoint: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Generic GET request to the API"""
        logger.info(f"GET request to endpoint: {endpoint}")
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{API_BASE}/{endpoint}",
                headers=self.headers,
                params=params
            )
            response.raise_for_status()
            return response.json()
    
    async def post_resource(self, endpoint: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Generic POST request to the API"""
        logger.info(f"POST request to endpoint: {endpoint}")
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{API_BASE}/{endpoint}",
                headers=self.headers,
                json=data
            )
            response.raise_for_status()
            return response.json()
    
    async def put_resource(self, endpoint: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Generic PUT request to the API"""
        logger.info(f"PUT request to endpoint: {endpoint}")
        async with httpx.AsyncClient() as client:
            response = await client.put(
                f"{API_BASE}/{endpoint}",
                headers=self.headers,
                json=data
            )
            response.raise_for_status()
            return response.json()
    
    async def delete_resource(self, endpoint: str) -> Dict[str, Any]:
        """Generic DELETE request to the API"""
        logger.info(f"DELETE request to endpoint: {endpoint}")
        async with httpx.AsyncClient() as client:
            response = await client.delete(
                f"{API_BASE}/{endpoint}",
                headers=self.headers
            )
            response.raise_for_status()
            return response.json()
    
    # =====================================================================
    # Add your API-specific methods below, following this pattern:
    # =====================================================================
    
    async def list_items(self) -> List[Dict[str, Any]]:
        """Example: List all items from the API"""
        logger.info("Getting items from API")
        response = await self.get_resource("items")
        return response.get("items", [])
    
    async def get_item(self, item_id: str) -> Dict[str, Any]:
        """Example: Get a specific item from the API"""
        logger.info(f"Getting item {item_id} from API")
        return await self.get_resource(f"item/{item_id}")
    
    async def create_item(self, item_data: Dict[str, Any]) -> Dict[str, Any]:
        """Example: Create a new item via the API"""
        logger.info(f"Creating new item with data: {item_data}")
        return await self.post_resource("items", item_data)

# Initialize API client
api_client = APIClient(API_KEY)

# =====================================================================
# Define MCP tools that expose the API functionality
# =====================================================================

@mcp.tool()
async def list_items() -> str:
    """List all items from the API"""
    items = await api_client.list_items()
    logger.info(f"Found {len(items)} items")
    
    if not items:
        return "No items found."
    
    # Format items for better readability
    formatted_items = []
    for item in items:
        # Select the most important fields to display
        formatted_item = {
            "id": item.get("id"),
            "name": item.get("name"),
            "status": item.get("status"),
            "createdAt": item.get("createdAt"),
            # Add other fields as needed
        }
        # Convert dictionary to a formatted string
        item_str = "\n".join([f"{key}: {value}" for key, value in formatted_item.items() if value is not None])
        formatted_items.append(item_str)
    
    return "\n---\n".join(formatted_items)

@mcp.tool()
async def get_item(item_id: str) -> str:
    """
    Get a specific item from the API.
    
    Args:
        item_id: The ID of the item to retrieve.
        
    Returns:
        The item details.
    """
    try:
        item = await api_client.get_item(item_id)
        logger.info(f"Found item: {item}")
        
        # Format the item for better readability
        # Return as nicely formatted JSON
        return json.dumps(item, indent=2)
    except Exception as e:
        logger.error(f"Error retrieving item: {e}")
        return f"Error retrieving item: {str(e)}"

@mcp.tool()
async def create_item(name: str, description: str = "", properties: Dict[str, Any] = None) -> str:
    """
    Create a new item in the API.
    
    Args:
        name: The name of the item.
        description: An optional description of the item.
        properties: Additional properties for the item (as a dictionary).
        
    Returns:
        The created item details.
    """
    try:
        # Prepare the item data
        item_data = {
            "name": name,
            "description": description
        }
        
        # Add additional properties if provided
        if properties:
            item_data.update(properties)
        
        # Create the item
        created_item = await api_client.create_item(item_data)
        logger.info(f"Created item: {created_item}")
        
        # Return as nicely formatted JSON
        return json.dumps(created_item, indent=2)
    except Exception as e:
        logger.error(f"Error creating item: {e}")
        return f"Error creating item: {str(e)}"

# =====================================================================
# Example of an MCP resource - typically used for binary data like files
# =====================================================================

@mcp.resource("item://{item_id}/content")
async def get_item_content(item_id: str) -> bytes:
    """
    Get the binary content of an item.
    
    Args:
        item_id: The ID of the item.
        
    Returns:
        The item content as bytes.
    """
    logger.info(f"Fetching content for item with ID: {item_id}")
    
    try:
        # This is a placeholder - implement your own logic to fetch binary content
        # For example:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{API_BASE}/item/{item_id}/content",
                headers=api_client.headers
            )
            response.raise_for_status()
            return response.content
    except Exception as e:
        logger.error(f"Error retrieving item content: {e}")
        raise ValueError(f"Error retrieving item content: {str(e)}")

# Run the server when this script is executed directly
if __name__ == "__main__":
    # Initialize and run the server
    mcp.run(transport='stdio')

# Alternative run method using asyncio
# if __name__ == "__main__":
#     import asyncio
#     from mcp.server.stdio import stdio_server
#     
#     async def main():
#         async with stdio_server() as streams:
#             await mcp.run(
#                 streams[0],
#                 streams[1],
#                 mcp.create_initialization_options()
#             )
#     
#     asyncio.run(main())
