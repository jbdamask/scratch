# Googlish - AWS Deployment

A Node.js search proxy application deployed on AWS App Runner with custom domain support.

## Architecture

- **AWS App Runner**: Containerized application hosting
- **Amazon ECR**: Container image registry  
- **AWS Secrets Manager**: Secure API key storage
- **Route 53**: DNS management for googli.sh domain
- **AWS Certificate Manager**: SSL certificate for HTTPS

## Prerequisites

1. **AWS CLI configured** with appropriate permissions
2. **Docker** installed and running
3. **Node.js** and npm installed
4. **AWS CDK** knowledge (optional for modifications)

## Required AWS Permissions

Your AWS user/role needs permissions for:
- ECR (create repositories, push images)
- App Runner (create services, manage deployments)
- Secrets Manager (create/update secrets)
- Route 53 (manage DNS records)
- Certificate Manager (create certificates)
- IAM (create roles for App Runner)
- CloudFormation (deploy CDK stacks)

## Quick Deploy

1. **Clone and navigate to the project:**
   ```bash
   cd googlish
   ```

2. **Deploy infrastructure only (first time):**
   ```bash
   ./deploy.sh infrastructure-only
   ```

3. **Add your API keys to AWS Secrets Manager:**
   ```bash
   # Replace XXXXX with the actual secret suffix from AWS console
   aws secretsmanager update-secret \
     --secret-id "arn:aws:secretsmanager:us-east-1:ACCOUNT:secret:googlish-api-keys-XXXXX" \
     --secret-string '{"BRAVE_SEARCH_API_KEY":"your-brave-key","OPENAI_API_KEY":"your-openai-key"}'
   ```

4. **Deploy the application:**
   ```bash
   ./deploy.sh
   ```

5. **Access your app at:** https://googli.sh

## Manual Deployment Steps

### 1. Deploy Infrastructure

```bash
cd infrastructure
npm install
npm run build
npx cdk bootstrap
npx cdk deploy
```

### 2. Build and Push Container

```bash
# Get ECR URI from CDK outputs
ECR_URI=$(aws ecr describe-repositories --repository-names googlish-repo --query 'repositories[0].repositoryUri' --output text)

# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin $ECR_URI

# Build and push
docker build -t googlish .
docker tag googlish:latest $ECR_URI:latest
docker push $ECR_URI:latest
```

### 3. Update Secrets

Add your API keys to the `googlish-api-keys` secret in AWS Secrets Manager:

```json
{
  "BRAVE_SEARCH_API_KEY": "your-brave-search-api-key",
  "OPENAI_API_KEY": "your-openai-api-key"
}
```

## Environment Variables

The application uses the following environment variables from Secrets Manager:

- `BRAVE_SEARCH_API_KEY`: API key for Brave Search
- `OPENAI_API_KEY`: OpenAI API key
- `PORT`: Application port (defaults to 3000)

## Resource Tagging

All AWS resources are tagged with:
- `Application: googlish`
- `Environment: production`

## Monitoring and Troubleshooting

### Check App Runner Service Status
```bash
aws apprunner list-services --region us-east-1
aws apprunner describe-service --service-arn <service-arn>
```

### View Application Logs
```bash
aws logs describe-log-groups --log-group-name-prefix '/aws/apprunner/googlish-service'
aws logs tail /aws/apprunner/googlish-service/application --follow
```

### Check Domain Configuration
```bash
aws apprunner list-domain-associations --service-arn <service-arn>
```

## Cost Optimization

- App Runner charges based on active request time and provisioned memory
- ECR storage charges apply for container images
- Secrets Manager has monthly charges per secret
- Route 53 hosted zone has monthly charges

## Cleanup

To remove all resources:

```bash
cd infrastructure
npx cdk destroy
```

Note: You may need to manually delete the ECR repository if it contains images.

## Development

For local development:

1. Set environment variables:
   ```bash
   export BRAVE_SEARCH_API_KEY="your-key"
   export OPENAI_API_KEY="your-key"
   ```

2. Run locally:
   ```bash
   npm start
   ```

3. Access at: http://localhost:3000/googlish.html

## File Structure

```
googlish/
├── server.js              # Node.js Express server
├── googlish.html          # Frontend HTML
├── package.json           # Node.js dependencies
├── Dockerfile            # Container configuration
├── deploy.sh             # Deployment script
├── infrastructure/       # AWS CDK infrastructure code
│   ├── lib/
│   │   └── infrastructure-stack.ts
│   └── package.json
└── README.md            # This file
```