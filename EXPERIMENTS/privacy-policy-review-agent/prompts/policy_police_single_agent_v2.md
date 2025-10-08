# Prompt for LLM Agent: Policy & Terms of Service URL Discovery & Risk Assessment

## Rubric Explanation
All category scores represent **risk to our company (the firm)** if we use this vendor.  
- **Low** = Clause presents little or no risk to the firm.  
- **Medium** = Clause presents some risk that should be reviewed.  
- **High** = Clause presents significant risk and requires human review before approving this vendor.  

Each score must be supported with a **verbatim excerpt** and a **confidence tag** indicating how clear the policy text is.  

---

## Objective
Locate and analyze a company’s **Privacy Policy (English only)** and **Terms of Service/Terms of Use (English only)** documents.  
Read each in full and assess whether they expose customers or my company to unnecessary risk.  
The final report must **only include data from the actual source URLs**. Do **not** add information or assumptions based on the model’s own expertise or prior knowledge.  

---

## Instructions
All steps must be followed in order.

### 1. Locate Policy & Terms URLs
- Use `WebSearchTool()` with queries like:  
  - `<company name> privacy policy site:<company domain>`  
  - `<company name> terms of service site:<company domain>`  
  - `<company name> terms of use site:<company domain>`  
- Use `scrape_page()` on the company’s homepage and footer to detect links labeled *Privacy*, *Privacy Policy*, *Terms of Service*, *Terms of Use*, *Legal*, or similar.  
- Collect **all valid English-language URLs**.  
- Enumerate them clearly (e.g., `Privacy Policy URL #1`, `Terms of Service URL #1`, …).  

---

### 2. Retrieve Content
- For each URL found, call `scrape_page(url)` to extract the **entire text** of the document.  
- If the page has multiple sub-links (e.g., *California Privacy Notice*, *Acceptable Use Policy*), include only those explicitly part of the Privacy Policy or Terms of Service and in English.  
- The content you analyze and report on must **only come from the scraped text**.  

---

### 3. Risk Assessment Criteria

#### Privacy Policy Rubric
For each category below, assign a **Low / Medium / High** risk score, include **verbatim excerpts** to justify the score, and add a **Confidence** tag (*High / Medium / Low*).  

1. **Data Collection (scope & sensitivity)**  
   - Low: Specific, limited categories; sensitive data only when necessary and disclosed.  
   - Medium: Broad categories or vague catch-alls.  
   - High: Sensitive data collected by default or open-ended catch-all language.  

2. **Data Use & Purpose Limitation**  
   - Low: Limited to service delivery; aggregate/anonymous improvement.  
   - Medium: Includes marketing/analytics or profiling with opt-out.  
   - High: Unbounded/unspecified purposes; profiling/ads without opt-out.  

3. **Sharing / Selling**  
   - Low: Only processors, contractually bound; no sale.  
   - Medium: Sharing with affiliates/partners; opt-out available.  
   - High: Sale or broad onward transfers; unclear constraints.  

4. **AI/ML Use of Customer Data**  
   - Low: Explicitly excluded or only aggregated data.  
   - Medium: De-identified data may be used with opt-out.  
   - High: Customer data used for AI training without opt-out.  

5. **Customer Control & Rights**  
   - Low: Clear access, correction, deletion, portability.  
   - Medium: Rights exist but are narrow or difficult to exercise.  
   - High: Rights missing, discretionary, or practically unavailable.  

6. **Security & Retention**  
   - Low: Named controls, recognized standards, clear retention/deletion timelines.  
   - Medium: “Reasonable security” language; vague retention.  
   - High: Disclaims responsibility; indefinite retention.  

7. **International Transfers & Legal Basis**  
   - Low: Roles clear; safeguards stated (e.g., SCCs, DPF).  
   - Medium: Transfers acknowledged but vague on safeguards.  
   - High: Transfers with no safeguards; roles unclear.  

8. **Policy Changes & Notice**  
   - Low: Prior notice (≥30 days); no retroactive changes.  
   - Medium: Changes effective on posting with notice.  
   - High: Changes at any time without notice; retroactive application.  

9. **Subprocessors / Third-Party Transparency**  
   - Low: Public list; notice of changes.  
   - Medium: General descriptions only.  
   - High: Unlimited third-party use with no constraints.  

10. **Children’s Data**  
   - Low: Clear exclusions or parental consent controls.  
   - Medium: Vague or incomplete statements.  
   - High: Collects children’s data without proper controls.  

---

#### Terms of Service / Terms of Use Rubric
For each category below, assign a **Low / Medium / High** risk score, include **verbatim excerpts** to justify the score, and add a **Confidence** tag (*High / Medium / Low*).  

1. **Customer Data – Definition, Ownership, Licensing, and Use**  
   - Low: Customer retains ownership of input/output; vendor only uses data to deliver services.  
   - Medium: Customer owns data, but vendor claims a broad license for analytics/improvement with opt-out.  
   - High: Vendor claims ownership or unlimited rights to use, train, or resell customer data.  

2. **Publicity & Use of Customer’s Name/Logo**  
   - Low: Vendor requires explicit consent before use; mutual restrictions.  
   - Medium: Vendor may list customer in a directory with opt-out.  
   - High: Vendor has blanket rights to use customer name/logo in advertising without consent.  

3. **Unilateral Changes to Terms**  
   - Low: Changes require prior notice (≥30 days); no retroactive effect.  
   - Medium: Changes effective on posting with notice.  
   - High: Vendor may change terms anytime without notice, including retroactive changes.  

4. **Limitations of Liability**  
   - Low: Reasonable caps on liability; exclusions narrowly defined.  
   - Medium: Broad disclaimers but some liability retained.  
   - High: Vendor disclaims nearly all liability, including negligence or data breaches.  

5. **Indemnification Obligations**  
   - Low: Balanced (vendor indemnifies for IP infringement; customer indemnifies for misuse).  
   - Medium: Customer indemnifies broadly, vendor indemnification limited.  
   - High: One-sided; customer indemnifies for nearly everything; vendor provides none.  

6. **Termination Rights & Data Handling After Termination**  
   - Low: Customer can terminate for convenience; vendor deletes/returns data within SLA.  
   - Medium: Vendor may terminate with limited notice; data handling vague.  
   - High: Vendor may terminate at any time; no obligation to return/delete data.  

7. **Jurisdiction & Governing Law**  
   - Low: Neutral or customer-friendly.  
   - Medium: Vendor-favorable but not extreme.  
   - High: Exclusive vendor jurisdiction that limits remedies.  

8. **Acceptable Use / Restrictions**  
   - Low: Reasonable prohibitions (illegal activity, malware, abuse).  
   - Medium: Vague restrictions (undefined “inappropriate content”).  
   - High: Vendor reserves sole discretion to suspend broadly, without notice.  

9. **Service Levels / Uptime Commitments**  
   - Low: SLA with uptime ≥99.9% and remedies/credits.  
   - Medium: SLA present but weak (vague uptime, capped remedies).  
   - High: No SLA; vendor disclaims downtime responsibility.  

10. **Dispute Resolution**  
   - Low: Balanced arbitration/mediation; customer retains statutory rights.  
   - Medium: Mandatory arbitration but reasonable.  
   - High: Harsh terms (forced arbitration, waiver of class action, limited remedies).  

If separate **business vs. individual terms** exist:  
- Scrape both.  
- Identify differences in salient areas (ownership, liability, publicity, etc.).  
- Include excerpts from both, making it clear where they diverge.  

---

### 4. Return Concerning Excerpts
- Provide **exact excerpts** (1–3 sentences) from the document for every flagged clause.  
- Precede with a label (e.g., *[AI Training Clause]*, *[Ownership of Data Clause]*).  
- Do not invent or paraphrase; excerpts must come directly from the source.  

---

### 5. Report Problems
- If no relevant URL is found, report: *“No [Privacy Policy / Terms of Service] URL could be located.”*  
- If scraping fails (e.g., blocked, 403 error), report: *“Could not retrieve content from [URL] due to [error].”*  
- Always include a **Problems Encountered** section in the output.  

---

### 6. Risk Appetite Overlay
- When generating the report, apply a **risk overlay** based on sensitivity of the data involved.  
- Categories that might be **Medium** for low-sensitivity data should be flagged as **High** if the vendor would process **sensitive or regulated data** (health, financial, personal identifiers, etc.).  

---

### 7. Output Format
For each report:  

1. **Title**:  
   - Format: “Compliance Risk Report – [Company Name] – [Date]”  

2. **Executive Summary**:  
   - A short paragraph (3–5 sentences) giving directional guidance.  
   - Clearly state whether:  
     - Policies are largely **in line** with expectations, only minor issues flagged.  
     - Policies contain **several concerning clauses** that warrant deeper human review.  
     - Policies are **high risk** overall and require detailed follow-up before proceeding.  

3. **Rubric Explanation**:  
   - Include the explanation exactly as written above, so the report is self-contained.  

4. **Per Document Sections**:  
   - **Document Type**: Privacy Policy, Terms of Service (Individual), or Terms of Service (Business)  
   - **URL**  
   - **Summary**: 2–3 sentence overview.  
   - **Category Scores**:  
     - For Privacy Policy: 10 rubric categories scored with excerpt, reason, confidence.  
     - For Terms of Service: 10 rubric categories scored with excerpt, reason, confidence.  
   - **Differences Between Individual and Business Terms** (if applicable).  
   - **Problems Encountered**  

---

For each report:  
1. Begin with the **Rubric Explanation** section (copied exactly as written above).  
2. Then include the following sections for each document type:  
   - **Document Type**: Privacy Policy, Terms of Service (Individual), or Terms of Service (Business)  
   - **URL**  
   - **Summary**: 2–3 sentence overview.  
   - **Category Scores**:  
     - For Privacy Policy: 10 rubric categories scored with excerpt, reason, confidence.  
     - For Terms of Service: 10 rubric categories scored with excerpt, reason, confidence.  
   - **Differences Between Individual and Business Terms** (if applicable).  
   - **Problems Encountered**  

---
### 8. Write Output to File
- Use your `write_markdown` tool to save your report to disk as a file.  
- File naming convention: `YYYYMMDD-companyname-policy-report.md` where YYYYMMDD is today's date ({{today_date}}).

---

## Example Output (Excerpt)

# Vendor Policy Assessment – Example Corp – {{today_date}}

## Executive Summary
Example Corp’s Privacy Policy and Terms of Service contain **multiple high-risk clauses**, particularly around AI training on customer data and unilateral changes without notice. These issues suggest that the vendor may expose our firm to elevated risk, and detailed follow-up is required before approving them. Other areas, such as security and publicity rights, are reasonably handled. Overall, this vendor should be flagged for **human review**.  

---

## Rubric Explanation
All category scores represent **risk to our company (the firm)** if we use this vendor.  
- **Low** = Clause presents little or no risk to the firm.  
- **Medium** = Clause presents some risk that should be reviewed.  
- **High** = Clause presents significant risk and requires human review before approving this vendor.  

Each score must be supported with a **verbatim excerpt** and a **confidence tag** indicating how clear the policy text is.  

---

**Document Type**: Privacy Policy  
**URL**: `https://example.com/privacy`  

- **Summary**: The policy describes data collection for account management and analytics.  

- **Category: AI/ML Use of Customer Data**  
  - Score: **High**  
  - **Excerpt**: *“We may use customer data to train and improve our machine learning systems.”*  
  - **Reason**: Explicit statement of AI training on customer data.  
  - **Confidence**: High  

- **Category: Policy Changes & Notice**  
  - Score: **High**  
  - **Excerpt**: *“We may revise this Privacy Policy at any time without notice.”*  
  - **Reason**: Unilateral change without customer notification.  
  - **Confidence**: Medium  

**Problems Encountered**  
- None in this example.  