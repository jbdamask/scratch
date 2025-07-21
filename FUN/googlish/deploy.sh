#!/bin/bash

# Googlish AWS Deployment Script
set -e

echo "🚀 Starting Googlish deployment to AWS..."

# Variables
REGION=${AWS_REGION:-us-east-1}
APP_NAME="googlish"
ECR_REPO_NAME="${APP_NAME}-repo"
AWS_PROFILE="AdministratorAccess-277707111475"

# Function to check if AWS CLI is configured
check_aws_config() {
    if ! aws sts get-caller-identity --profile ${AWS_PROFILE} > /dev/null 2>&1; then
        echo "❌ AWS CLI profile '${AWS_PROFILE}' not configured or accessible."
        echo "Please ensure the profile exists and has proper credentials."
        exit 1
    fi
    echo "✅ AWS CLI configured with profile: ${AWS_PROFILE}"
}

# Function to deploy CDK infrastructure
deploy_infrastructure() {
    echo "📦 Deploying CDK infrastructure..."
    cd infrastructure
    npm run build
    npx cdk bootstrap --profile ${AWS_PROFILE}
    npx cdk deploy --require-approval never --profile ${AWS_PROFILE}
    cd ..
    echo "✅ Infrastructure deployed"
}

# Function to get ECR repository URI
get_ecr_uri() {
    ECR_URI=$(aws ecr describe-repositories --repository-names ${ECR_REPO_NAME} --region ${REGION} --profile ${AWS_PROFILE} --query 'repositories[0].repositoryUri' --output text 2>/dev/null || echo "")
    if [[ -z "$ECR_URI" ]]; then
        echo "❌ ECR repository not found. Deploy infrastructure first."
        exit 1
    fi
    echo "✅ ECR URI: $ECR_URI"
}

# Function to build and push Docker image
build_and_push_image() {
    echo "🐳 Building and pushing Docker image..."
    
    # Login to ECR
    aws ecr get-login-password --region ${REGION} --profile ${AWS_PROFILE} | docker login --username AWS --password-stdin ${ECR_URI%/*}
    
    # Build image for AMD64 architecture (required for AWS Fargate/App Runner)
    docker buildx build --platform linux/amd64 -t ${APP_NAME} .
    docker tag ${APP_NAME}:latest ${ECR_URI}:latest
    
    # Push image
    docker push ${ECR_URI}:latest
    
    echo "✅ Docker image pushed to ECR"
}

# Function to update secrets
update_secrets() {
    echo "🔐 Checking secrets in AWS Secrets Manager..."
    
    SECRET_ARN=$(aws secretsmanager list-secrets --query "SecretList[?Name=='${APP_NAME}-api-keys'].ARN" --output text --region ${REGION} --profile ${AWS_PROFILE})
    
    if [[ -z "$SECRET_ARN" ]]; then
        echo "❌ Secrets Manager secret not found. Deploy infrastructure first."
        exit 1
    fi
    
    echo "📝 Please update the secrets manually:"
    echo "   1. Go to AWS Secrets Manager console"
    echo "   2. Find secret: ${APP_NAME}-api-keys"
    echo "   3. Add your BRAVE_SEARCH_API_KEY and OPENAI_API_KEY"
    echo "   4. Or use AWS CLI:"
    echo "      aws secretsmanager update-secret --profile ${AWS_PROFILE} --secret-id '${SECRET_ARN}' --secret-string '{\"BRAVE_SEARCH_API_KEY\":\"your-key-here\",\"OPENAI_API_KEY\":\"your-key-here\"}'"
}

# Main deployment flow
main() {
    echo "🎯 Deploying ${APP_NAME} to AWS App Runner"
    echo "================================"
    
    check_aws_config
    
    if [[ "$1" == "infrastructure-only" ]]; then
        deploy_infrastructure
        update_secrets
        echo "🎉 Infrastructure deployment complete!"
        echo "Next steps:"
        echo "1. Update secrets in AWS Secrets Manager"
        echo "2. Run './deploy.sh' to build and deploy the application"
        exit 0
    fi
    
    # Check if infrastructure exists
    if ! aws cloudformation describe-stacks --stack-name GooglishInfrastructureStack --region ${REGION} --profile ${AWS_PROFILE} > /dev/null 2>&1; then
        echo "📦 Infrastructure not found. Deploying infrastructure first..."
        deploy_infrastructure
        update_secrets
        echo ""
        echo "⚠️  Infrastructure deployed! Please update your API keys in Secrets Manager before proceeding."
        echo "Run the following command to update secrets:"
        echo "aws secretsmanager update-secret --secret-id 'arn:aws:secretsmanager:${REGION}:ACCOUNT:secret:${APP_NAME}-api-keys-XXXXX' --secret-string '{\"BRAVE_SEARCH_API_KEY\":\"your-brave-key\",\"OPENAI_API_KEY\":\"your-openai-key\"}'"
        echo ""
        echo "Then run './deploy.sh' again to build and push the application."
        exit 0
    fi
    
    get_ecr_uri
    build_and_push_image
    
    echo ""
    echo "🎉 Deployment complete!"
    echo "📱 Your application will be available at: https://googli.sh"
    echo "⏳ App Runner deployment may take a few minutes to complete."
    echo ""
    echo "💡 To check deployment status:"
    echo "   aws apprunner list-services --region ${REGION} --profile ${AWS_PROFILE}"
    echo ""
    echo "🔧 To view logs:"
    echo "   aws logs describe-log-groups --log-group-name-prefix '/aws/apprunner/${APP_NAME}-service' --region ${REGION} --profile ${AWS_PROFILE}"
}

# Run main function with all arguments
main "$@"