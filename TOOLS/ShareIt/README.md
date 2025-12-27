# ShareIt

A lightweight service for sharing web page content as static HTML files hosted on S3.

## Features

- Capture any web page as a static HTML file with all CSS inlined
- Secure presigned URL uploads (no credentials exposed to clients)
- Automatic filename collision handling
- Self-contained client library (~15KB, no dependencies)
- React component included
- CloudFormation infrastructure as code

## Prerequisites

Before you begin, ensure you have:

- **AWS Account** with permissions to create S3 buckets, Lambda functions, and IAM roles
- **AWS CLI v2** installed and configured (`aws configure`)
- **Your public IP address** (for localhost development) - find it at https://checkip.amazonaws.com
- **Python 3.9+** (for running Lambda tests)
- **Node.js 18+** (for running client tests)

## Deployment

### Step 1: Deploy the CloudFormation Stack

The stack creates the S3 bucket, Lambda function, and all required IAM permissions.

```bash
aws cloudformation deploy \
  --template-file aws/shareit.yaml \
  --stack-name shareit \
  --region <your-region> \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameter-overrides \
    BucketName=<your-bucket-name> \
    LambdaFunctionName=<your-lambda-name> \
    LambdaRoleName=<your-role-name> \
    AllowedOrigins=https://your-production-domain.com \
    AllowedIPs=$(curl -s https://checkip.amazonaws.com)
```

**Parameter notes:**
- `BucketName`: Must be globally unique across all AWS accounts (e.g., `mycompany-shareit-pages`)
- `AllowedOrigins`: Your production domain(s), comma-separated if multiple
- `AllowedIPs`: Your IP address for localhost testing (the curl command auto-detects it)

### Step 2: Add Production Origins to Lambda CORS (if needed)

If you're deploying for production (not just localhost testing), edit `aws/shareit.yaml` and add your domain(s) to the `AllowOrigins` list in the `ShareItLambdaUrl` resource (around line 188):

```yaml
AllowOrigins:
  - https://your-domain.com      # Add your production domain here
  - http://localhost:3000        # Keep these for local development
  - http://localhost:5173
  # ... other localhost ports
```

Then update the stack:

```bash
aws cloudformation deploy \
  --template-file aws/shareit.yaml \
  --stack-name shareit \
  --region <your-region> \
  --capabilities CAPABILITY_NAMED_IAM
```

### Step 3: Deploy the Client Library

This script injects the Lambda URL into `share.js` and uploads it to your S3 bucket:

```bash
./aws/scripts/deploy-sharejs.sh <bucket-name> <lambda-name> <region> [aws-profile]
```

Examples:
```bash
# Using default AWS credentials
./aws/scripts/deploy-sharejs.sh mycompany-shareit-pages my-shareit-lambda us-east-1

# Using a specific AWS profile
./aws/scripts/deploy-sharejs.sh mycompany-shareit-pages my-shareit-lambda us-east-1 my-profile
```

### Step 4: Verify Deployment

1. **Check the S3 bucket exists:**
   ```bash
   aws s3 ls s3://<your-bucket-name>/ --region <your-region>
   ```
   You should see `share.js` listed.

2. **Update the test page with your S3 URL:**

   Edit `test-page.html` and replace the placeholder in the script tag:
   ```html
   <script src="https://<your-bucket>.s3.<your-region>.amazonaws.com/share.js"></script>
   ```

3. **Test with the included test page:**
   ```bash
   python3 -m http.server 3000
   ```
   Open http://localhost:3000/test-page.html and click "Share This Page".

## Integration

Once deployed, add ShareIt to any web page:

```html
<script src="https://<your-bucket>.s3.<your-region>.amazonaws.com/share.js"></script>
<button onclick="ShareIt.share()">Share</button>
```

### React Integration

1. Add the script to your `public/index.html`:
   ```html
   <script src="https://<your-bucket>.s3.<your-region>.amazonaws.com/share.js"></script>
   ```

2. Copy the component to your project:
   ```bash
   cp react-components/ShareButton.tsx src/
   ```

3. Import and use:
   ```jsx
   import ShareButton from './ShareButton';

   function App() {
     return (
       <div>
         <h1>My App</h1>
         <ShareButton />
       </div>
     );
   }
   ```

## Configuration Reference

### CloudFormation Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `BucketName` | Yes | Name for the S3 bucket (must be globally unique) |
| `LambdaFunctionName` | Yes | Name for the Lambda function |
| `LambdaRoleName` | Yes | Name for the Lambda IAM role |
| `AllowedOrigins` | Yes | Comma-separated list of allowed production origins |
| `AllowedIPs` | Yes | Comma-separated IPs allowed to use localhost origins |
| `PresignExpiry` | No | Presigned URL TTL in seconds (default: 20) |

### Lambda URL CORS

CloudFormation doesn't support dynamic CORS origin lists, so production origins must be added directly to `aws/shareit.yaml`. The Lambda function validates origins at runtime using the `AllowedOrigins` parameter, but the Lambda URL also needs CORS configured to allow the browser preflight request.

## How It Works

1. User clicks Share button
2. Client prompts for filename
3. Page content is captured with all CSS styles inlined
4. Lambda validates origin and generates a presigned S3 upload URL
5. Client uploads HTML directly to S3
6. Public URL is displayed and copied to clipboard

## Architecture

| Component | Description |
|-----------|-------------|
| **share.js** | Client library (~15KB). Captures DOM, inlines CSS, handles upload flow. |
| **Lambda** | Validates origin/IP, checks filename collisions, generates presigned URLs. |
| **S3** | Stores shared HTML files with static website hosting enabled. |

## Local Development

ShareIt only works when pages are served via HTTP (not `file://`). Use a local server:

```bash
python3 -m http.server 3000
# Open http://localhost:3000/test-page.html
```

### Helper Scripts

```bash
# Add an allowed origin (updates both Lambda URL CORS and environment variable)
./aws/scripts/add-allowed-origin.sh <lambda-name> <region> <origin> [aws-profile]

# Update your IP for localhost testing (run when your IP changes)
./aws/scripts/update-shareit-ip.sh <lambda-name> <region>

# Deploy changes to share.js (optional: add aws-profile as 4th arg)
./aws/scripts/deploy-sharejs.sh <bucket-name> <lambda-name> <region> [aws-profile]

# Update S3 CORS configuration
./aws/scripts/update-s3-cors.sh <bucket-name> <region>
```

#### Adding Allowed Origins

To allow a new origin (e.g., a new localhost port or production domain) without redeploying CloudFormation:

```bash
./aws/scripts/add-allowed-origin.sh my-shareit-lambda us-east-1 http://localhost:5173

# With AWS profile
./aws/scripts/add-allowed-origin.sh my-shareit-lambda us-east-1 https://myapp.com my-aws-profile
```

This script updates both:
- Lambda Function URL CORS configuration (for preflight requests)
- `ALLOWED_ORIGINS` environment variable (for runtime validation)

## Testing

### Lambda Tests

```bash
cd aws/lambda
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt boto3
pytest test_handler.py -v
```

### Client Tests

```bash
npm install
npm test
```

## GitHub Actions CI/CD (Optional)

If you fork this repository, you can enable automated testing on every push and pull request. The included GitHub Actions workflow runs:
- Lambda unit tests (Python/pytest)
- Client unit tests (JavaScript/Jest)
- CloudFormation template validation
- Python and JavaScript linting

The OIDC role allows GitHub Actions to authenticate with AWS **without storing long-lived credentials** as secrets. Instead, GitHub's OIDC provider generates short-lived tokens that AWS trusts, following security best practices.

### 1. Deploy the OIDC Role

```bash
aws cloudformation deploy \
  --template-file ../.github/github-oidc-role.yaml \
  --stack-name github-oidc-shareit \
  --region <your-region> \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameter-overrides \
    GitHubOrg=<your-github-org> \
    GitHubRepo=<your-repo-name> \
    RoleName=<role-name> \
    BucketName=<your-bucket> \
    LambdaFunctionName=<your-lambda> \
    AWSRegion=<your-region>
```

### 2. Set GitHub Repository Variables

Go to your repository Settings > Secrets and variables > Actions > Variables:

| Variable | Description |
|----------|-------------|
| `AWS_ACCOUNT_ID` | Your AWS account ID |
| `AWS_REGION` | Target AWS region (e.g., us-east-1) |
| `GITHUB_ACTIONS_ROLE_NAME` | Name of the OIDC role from step 1 |

## Troubleshooting

### "CORS error" in browser console
- Run `./aws/scripts/add-allowed-origin.sh <lambda-name> <region> <origin>` to add your origin
- Alternatively, add your origin to `AllowOrigins` in `aws/shareit.yaml` and redeploy the stack
- For localhost, also ensure your IP is in `AllowedIPs`

### "Forbidden" or "INVALID_ORIGIN" error
- Check that `AllowedOrigins` parameter includes your domain
- For localhost, run `./aws/scripts/update-shareit-ip.sh` to update your IP

### share.js returns 404
- Run the deploy script: `./aws/scripts/deploy-sharejs.sh <bucket> <lambda> <region>`

## License

MIT
