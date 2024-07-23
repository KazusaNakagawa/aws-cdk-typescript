#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CdkProjectStack } from '../lib/cdk-project-stack';

const app = new cdk.App();

// Get the context parameter for environment
const env = app.node.tryGetContext('env');

const _ = new CdkProjectStack(
  app,
  `cdk-typescript-stack-${env}`,
  { 
    env: {
     account: process.env.CDK_DEFAULT_ACCOUNT,
     region: process.env.CDK_DEFAULT_REGION 
    } 
  });

app.synth();
