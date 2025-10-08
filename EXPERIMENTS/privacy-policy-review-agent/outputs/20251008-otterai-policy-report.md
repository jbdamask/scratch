# Compliance Risk Report – Otter.ai – 20251008

## Executive Summary
Otter.ai’s Privacy Policy (effective September 1, 2024) and its most recent Terms documents (consumer Terms of Service effective September 19, 2025 and Software Services Agreement for enterprise customers effective September 19, 2025) contain several clauses that warrant closer review. The Privacy Policy permits AI training on de-identified audio and on transcripts and includes advertising/analytics sharing; given the sensitive nature of recorded conversations, risk is elevated. The consumer Terms include broad disclaimers, a low liability cap, unilateral termination rights, and mandatory arbitration with class-action waiver. The enterprise Software Services Agreement improves balance (IP indemnity, data export on termination), but lacks explicit uptime/SLA and includes a blanket publicity right. Overall, this vendor should be flagged for human review before use with sensitive or regulated data.

---

## Located URLs (English)
- Privacy Policy URL #1: https://otter.ai/privacy-policy
- Terms of Service (Individual) URL #1: https://otter.ai/terms-of-service
- Terms of Service (Business) URL #1 (Software Services Agreement): https://otter.ai/software-services-agreement

---

## Rubric Explanation
All category scores represent **risk to our company (the firm)** if we use this vendor.  
- **Low** = Clause presents little or no risk to the firm.  
- **Medium** = Clause presents some risk that should be reviewed.  
- **High** = Clause presents significant risk and requires human review before approving this vendor.  

Each score must be supported with a **verbatim excerpt** and a **confidence tag** indicating how clear the policy text is.  

---

**Document Type**: Privacy Policy  
**URL**: https://otter.ai/privacy-policy  
**Effective date noted on page**: September 1, 2024

- Summary: Describes what personal information is collected (registration, device, usage, audio/transcripts, third-party integrations), how it is used (service delivery, improvement, AI training, communications, fraud prevention), sharing (cloud providers, analytics/advertising partners, data labeling, AI service providers, payment processors), retention, security, international transfers (DPF/SCCs), and user rights.

### Category Scores (Privacy Policy)
1) Data Collection (scope & sensitivity) — Score: Medium  
- Excerpt: “We will collect and use the following Personal Information about you: … Registration Information… App Information… you may provide us with your audio recordings… automatic OtterPilot screenshots… Usage Information… Device Information… Cookies… Location Information… Information we receive from third party platforms…”  
- Reason: Broad categories include audio/transcripts, screenshots, device/usage data, location, and third-party data; sensitive content may be captured in recordings/screenshots.  
- Confidence: High

2) Data Use & Purpose Limitation — Score: Medium  
- Excerpt: “We use your Personal Information to: Set up your account… Provide you with the Services… Improve and monitor the Services. We train our proprietary artificial intelligence technology on de-identified audio recordings. We also train our technology on transcriptions to provide more accurate services… Send you newsletters… Prevent fraud, defend Otter.ai against legal claims… and enforce our terms.”  
- Reason: Uses extend beyond core service to improvement, AI training on de-identified audio and on transcripts, marketing emails, and legal defense.  
- Confidence: High

3) Sharing / Selling — Score: Medium  
- Excerpt: “We share your Personal Information with selected third parties, including: … Cloud service providers… Platform support providers… Data labeling service providers… Artificial intelligence service providers… Analytics providers… Advertising Partners: We work with third party advertising partners to show you ads that we think may interest you.”  
- Reason: Broad onward sharing including advertising partners and data labeling/AI providers; opt-outs provided for some advertising/analytics, but constraints on partners are not fully detailed.  
- Confidence: High

4) AI/ML Use of Customer Data — Score: High  
- Excerpt: “We train our proprietary artificial intelligence technology on de-identified audio recordings. We also train our technology on transcriptions to provide more accurate services, which may contain Personal Information. We obtain explicit permission … for manual review of specific audio recordings to further refine our model training data.”  
- Reason: Explicit model training on de-identified audio and on transcripts (which may contain personal information); manual review occurs with consent. Given the sensitivity of recorded conversations, this presents elevated risk.  
- Confidence: High

5) Customer Control & Rights — Score: Medium  
- Excerpt: “You have the right to access… correct… request… erasure… object… restrict processing… portability… withdraw consent… we will require you to verify your identity… may have valid legal reasons to refuse your request.”  
- Reason: Standard rights are offered, but the policy reserves discretion to refuse requests and requires identity verification; mechanisms and timelines are not detailed.  
- Confidence: High

6) Security & Retention — Score: Medium  
- Excerpt: “Otter.ai maintains and implements physical, administrative, and technical safeguards… However, the transfer of Personal Information through the internet will carry its own inherent risks and we do not guarantee the security of your data… Otter.ai stores all Personal Information for as long as necessary to fulfill the purposes… When deleting Personal Information, we will take measures to render such Personal Information irrecoverable…”  
- Reason: Security is described at a high level with a disclaimer; retention is “as long as necessary” without detailed timelines.  
- Confidence: High

7) International Transfers & Legal Basis — Score: Low  
- Excerpt: “Otter.ai complies with the EU-U.S. Data Privacy Framework… UK Extension… and the Swiss-U.S. Data Privacy Framework… Where we transfer… outside of the EEA or the UK we will ensure that the appropriate safeguards are in place… such as… the Standard Contractual Clauses.”  
- Reason: Participation in DPF and commitment to SCCs indicates defined safeguards and roles.  
- Confidence: High

8) Policy Changes & Notice — Score: Medium  
- Excerpt: “Where required, we will update this Policy from time to time. When we do so, we will make it available on this page and indicate the date of the latest revision. Please check this page frequently to see any updates or changes to this Policy.”  
- Reason: Changes appear effective upon posting; no commitment to provide prior notice period.  
- Confidence: High

9) Subprocessors / Third-Party Transparency — Score: Medium  
- Excerpt: “We share your Personal Information with selected third parties, including… Cloud service providers… Platform support providers… Data labeling service providers… Artificial intelligence service providers… Analytics providers… Advertising Partners… Payment processors, such as Stripe.”  
- Reason: Categories and some named providers are listed, but no comprehensive public list or change notification is included in the policy itself.  
- Confidence: High

10) Children’s Data — Score: Low  
- Excerpt: “The Service and Website are not targeted at children, and we do not knowingly collect Personal Information from children under the age of 13.”  
- Reason: Clear exclusion of children under 13.  
- Confidence: High

Risk Appetite Overlay: Because the service processes audio recordings and transcripts that can contain sensitive or regulated information, we elevate the following from Medium to High for our firm’s use: AI/ML Use of Customer Data (already High) and Sharing/Selling (Medium→High if sensitive recordings or identifiers would be exposed via labeling/AI/ads), and Security & Retention (Medium→High if sensitive data is present without defined retention schedules).

**Problems Encountered (Privacy Policy)**  
- None.

---

**Document Type**: Terms of Service (Individual)  
**URL**: https://otter.ai/terms-of-service  
**Effective date noted on page**: September 19, 2025

- Summary: Consumer-facing terms that govern use of the service, with arbitration/class-action waiver, broad use restrictions, low liability cap, and a data/AI section addressing aggregated data, usage data, and machine learning. Allows unilateral modification (with acceptance for material changes) and allows Otter to terminate accounts at any time.

### Category Scores (Terms of Service – Individual)
1) Customer Data – Definition, Ownership, Licensing, and Use — Score: Medium-High  
- Excerpt: “As between you and Otter.ai, you retain any copyright and other proprietary rights that you may hold in the User Content…”; “Customer retains all ownership rights to the User Content processed using the service. You grant Otter.ai a worldwide, non-exclusive, royalty-free, fully paid right and license… to host, store, transfer, display, perform, reproduce, modify, export, process, transform, and distribute your User Content…”; “You acknowledge and agree that Otter.ai may collect, create, process, transmit, store, use, and disclose aggregated and/or deidentified data… for machine learning and training…”  
- Reason: Ownership retained by customer, but license to Otter is broad for processing and distribution; aggregated/deidentified data may be used for ML/training.  
- Confidence: High

2) Publicity & Use of Customer’s Name/Logo — Score: Low  
- Excerpt: [No explicit publicity or logo-use clause was identified in this document.]  
- Reason: The terms do not contain a clause authorizing Otter to use a consumer customer’s name or logo.  
- Confidence: Medium

3) Unilateral Changes to Terms — Score: Medium  
- Excerpt: “We reserve the right to change these Terms on a going-forward basis at any time… If a change to these Terms materially modifies your rights or obligations, we may require that you accept the modified Terms… Material modifications are effective upon your acceptance… Immaterial modifications are effective upon publication.”  
- Reason: Changes can be made unilaterally; material changes require acceptance to continue, but immaterial changes are effective on posting.  
- Confidence: High

4) Limitations of Liability — Score: High  
- Excerpt: “TO THE FULLEST EXTENT PERMITTED BY LAW, IN NO EVENT WILL THE OTTER.AI ENTITIES BE LIABLE TO YOU FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL OR PUNITIVE DAMAGES…”; “THE AGGREGATE LIABILITY… IS LIMITED TO THE GREATER OF: (A) THE AMOUNT YOU HAVE PAID TO OTTER.AI… IN THE 12 MONTHS PRIOR…; OR (B) $100.”  
- Reason: Very low cap and broad exclusions shift significant risk to the customer.  
- Confidence: High

5) Indemnification Obligations — Score: High  
- Excerpt: “To the fullest extent permitted by law, you… will defend and indemnify Otter.ai… arising out of or connected with… your unauthorized use… your violation… the nature of content of Data processed by the Service…”  
- Reason: One-sided indemnity by customer; no express vendor IP indemnity in the consumer terms.  
- Confidence: High

6) Termination Rights & Data Handling After Termination — Score: High  
- Excerpt: “Otter.ai may, at its sole discretion, terminate these Terms or your account… at any time for any reason or no reason, with or without notice.”; “Customer may delete User Content… Once it has been permanently deleted… no record… is retained and the User Content cannot be recreated…”  
- Reason: Vendor can terminate unilaterally without notice; limited commitments regarding return/export of data at end of term.  
- Confidence: High

7) Jurisdiction & Governing Law — Score: Medium-High  
- Excerpt: “These Terms are governed by the laws of the State of California… You and Otter.ai submit to the personal and exclusive jurisdiction of the state courts and federal courts located within Santa Clara County, California…”  
- Reason: Exclusive CA venue is vendor-favorable and may be burdensome.  
- Confidence: High

8) Acceptable Use / Restrictions — Score: Low-Medium  
- Excerpt: “BY USING THE SERVICE YOU AGREE NOT TO: … use the Service or any portion thereof for the direct or indirect benefit of any third parties; … use the Service in connection with any direct or indirect commercial purposes, including in connection with any paid transcription workflow or as a value-added component of a commercial product or service; …”  
- Reason: Broad and explicit prohibitions; while restrictive, they are clearly stated.  
- Confidence: High

9) Service Levels / Uptime Commitments — Score: High  
- Excerpt: “We are under no obligation to provide support for the Service.”  
- Reason: No SLA or uptime commitments; limited support obligations.  
- Confidence: High

10) Dispute Resolution — Score: High  
- Excerpt: “ARBITRATION NOTICE… disputes… will be resolved by binding, individual arbitration… YOU AND OTTER.AI ARE EACH WAIVING THE RIGHT TO A TRIAL BY JURY OR TO PARTICIPATE IN ANY CLASS ACTION…”; “You may opt out… within 30 days…”  
- Reason: Mandatory arbitration with class action waiver (opt-out available), which limits remedies.  
- Confidence: High

**Problems Encountered (Individual Terms)**  
- None.

---

**Document Type**: Terms of Service (Business) — Software Services Agreement  
**URL**: https://otter.ai/software-services-agreement  
**Effective date noted on page**: September 19, 2025

- Summary: Enterprise agreement granting access to the platform, incorporating a DPA, defining use restrictions, ownership, confidentiality, security program, payments, balanced IP indemnities, liability limits, termination/export on exit, California governing law, and a publicity clause permitting use of customer name/logo.

### Category Scores (Terms of Service – Business)
1) Customer Data – Definition, Ownership, Licensing, and Use — Score: Low-Medium  
- Excerpt: “Customer authorizes Otter and its service providers to use Customer Content for the sole purpose of providing the Otter Platform and performing the activities contemplated by this Agreement…”; “Otter will have the right to collect and analyze… ‘Usage Data’… and… use Usage Data in de-identified and aggregated form… For clarity, Usage Data excludes Customer Content itself.”  
- Reason: License is limited to providing services; usage data may be used in aggregated/deidentified form.  
- Confidence: High

2) Publicity & Use of Customer’s Name/Logo — Score: High  
- Excerpt: “Otter may use Customer’s name and logo to publicly identify Customer as a customer of the Otter services.”  
- Reason: Blanket publicity right without requiring prior consent or offering an opt-out.  
- Confidence: High

3) Unilateral Changes to Terms — Score: Low  
- Excerpt: “This Agreement supersedes all other agreements between the parties relating to its subject matter.”  
- Reason: No clause granting Otter unilateral amendment rights is present in the SSA; fee changes on renewal require notice (Section 3.1).  
- Confidence: Medium

4) Limitations of Liability — Score: Medium  
- Excerpt: “UNDER NO CIRCUMSTANCES… WILL THE TOTAL LIABILITY OF EITHER PARTY… EXCEED… THE FEES PAID AND PAYABLE… IN THE TWELVE-MONTH PERIOD PRIOR…”  
- Reason: A typical commercial cap, but still vendor-favorable for high-value losses.  
- Confidence: High

5) Indemnification Obligations — Score: Low  
- Excerpt: “Otter will defend Customer from any… Claim… that the Otter Platform violates, infringes, or misappropriates… and will indemnify Customer…”; “Customer will defend Otter from any Claim based on Customer Content or use… in violation of this Agreement…”  
- Reason: Balanced indemnities (vendor for IP; customer for misuse).  
- Confidence: High

6) Termination Rights & Data Handling After Termination — Score: Low  
- Excerpt: “Either party may terminate… if the other party materially breaches… and… does not cure…”; “Upon any termination… Otter will make all Customer Content… available… for… 30 days, but thereafter Otter will delete or retain… as directed by Customer.”  
- Reason: Mutual termination for cause and a defined post-termination data export/deletion process.  
- Confidence: High

7) Jurisdiction & Governing Law — Score: Medium  
- Excerpt: “This Agreement is governed by the laws of the State of California… [and] Santa Clara County, California for resolution of any lawsuit or court proceeding…”  
- Reason: Exclusive CA venue is vendor-favorable; however, no arbitration mandate.  
- Confidence: High

8) Acceptable Use / Restrictions — Score: Low  
- Excerpt: “Customer will not… reverse engineer… copy, modify… use the Otter Platform for personal or other non-commercial purposes; or publish any benchmarks…”  
- Reason: Standard enterprise restrictions.  
- Confidence: High

9) Service Levels / Uptime Commitments — Score: High  
- Excerpt: [No explicit SLA or uptime/service credit commitments identified in this Agreement.]  
- Reason: Absence of SLA language; remedies are limited to warranties/termination and pro-rata refunds in certain cases.  
- Confidence: Medium

10) Dispute Resolution — Score: Low  
- Excerpt: “Customer and Otter submit to the personal and exclusive jurisdiction of the state courts and federal courts located within Santa Clara County, California…”  
- Reason: Court venue; no mandatory arbitration or class waiver.  
- Confidence: High

### Differences Between Individual and Business Terms (salient areas)
- Ownership/licensing: Individual ToS grants Otter a broad license over “User Content” to host/process/modify/distribute (Section 9.3), while the SSA limits use to “the sole purpose of providing the Otter Platform” and clarifies Usage Data is de-identified and excludes Customer Content (Sections 2.3 and 2.5).
- Publicity: No explicit publicity clause in the Individual ToS; the SSA grants Otter the right to use the enterprise customer’s name and logo (Section 9.14).
- Indemnification: Individual ToS requires only customer indemnification (Section 15); SSA adds vendor IP indemnification (Section 6.1) and customer indemnification for misuse (Section 6.2).
- Termination and post-termination handling: Individual ToS allows Otter to terminate at any time, with or without notice (Section 14.2); SSA provides mutual termination for cause and a 30-day data export window (Section 8.3).
- Dispute resolution: Individual ToS imposes binding arbitration with class-action waiver (Section 19); SSA uses courts in Santa Clara County, California (Section 9.8), no arbitration requirement.
- SLA/Uptime: Neither document includes an explicit SLA; both should be supplemented with an SLA for enterprise use.

---

## Problems Encountered
- None. Pages were accessible and fully scraped.
