#!/usr/bin/env python3
"""
Privacy Policy Analyzer - Single Agent with Multi-Step Workflow
Usage: python analyze_policy.py <path_to_policy_file>
"""

import anthropic
import json
import sys
import os
from pathlib import Path
from datetime import datetime

# Import prompts from the prompts file
try:
    from prompts import SYSTEM_PROMPT, PLAN_PROMPT, EXECUTION_PROMPT, VERIFICATION_PROMPT, GAP_FILLING_PROMPT, SYNTHESIS_PROMPT
except ImportError:
    print("Error: prompts.py file not found!")
    print("Make sure prompts.py is in the same directory as this script.")
    sys.exit(1)

# Set your API key as an environment variable: export ANTHROPIC_API_KEY='your-key-here'
client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

def call_claude(messages, max_tokens=16000):
    """Make a call to Claude with the given messages."""
    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=max_tokens,
        system=SYSTEM_PROMPT,
        messages=messages
    )
    return response.content[0].text

def log(message, verbose=True):
    """Print log message only if verbose mode is on."""
    if verbose:
        print(message)

def create_analysis_plan(document, verbose=True):
    """Step 1: Ask Claude to create an analysis plan."""
    log("\n" + "="*80, verbose)
    log("STEP 1: Creating Analysis Plan", verbose)
    log("="*80, verbose)
    
    prompt = PLAN_PROMPT.format(
        document_preview=document[:2000],
        document_length=len(document)
    )

    response = call_claude([{"role": "user", "content": prompt}], max_tokens=4000)
    
    # Extract JSON from response
    try:
        json_start = response.find('{')
        json_end = response.rfind('}') + 1
        plan_data = json.loads(response[json_start:json_end])
        
        log(f"\n✓ Plan created with {len(plan_data['plan'])} steps", verbose)
        log(f"\nReasoning: {plan_data['reasoning']}", verbose)
        log("\nSteps:", verbose)
        for step in plan_data['plan']:
            log(f"  {step['step_number']}. {step['name']}", verbose)
            focus_str = ', '.join(step['focus']) if isinstance(step['focus'], list) else step['focus']
            log(f"     Focus: {focus_str}", verbose)
        
        return plan_data['plan']
    except (json.JSONDecodeError, KeyError) as e:
        log(f"Error parsing plan: {e}", verbose)
        log("Response:", verbose)
        log(response, verbose)
        sys.exit(1)

def execute_step(step, document, context, verbose=True):
    """Execute a single step of the analysis plan."""
    log("\n" + "="*80, verbose)
    log(f"EXECUTING STEP {step['step_number']}: {step['name']}", verbose)
    log("="*80, verbose)
    log(f"Description: {step['description']}", verbose)
    log(f"Focus: {step['focus']}", verbose)
    
    # Build context-aware prompt
    context_info = ""
    if context:
        context_info = "\n\nPrevious findings for context:\n" + json.dumps(context, indent=2)
    
    prompt = EXECUTION_PROMPT.format(
        step_name=step['name'],
        step_description=step['description'],
        step_focus=step['focus'],
        step_output=step['output'],
        context_info=context_info,
        document=document
    )

    response = call_claude([{"role": "user", "content": prompt}], max_tokens=16000)
    
    # Extract JSON from response
    try:
        json_start = response.find('{')
        json_end = response.rfind('}') + 1
        result = json.loads(response[json_start:json_end])
        
        log(f"\n✓ Step completed: {result.get('step_completed', step['name'])}", verbose)
        if 'notes' in result:
            log(f"Notes: {result['notes']}", verbose)
        
        # Show summary of findings
        if 'findings' in result:
            log(f"\nExtracted information for {len(result['findings'])} categories:", verbose)
            for cat_name, cat_data in result['findings'].items():
                assessment = cat_data.get('assessment', 'Unknown')
                num_findings = len(cat_data.get('key_findings', []))
                log(f"  - {cat_name}: {assessment} ({num_findings} findings)", verbose)
        
        return result
    except (json.JSONDecodeError, KeyError) as e:
        log(f"Warning: Could not parse step result as JSON: {e}", verbose)
        log("Treating as unstructured response...", verbose)
        return {"step_completed": step['name'], "raw_response": response}

def verify_completeness(all_findings, document, verbose=True):
    """Verify that all categories have been adequately covered."""
    log("\n" + "="*80, verbose)
    log("VERIFICATION: Checking Completeness and Consistency", verbose)
    log("="*80, verbose)
    
    prompt = VERIFICATION_PROMPT.format(
        findings=json.dumps(all_findings, indent=2)
    )

    response = call_claude([{"role": "user", "content": prompt}], max_tokens=4000)
    
    try:
        json_start = response.find('{')
        json_end = response.rfind('}') + 1
        verification = json.loads(response[json_start:json_end])
        
        log(f"\n✓ Verification complete", verbose)
        log(f"All categories covered: {verification['all_categories_covered']}", verbose)
        log(f"Quality: {verification['quality_assessment']}", verbose)
        log(f"Ready for synthesis: {verification['ready_for_synthesis']}", verbose)
        
        if verification['missing_categories']:
            log(f"\nMissing categories: {', '.join(verification['missing_categories'])}", verbose)
        
        if verification['consistency_issues']:
            log(f"\nConsistency issues found: {len(verification['consistency_issues'])}", verbose)
            for issue in verification['consistency_issues']:
                log(f"  - {issue}", verbose)
        
        if verification['gaps_requiring_reexamination']:
            log(f"\nGaps requiring attention: {len(verification['gaps_requiring_reexamination'])}", verbose)
            for gap in verification['gaps_requiring_reexamination']:
                log(f"  - {gap['category']}: {gap['specific_gap']}", verbose)
        
        return verification
    except (json.JSONDecodeError, KeyError) as e:
        log(f"Error parsing verification: {e}", verbose)
        return {"ready_for_synthesis": True, "quality_assessment": "Unknown"}

def fill_gaps(gaps, document, context, verbose=True):
    """Perform targeted extraction for identified gaps."""
    log("\n" + "="*80, verbose)
    log("GAP FILLING: Targeted Re-examination", verbose)
    log("="*80, verbose)
    
    prompt = GAP_FILLING_PROMPT.format(
        gaps=json.dumps(gaps, indent=2),
        context=json.dumps(context, indent=2),
        document=document
    )

    response = call_claude([{"role": "user", "content": prompt}], max_tokens=8000)
    
    try:
        json_start = response.find('{')
        json_end = response.rfind('}') + 1
        gap_findings = json.loads(response[json_start:json_end])
        
        log(f"\n✓ Gap filling completed", verbose)
        if 'findings' in gap_findings:
            log(f"Addressed {len(gap_findings['findings'])} gaps", verbose)
        
        return gap_findings
    except (json.JSONDecodeError, KeyError) as e:
        log(f"Warning: Could not parse gap filling result: {e}", verbose)
        return {}

def synthesize_final_report(all_findings, document, policy_name, verbose=True):
    """Generate the final comprehensive analysis report."""
    log("\n" + "="*80, verbose)
    log("SYNTHESIS: Generating Final Report", verbose)
    log("="*80, verbose)
    
    prompt = SYNTHESIS_PROMPT.format(
        policy_name=policy_name,
        analysis_date=datetime.now().strftime('%Y-%m-%d'),
        findings=json.dumps(all_findings, indent=2),
        document_length=len(document)
    )

    response = call_claude([{"role": "user", "content": prompt}], max_tokens=16000)
    
    log("\n✓ Final report generated", verbose)
    
    return response

def main():
    if len(sys.argv) < 2:
        print("Usage: python analyze_policy.py <path_to_policy_file>")
        print("\nOptions:")
        print("  --quiet    Suppress progress output (only save report)")
        sys.exit(1)
    
    # Parse arguments
    verbose = "--quiet" not in sys.argv
    policy_path = Path([arg for arg in sys.argv[1:] if not arg.startswith('--')][0])
    
    if not policy_path.exists():
        print(f"Error: File not found: {policy_path}")
        sys.exit(1)
    
    log(f"\n{'='*80}", verbose)
    log(f"Privacy Policy Analyzer - Single Agent Multi-Step Workflow", verbose)
    log(f"{'='*80}", verbose)
    log(f"Analyzing: {policy_path.name}", verbose)
    log(f"File size: {policy_path.stat().st_size:,} bytes", verbose)
    
    # Read the document
    try:
        document = policy_path.read_text(encoding='utf-8')
        log(f"Document length: {len(document):,} characters", verbose)
    except Exception as e:
        print(f"Error reading file: {e}")
        sys.exit(1)
    
    # Initialize context to store findings across steps
    context = {}
    
    # Step 1: Create analysis plan
    plan = create_analysis_plan(document, verbose)
    
    # Step 2: Execute each step in the plan
    all_findings = {}
    for step in plan:
        result = execute_step(step, document, context, verbose)
        
        # Merge findings into context
        if 'findings' in result:
            all_findings.update(result['findings'])
            context.update(result['findings'])
    
    # Step 3: Verify completeness
    verification = verify_completeness(all_findings, document, verbose)
    
    # Step 4: Fill gaps if needed
    if not verification.get('ready_for_synthesis', False) and verification.get('gaps_requiring_reexamination'):
        gap_findings = fill_gaps(verification['gaps_requiring_reexamination'], document, context, verbose)
        if 'findings' in gap_findings:
            all_findings.update(gap_findings['findings'])
        
        # Re-verify after gap filling
        verification = verify_completeness(all_findings, document, verbose)
    
    # Step 5: Generate final report
    final_report = synthesize_final_report(all_findings, document, policy_path.stem, verbose)
    
    # Save the report
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    output_path = policy_path.parent / f"{policy_path.stem}_analysis_{timestamp}.md"
    output_path.write_text(final_report, encoding='utf-8')
    
    log("\n" + "="*80, verbose)
    log("ANALYSIS COMPLETE", verbose)
    log("="*80, verbose)
    print(f"\n✓ Analysis complete!")
    print(f"✓ Report saved to: {output_path}")
    print(f"✓ File size: {output_path.stat().st_size:,} bytes\n")

if __name__ == "__main__":
    main()
