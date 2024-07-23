import json
import boto3
import os

s3 = boto3.client("s3")

CONFIG_FILE = "./config.json"

def get_target_key(key: str):
    """jsonファイルから取得したtarget_prefixを返す"""
    import datetime

    with open(CONFIG_FILE) as f:
        config = json.load(f)
        target_prefix = config["target_prefix"][key]
        today = datetime.datetime.now().strftime("%Y/%m/%d")

    return f"{target_prefix}/{today}"


def handler(event, context):
    # 環境変数からバケット名を取得
    source_bucket = os.environ["SOURCE_BUCKET"]
    target_bucket = os.environ["TARGET_BUCKET"]

    # イベントからS3オブジェクト情報を取得
    source_key = event["Records"][0]["s3"]["object"]["key"]
    key = source_key.split("/")[-1].split(".")[0]

    try:
        copy_source = {"Bucket": source_bucket, "Key": source_key}
        target_key = f"{get_target_key(key)}/{source_key.split('/')[-1]}"
        s3.copy_object(CopySource=copy_source, Bucket=target_bucket, Key=target_key)
        print(f"Successfully copied {source_key} from {source_bucket} to {target_bucket}/{target_key}")
        return {"statusCode": 200, "body": json.dumps(f"Successfully copied {source_key}")}
    except Exception as e:
        print(e)
        print(f"Error copying {source_key} from {source_bucket} to {target_bucket}")
        return {"statusCode": 500, "body": json.dumps(f"Error copying {source_key}")}
