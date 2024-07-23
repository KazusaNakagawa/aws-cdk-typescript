import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as dotenv from 'dotenv'
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3_notifications from 'aws-cdk-lib/aws-s3-notifications';
import * as iam from 'aws-cdk-lib/aws-iam';
import { LAMBDA_NAMES } from './config';

dotenv.config()
const sourceBucketName: string | undefined = process.env.SOURCE_BUCKET_NAME;
const targetBucketName: string | undefined = process.env.TARGET_BUCKET_NAME;

export class CdkProjectStack extends cdk.Stack {
    private sourceBucket: s3.IBucket;
    private customRole: iam.Role;
    private env: string;

    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        this.env = this.node.tryGetContext('env');

        // 既存のS3バケットを参照
        this.sourceBucket = s3.Bucket.fromBucketName(this, 'ExistingSourceBucket', sourceBucketName!);
        // カスタムIAMロールを生成
        this.generateCustomRole();
        // Lambda関数を生成
        LAMBDA_NAMES.forEach(name => this.generateLambda(name));
    }

    private generateCustomRole() {
        // IAMロールを定義し、カスタムポリシーをアタッチ
        this.customRole = new iam.Role(this, 'CustomRole', {
            assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
        });

        const policyStatements = [
            new iam.PolicyStatement({
                actions: [
                    's3:GetObject',
                    's3:ListBucket',
                    's3:GetBucketNotificationConfiguration',
                    's3:PutBucketNotificationConfiguration',
                    's3:PutObject',
                ],
                effect: iam.Effect.ALLOW,
                resources: ['arn:aws:s3:::*'],
            }),
            new iam.PolicyStatement({
                actions: [
                    'logs:CreateLogGroup',
                    'logs:CreateLogStream',
                    'logs:PutLogEvents',
                ],
                effect: iam.Effect.ALLOW,
                resources: [`arn:aws:logs:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:log-group:/aws/lambda/*`],
            }),
        ];

        const customPolicy = new iam.Policy(this, 'CustomPolicy', { statements: policyStatements });
        customPolicy.attachToRole(this.customRole);
    }

    private generateLambda(name: string) {
        const defaultLambda = new DefaultLambda(this, `${name}Lambda`, {
            role: this.customRole,
            functionName: `${name}Handler-${this.env}`,
            runtime: lambda.Runtime.PYTHON_3_12,
            code: lambda.Code.fromAsset('handler'),
            handler: 's3copy.handler',
        });
        defaultLambda.addEnvironment('ENV', this.env);

        // LambdaトリガーにS3バケットを設定
        this.sourceBucket.addEventNotification(
            s3.EventType.OBJECT_CREATED,
            new s3_notifications.LambdaDestination(defaultLambda),
            { prefix: `input/${this.env}/${name}/`, suffix: '.json' }
        );
    }
}

class DefaultLambda extends lambda.Function {
    constructor(scope: Construct, id: string, props: lambda.FunctionProps) {
        super(scope, id, {
            environment: {
                SOURCE_BUCKET: sourceBucketName!,
                TARGET_BUCKET: targetBucketName!,
            },
            ...props,
        });
    }
}
