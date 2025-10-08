import asyncio
from datetime import datetime

from agents import Agent, ItemHelpers, MessageOutputItem, Runner, add_trace_processor, trace, WebSearchTool, ModelSettings
from agents.tracing.processors import BatchTraceProcessor
from utils import FileSpanExporter, output_file, load_prompt
from tools import scrape_page, write_markdown

"""
This example shows the agents-as-tools pattern. The frontline agent receives a user message and
then picks which agents to call, as tools. 
"""


add_trace_processor(BatchTraceProcessor(FileSpanExporter()))

default_model = "gpt-5"

# Get current date for prompt substitution
today_date = datetime.now().strftime("%Y%m%d")

policy_police_single_agent = Agent(
    name="policy_police_single_agent",
    instructions=load_prompt("policy_police_single_agent_v2.md", today_date=today_date),
    tools=[scrape_page, WebSearchTool(), write_markdown],
    model=default_model,
    model_settings=ModelSettings(parallel_tool_calls=False, max_turns=20),
)


# synthesizer_agent = Agent(
#     name="synthesizer_agent",
#     instructions="You locate the URLs for a vendor's privacy policy and terms of service, navigate to the policy pages (including sublinks if needed), read the policies, and produce a concise report of your findings. Write your report to disk using the write_markdown tool.",
#     tools=[scrape_page, WebSearchTool(), write_markdown],
# )


async def main():
    msg = input("What is the URL of the vendor whose policy you would like to review? ")

    # Run the entire orchestration in a single trace
    with trace("Orchestrator evaluator"):
        orchestrator_result = await Runner.run(policy_police_single_agent, msg, max_turns=15)

        for item in orchestrator_result.new_items:
            if isinstance(item, MessageOutputItem):
                text = ItemHelpers.text_message_output(item)
                if text:
                    print(f"  - Policy step: {text}")

        # synthesizer_result = await Runner.run(
        #     synthesizer_agent, orchestrator_result.to_input_list()
        # )

    print(f"\n\nFinal response:\n{orchestrator_result.final_output}")


if __name__ == "__main__":
    asyncio.run(main())