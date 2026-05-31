import boto3
from botocore.config import Config
from app.config import settings


def _client():
    return boto3.client(
        "s3",
        endpoint_url=settings.R2_ENDPOINT,
        aws_access_key_id=settings.R2_ACCESS_KEY,
        aws_secret_access_key=settings.R2_SECRET_KEY,
        config=Config(signature_version="s3v4"),
        region_name="auto",
    )


def upload_file(file_bytes: bytes, r2_key: str, mime_type: str) -> None:
    _client().put_object(
        Bucket=settings.R2_BUCKET,
        Key=r2_key,
        Body=file_bytes,
        ContentType=mime_type,
    )


def generate_presigned_url(r2_key: str, expires_in: int = 3600) -> str:
    return _client().generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.R2_BUCKET, "Key": r2_key},
        ExpiresIn=expires_in,
    )


def delete_file(r2_key: str) -> None:
    _client().delete_object(Bucket=settings.R2_BUCKET, Key=r2_key)
