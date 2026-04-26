resource "aws_dynamodb_table" "geo_sentinel_cache" {
  name         = "geo-sentinel-cache"
  billing_mode = "PAY_PER_REQUEST"

  hash_key = "queryHash"

  attribute {
    name = "queryHash"
    type = "S"
  }

  attribute {
    name = "createdAt"
    type = "N"
  }

  ttl {
    attribute_name = "expiresAt"
    enabled        = true
  }

  tags = {
    Project = "geo-sentinel"
    Env     = "dev"
  }
}