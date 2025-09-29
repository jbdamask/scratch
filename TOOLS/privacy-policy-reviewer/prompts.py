"""
Prompt templates for the Privacy Policy Analyzer
"""

SYSTEM_PROMPT = """You are an expert privacy policy analyzer with the ability to plan and execute multi-step analyses.

Your role is to systematically extract and analyze privacy practices across 9 key categories:
1. Data Collection Scope & Sensitivity
2. Data Use & Purpose Limitations
3. Sharing and/or Selling of Customer Data
4. AI/ML Use of Customer Data
5. Customer Control & Rights Over Data
6. Data Security & Retention
7. International Transfer & Legal Basis
8. Policy Changes & Customer Notification
9. Subprocessors & Third Parties

## Analysis Principles
- Use semantic understanding, not just keyword matching
- Quote exact language for legally significant terms
- Cite source sections for all findings
- Flag ambiguities, contradictions, and missing information
- Note when information is absent (absence is data)
- Be thorough, objective, and precise

## Working Mode
When asked to create a plan, break down the analysis into concrete, executable steps.
When executing a step, focus only on that specific task and provide structured output.
When asked to verify, check for completeness, consistency, and quality."""

PLAN_PROMPT = """I need you to analyze the following privacy policy document.

First, create a detailed execution plan with specific steps. Each step should be:
- Concrete and actionable
- Focused on extracting specific information
- Designed to minimize redundant document reading

Consider:
- Document length and structure
- Which categories might have overlapping information
- Whether targeted searches will be needed for missing info
- What verification steps are necessary

Format your plan as a JSON array of steps, where each step has:
- "step_number": integer
- "name": brief descriptive name
- "description": what this step accomplishes
- "focus": specific categories or aspects to extract
- "output": what this step produces

Document preview (first 2000 chars):
{document_preview}
...
[Document continues for {document_length} total characters]

Provide your plan in this exact JSON format:
```json
{{
  "plan": [
    {{
      "step_number": 1,
      "name": "Initial Comprehensive Extraction",
      "description": "...",
      "focus": ["category 1", "category 2", ...],
      "output": "..."
    }},
    ...
  ],
  "reasoning": "Brief explanation of why this plan is optimal for this document"
}}
```"""

EXECUTION_PROMPT = """Execute this analysis step:

**Step:** {step_name}
**Description:** {step_description}
**Focus Areas:** {step_focus}
**Expected Output:** {step_output}
{context_info}

For each category you extract information for, provide:
- Key findings (specific, detailed)
- Direct quotes with section citations for legally significant terms
- Source sections where information was found
- Any gaps, ambiguities, or concerns

Format your response as JSON with this structure:
```json
{{
  "step_completed": "{step_name}",
  "findings": {{
    "category_name": {{
      "key_findings": ["finding 1", "finding 2", ...],
      "quotes": [
        {{"text": "exact quote", "section": "Section X"}},
        ...
      ],
      "source_sections": ["Section 1", "Section 2", ...],
      "concerns": ["concern 1", ...],
      "assessment": "Strong/Adequate/Weak/Concerning/Missing"
    }},
    ...
  }},
  "notes": "Any observations about this step"
}}
Document:
{document}"""
VERIFICATION_PROMPT = """Review the analysis findings for this privacy policy and verify completeness and consistency.
Required categories (all must have findings):

Data Collection Scope & Sensitivity
Data Use & Purpose Limitations
Sharing and/or Selling of Customer Data
AI/ML Use of Customer Data
Customer Control & Rights Over Data
Data Security & Retention
International Transfer & Legal Basis
Policy Changes & Customer Notification
Subprocessors & Third Parties

Current findings:
{findings}
Verify:

All 9 categories have been addressed
Findings are consistent across categories (e.g., data shared matches data collected)
No contradictions in the findings
Quality of extraction (are findings specific and well-cited?)
Any critical gaps that need targeted re-examination

Respond in JSON format:
{{
  "all_categories_covered": true/false,
  "missing_categories": ["category name", ...],
  "consistency_issues": ["issue description", ...],
  "quality_assessment": "Excellent/Good/Adequate/Needs Improvement",
  "gaps_requiring_reexamination": [
    {{"category": "name", "specific_gap": "what's missing"}},
    ...
  ],
  "ready_for_synthesis": true/false,
  "notes": "Overall assessment"
}}
```"""

GAP_FILLING_PROMPT = """The initial analysis has gaps that need to be filled. Perform a targeted search for the following:

Gaps to address:
{gaps}

Previous findings for context:
{context}

Instructions:
- Focus ONLY on the specified gaps
- Check appendices, supplementary sections, and implicit information
- Look for information that might be described differently than expected
- If information truly doesn't exist, explicitly state that

Provide findings in the same JSON format as before, but only for the gap categories.

Document:
{document}"""

SYNTHESIS_PROMPT = """Create a comprehensive final analysis report for this privacy policy.

Policy Name: {policy_name}
Analysis Date: {analysis_date}

All findings gathered:
{findings}

Generate a complete report in clean markdown format with:

# Privacy Policy Analysis: {policy_name}

**Analysis Date:** {analysis_date}  
**Document Length:** {document_length:,} characters

---

## Executive Summary

Provide a 3-5 paragraph overview covering:
- Brief characterization of the company's data practices
- Overall risk level (Low/Medium/High/Critical) with justification
- Top 3-5 key concerns
- Top 3-5 positive practices
- Bottom line recommendation

---

## Detailed Category Analysis

For EACH of the 9 categories below, provide a thorough section with:
- Clear prose explanation of findings (not just bullets)
- Important direct quotes with section citations
- Specific assessment (Strong/Adequate/Weak/Concerning/Missing)
- Red flags or concerns
- Notable positive practices

### 1. Data Collection Scope & Sensitivity

[Analysis here]

### 2. Data Use & Purpose Limitations

[Analysis here]

### 3. Sharing and/or Selling of Customer Data

[Analysis here]

### 4. AI/ML Use of Customer Data

[Analysis here]

### 5. Customer Control & Rights Over Data

[Analysis here]

### 6. Data Security & Retention

[Analysis here]

### 7. International Transfer & Legal Basis

[Analysis here]

### 8. Policy Changes & Customer Notification

[Analysis here]

### 9. Subprocessors & Third Parties

[Analysis here]

---

## Risk Assessment

### Critical Issues (Immediate Attention Required)
- [List critical concerns]

### Medium Priority Concerns
- [List medium concerns]

### Low Priority Observations
- [List minor observations]

---

## Recommendations

### For Users
1. [Specific actionable recommendation]
2. [Rights to exercise]
3. [Settings to check or configure]

### Questions to Ask the Vendor
1. [Specific clarification needed]
2. [Ambiguity to resolve]
3. [Additional information to request]

---

## Conclusion

[Final summary paragraph]

---

*This analysis was generated using an AI-powered privacy policy analyzer. While comprehensive, it should not be considered legal advice. Consult with a privacy professional for specific legal guidance.*"""
