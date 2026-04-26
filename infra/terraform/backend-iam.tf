resource "aws_iam_role" "backend_ec2_role" {
  name = "GeoSentinelBackendEc2Role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = merge(local.common_tags, {
    Role  = "backend-api"
    Story = "GEO-48"
  })
}

resource "aws_iam_policy" "backend_dynamodb_cache_policy" {
  name        = "GeoSentinelBackendDynamoDBCachePolicy"
  description = "Allow Geo-Sentinel backend EC2 to read and write cache metadata in DynamoDB"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = aws_dynamodb_table.geo_sentinel_cache.arn
      }
    ]
  })

  tags = merge(local.common_tags, {
    Role  = "backend-api"
    Story = "GEO-48"
  })
}

resource "aws_iam_policy" "backend_s3_reports_policy" {
  name        = "GeoSentinelBackendS3ReportsPolicy"
  description = "Allow Geo-Sentinel backend EC2 to write and read report snapshots in S3"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:ListBucket"
        ]
        Resource = aws_s3_bucket.reports_bucket.arn
        Condition = {
          StringLike = {
            "s3:prefix" = [
              "snapshots/*",
              "reports/*"
            ]
          }
        }
      },
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject"
        ]
        Resource = [
          "${aws_s3_bucket.reports_bucket.arn}/snapshots/*",
          "${aws_s3_bucket.reports_bucket.arn}/reports/*"
        ]
      }
    ]
  })

  tags = merge(local.common_tags, {
    Role  = "backend-api"
    Story = "GEO-48"
  })
}

resource "aws_iam_role_policy_attachment" "backend_dynamodb_cache_attach" {
  role       = aws_iam_role.backend_ec2_role.name
  policy_arn = aws_iam_policy.backend_dynamodb_cache_policy.arn
}

resource "aws_iam_role_policy_attachment" "backend_s3_reports_attach" {
  role       = aws_iam_role.backend_ec2_role.name
  policy_arn = aws_iam_policy.backend_s3_reports_policy.arn
}

resource "aws_iam_instance_profile" "backend_instance_profile" {
  name = "GeoSentinelBackendInstanceProfile"
  role = aws_iam_role.backend_ec2_role.name

  tags = merge(local.common_tags, {
    Role  = "backend-api"
    Story = "GEO-48"
  })
}