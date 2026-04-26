resource "aws_s3_bucket" "reports_bucket" {
  bucket = "geo-sentinel-web-reports-${data.aws_caller_identity.current.account_id}"

  tags = merge(local.common_tags, {
    Name  = "geo-sentinel-web-reports"
    Role  = "reports-and-snapshots"
    Story = "GEO-48"
  })
}

resource "aws_s3_bucket_ownership_controls" "reports_bucket_ownership" {
  bucket = aws_s3_bucket.reports_bucket.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_public_access_block" "reports_bucket_public_access" {
  bucket = aws_s3_bucket.reports_bucket.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "reports_bucket_encryption" {
  bucket = aws_s3_bucket.reports_bucket.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "reports_bucket_lifecycle" {
  bucket = aws_s3_bucket.reports_bucket.id

  rule {
    id     = "expire-intelligence-snapshots"
    status = "Enabled"

    filter {
      prefix = "snapshots/"
    }

    expiration {
      days = 30
    }
  }
}