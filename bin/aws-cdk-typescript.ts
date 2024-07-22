#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { AwsCdkTypescriptStack } from '../lib/aws-cdk-typescript-stack';

const app = new cdk.App();
new AwsCdkTypescriptStack(app, 'AwsCdkTypescriptStack');
