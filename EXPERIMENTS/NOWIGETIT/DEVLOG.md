# Development Log - NowIGetIt

## About This Project

NowIGetIt takes scientific PDFs and transforms them into shareable, interactive web pages that explain the paper to a layperson. Upload a PDF, Claude reads the paper and generates a single-page HTML app, which gets published as a public GitHub Gist. The goal is making academic research accessible to anyone.

**Status:** Feature-complete (initial release)
**Started:** 2026-02-21
**Last Updated:** 2026-02-22

---

## 2026-02-21 - Project Inception

The idea was simple: take a scientific paper (PDF), send it to Claude, and get back an interactive web page that explains the paper to a non-expert. The initial implementation was built as a FastAPI backend with a vanilla HTML frontend -- no React, no build tools, just the simplest thing that works.

The core pipeline: upload PDF -> extract text -> send to Claude Opus 4.6 -> parse the HTML response -> publish as a public GitHub Gist on the jbdamask account. The frontend polls for status while processing happens asynchronously.

The initial scaffolding came together quickly as a local dev setup with FastAPI serving both the API and the static frontend.

---

## 2026-02-21 - AWS Deployment and First Bugs

Moved from local dev to AWS: CloudFormation template with API Gateway (HTTP API), three Lambda functions (upload, process, status), DynamoDB for job tracking, and S3 for both the frontend and temporary PDF hosting.

The first deployment surfaced a classic Lambda gotcha -- pip installs macOS binaries by default, but Lambda runs on Linux. Fixed by adding `--platform manylinux2014_x86_64 --only-binary=:all:` to the pip install in the deploy script. Also discovered Claude's API requires HTTPS URLs for documents, so switched the PDF hosting to use HTTPS S3 URLs instead of HTTP.

The GitHub token needed for Gist publishing required a fine-grained PAT. The only way to grant Gists permission is to also select read-only access to all public repos -- a GitHub limitation, not a design choice.

---

## 2026-02-21 - Streaming and Truncation Fixes

Hit the first real production bug: Claude's responses for complex papers were getting truncated. The HTML output was being cut off mid-tag. The root cause was that large responses weren't being streamed -- the SDK was buffering the entire response before returning it.

Switched to `client.messages.stream()` with `text_stream` iteration, which solved the truncation issue and dramatically reduced memory pressure on the Lambda. Also bumped `max_tokens` to 64000 to give Claude enough room for complex papers.

---

## 2026-02-21 - Progress Stages and UI Redesign

Processing takes 30-60 seconds, which felt like an eternity with no feedback. Added a progress stepper to the frontend showing four stages: Uploading PDF, Reading paper, Generating interactive page, and Publishing to web. The backend writes `progress_stage` to DynamoDB, and the frontend polls it to update the stepper.

Also redesigned the entire frontend. Went from a basic unstyled form to a dark-themed UI with DM Serif Display headings, ambient glow effects, grain overlay, and smooth animations. The drop zone supports drag-and-drop with visual feedback. It's intentionally moody -- makes the "aha moment" when you get the result link feel more satisfying.

---

## 2026-02-22 - Daily Rate Limit

Each PDF processing job costs real money (Claude API + GitHub API), so the app needed a daily cap to prevent runaway costs or abuse. The initial implementation used an atomic DynamoDB counter with a date-keyed item (`RATE_LIMIT#2026-02-22`) in the jobs table, but after deploying and testing, this approach felt wrong -- mixing rate limit bookkeeping with actual job records in the same table was messy.

Reworked the approach: the daily limit now lives in SSM Parameter Store (`/nowigetit/daily-processing-limit`, default 20), and the upload Lambda counts today's jobs by scanning DynamoDB records with a `created_date` field. This is cleaner because the limit is adjustable in Parameter Store without redeploying, and job records are the source of truth for the count. The `created_date` field was added to every job record -- something that should have been there from the start.

Hit a DynamoDB API gotcha along the way: `if_not_exists()` is only valid in `UpdateExpression`, not in `ConditionExpression`. The fix was `attribute_not_exists(request_count) OR request_count < :limit`, though this became moot when the atomic counter was replaced entirely.

The frontend handles 429 responses with a specific message ("Daily limit reached -- please try again tomorrow") and re-enables the upload button.

---

## 2026-02-22 - API Cost Tracking

Added per-job cost tracking. The Claude API response already includes `input_tokens` and `output_tokens` in the usage object -- `stream.get_final_message().usage` was already being called but the data was being thrown away. Now `generate_html()` returns a `(html, usage)` tuple, and the process Lambda calculates costs using Opus 4.6 pricing ($5/MTok input, $25/MTok output) and writes five fields to each job's DynamoDB record: `input_tokens`, `input_tokens_cost`, `output_tokens`, `output_tokens_cost`, and `total_cost`.

The frontend displays a cost breakdown below the gist link after processing completes, showing input tokens, output tokens, and total cost. Keeps the operator aware of what each paper costs to process.

---

## 2026-02-22 - Final Polish: Footer and Secrets Descriptions

Two small cleanup tasks to close out the initial build.

Replaced the "Powered by Claude" footer with a proper copyright line ("&copy; 2026 Amroja, LLC") on the left and a link to johndamask.com on the right, using flexbox to keep them apart. Changed the footer from a `<p>` to a `<div>` to hold the two elements.

Also added human-readable descriptions to the two Secrets Manager secrets (`nowigetit/anthropic-api-key` and `nowigetit/github-token`) in the deploy script. Both the create and update paths now set descriptions, so anyone browsing the AWS console can immediately see what each secret is for without having to trace through code.

With these two changes deployed, all 8 beads issues are closed. The project is feature-complete for its initial release.

---
