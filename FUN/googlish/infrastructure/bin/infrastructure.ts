#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { InfrastructureStack } from '../lib/infrastructure-stack';

const app = new cdk.App();
new InfrastructureStack(app, 'GooglishInfrastructureStack', {
  description: 'Infrastructure for Googlish search application - ECR repository and Secrets Manager',
  env: { 
    account: '277707111475', 
    region: 'us-east-1' 
  }
});