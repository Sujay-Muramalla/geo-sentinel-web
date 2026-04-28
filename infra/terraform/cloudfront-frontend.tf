resource "aws_cloudfront_origin_access_identity" "frontend_oai" {
  comment = "OAI for Geo-Sentinel frontend S3 bucket"
}

resource "aws_cloudfront_distribution" "frontend_cdn" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "Geo-Sentinel Frontend CDN"
  default_root_object = "index.html"

  wait_for_deployment = false

  # 🔥 GEO-50B: Custom domain alias
  aliases = [var.custom_domain]

  origin {
    domain_name = aws_s3_bucket.frontend_bucket.bucket_regional_domain_name
    origin_id   = "s3-frontend-origin"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.frontend_oai.cloudfront_access_identity_path
    }
  }

  default_cache_behavior {
    target_origin_id       = "s3-frontend-origin"
    viewer_protocol_policy = "redirect-to-https"

    allowed_methods = ["GET", "HEAD"]
    cached_methods  = ["GET", "HEAD"]

    forwarded_values {
      query_string = false

      cookies {
        forward = "none"
      }
    }

    compress = true
  }

  # SPA routing support (React)
  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"
  }

  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

  price_class = "PriceClass_100"

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  # 🔥 GEO-50B: Replace default cert with ACM cert
  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate_validation.cloudfront_cert_validation.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  tags = {
    Name = "geo-sentinel-frontend-cdn"
  }
}
