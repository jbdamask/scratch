# Fix Plan: Critical & High Severity Issues

## CRITICAL Fixes

### Fix #1 — Move secrets to SSM Parameter Store (Issues #1, #2)

**Problem:** API keys stored as plaintext Lambda env vars (visible in AWS Console, CloudTrail) and passed as CLI args in deploy.sh (visible in `ps aux`).

**Changes:**

**`aws/nowigetit.yaml`:**
- Remove `AnthropicApiKey` and `GithubToken` parameters entirely
- Remove `ANTHROPIC_API_KEY` and `GITHUB_TOKEN` from ProcessFunction environment variables
- Add two SSM Parameter resources that store the secrets as SecureString
- Add `ssm:GetParameter` IAM permission to LambdaRole for the two parameter ARNs
- Add `ANTHROPIC_API_KEY_PARAM` and `GITHUB_TOKEN_PARAM` env vars (just the parameter *names*, not values)

**`backend/lambda_process.py`:**
- Add a helper that fetches secrets from SSM at module scope (cached across warm Lambda invocations)
- Set `os.environ["ANTHROPIC_API_KEY"]` and `os.environ["GITHUB_TOKEN"]` from SSM values so `generator.py` and `gist_publisher.py` work unchanged

**`deploy.sh`:**
- Replace `--parameter-overrides AnthropicApiKey=... GithubToken=...` with two `aws ssm put-parameter` calls that write secrets to SSM *before* CloudFormation deploy
- Remove those two parameters from the `--parameter-overrides` line
- SSM parameter names: `/${STACK_NAME}/anthropic-api-key` and `/${STACK_NAME}/github-token`

---

### Fix #3 — Restrict CORS to frontend origin (Issue #3)

**Problem:** CORS allows `*` — any website can call the API.

**Changes:**

**`aws/nowigetit.yaml`:**
- Change `AllowOrigins: ['*']` to `AllowOrigins: [!GetAtt FrontendBucket.WebsiteURL]`
- Add `ALLOWED_ORIGIN` env var to UploadFunction and StatusFunction, set to `!GetAtt FrontendBucket.WebsiteURL`

**`backend/lambda_upload.py`:**
- Read `ALLOWED_ORIGIN` from env
- Set `Access-Control-Allow-Origin` header to that value instead of `*`

**`backend/lambda_status.py`:**
- Same change: read `ALLOWED_ORIGIN` from env, use it in CORS header

---

### Fix #4 — Add API Gateway throttling (Issue #4)

**Problem:** No rate limiting on upload endpoint — anyone can run up the Anthropic bill.

**Changes:**

**`aws/nowigetit.yaml`:**
- Add `DefaultRouteSettings` to `ApiStage` with `ThrottlingBurstLimit: 5` and `ThrottlingRateLimit: 2`

---

## HIGH Fixes

### Fix #5 — Increase Lambda process timeout (Issue #5)

**Problem:** 120s timeout may be too low for Claude Opus calls; timeout kills Lambda without cleanup.

**Changes:**

**`aws/nowigetit.yaml`:**
- Change ProcessFunction `Timeout: 120` → `Timeout: 300`

---

### Fix #6 — Set DynamoDB TTL on job records (Issue #6)

**Problem:** TTL is enabled on the table but never set on records — jobs accumulate forever.

**Changes:**

**`backend/lambda_upload.py`:**
- Add `import time` at top
- Add `"ttl": int(time.time()) + 86400` (24 hours) to the `put_item` call

---

### Fix #7 — Fix blocking async handler in main.py (Issue #7)

**Problem:** `upload_pdf` is `async` but calls synchronous `generate_html()` and `create_gist()`, blocking the event loop for ~60s.

**Changes:**

**`backend/main.py`:**
- Remove `async` from `upload_pdf` function signature (FastAPI will auto-run it in a threadpool)
- Change `contents = await file.read()` to `contents = file.file.read()` (sync read)

---

### Fix #8 — Harden multipart parser (Issue #8)

**Problem:** Filename extracted via naive string split — path traversal chars accepted, no content-type check upfront.

**Changes:**

**`backend/lambda_upload.py`:**
- Add `import os` (already imported) — use `os.path.basename()` to sanitize filename in `_parse_multipart`
- Add a check at the top of `handler` that `content_type` contains `multipart/form-data` before calling `_parse_multipart`

---

### Fix #9 — Make S3 cleanup resilient (Issue #9)

**Problem:** If `s3.delete_object()` throws in the `finally` block, it masks the real error. If Lambda times out, cleanup never runs.

**Changes:**

**`backend/lambda_process.py`:**
- Wrap `s3.delete_object()` in `finally` with its own `try/except` that logs but doesn't re-raise

**`backend/main.py`:**
- Same: wrap `s3.delete_object()` in `finally` with its own `try/except`

**`aws/nowigetit.yaml`:**
- Add S3 lifecycle rule comment in the template noting that the ShareIt bucket should have a lifecycle rule on `nowigetit/` prefix (this is an existing external bucket, so we document it rather than create it)

---

### Fix #10 — Stop exposing internal error details (Issue #10)

**Problem:** Raw exception messages (potentially containing ARNs, paths, stack traces) returned to clients.

**Changes:**

**`backend/lambda_upload.py`:**
- In the `except` block: `print(f"Upload error: {e}")` for CloudWatch, return `{"detail": "Upload failed. Please try again."}` to client

**`backend/lambda_process.py`:**
- In the `except` block: `print(f"Processing error for {job_id}: {e}")` for CloudWatch, write generic `"Processing failed."` to DynamoDB error field instead of `str(e)`

**`backend/main.py`:**
- In the `except` block: `print(f"Error processing upload: {e}")`, store `"Processing failed."` in jobs dict instead of `str(e)`
