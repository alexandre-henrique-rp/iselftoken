# =============================================================================
# S3 Module — Bucket para uploads (documentos KYC, termos, etc.) — PROD
# =============================================================================

resource "aws_s3_bucket" "uploads" {
  bucket = var.bucket_name

  tags = merge(var.common_tags, {
    Name = "${var.project}-${var.environment}-uploads"
  })
}

# Bloqueia acesso público (exceto policies explícitas com condição de IP)
resource "aws_s3_bucket_public_access_block" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  block_public_acls       = true
  block_public_policy     = false
  ignore_public_acls      = true
  restrict_public_buckets = false
}

# Versionamento habilitado (proteção contra deleção acidental)
resource "aws_s3_bucket_versioning" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Criptografia server-side (SSE-S3)
resource "aws_s3_bucket_server_side_encryption_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# CORS para presigned URLs
resource "aws_s3_bucket_cors_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST"]
    allowed_origins = [
      "https://iselftoken.com",
      "https://www.iselftoken.com",
      "https://api.iselftoken.com",
      "http://localhost:5173",
      "http://localhost:7077"
    ]
    expose_headers  = ["ETag"]
    max_age_seconds = 3600
  }
}

# Bucket Policy — permite acesso do IP do desenvolvedor (para debug/upload manual)
resource "aws_s3_bucket_policy" "dev_access" {
  count  = var.dev_ip != "" ? 1 : 0
  bucket = aws_s3_bucket.uploads.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowDevIPAccess"
        Effect    = "Allow"
        Principal = "*"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:ListBucket",
          "s3:DeleteObject"
        ]
        Resource = [
          aws_s3_bucket.uploads.arn,
          "${aws_s3_bucket.uploads.arn}/*"
        ]
        Condition = {
          IpAddress = {
            "aws:SourceIp" = var.dev_ip
          }
        }
      }
    ]
  })

  depends_on = [aws_s3_bucket_public_access_block.uploads]
}

# Lifecycle rule — mover para Glacier após 90 dias (economia em storage)
resource "aws_s3_bucket_lifecycle_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  rule {
    id     = "archive-old-documents"
    status = "Enabled"

    filter {}

    transition {
      days          = 90
      storage_class = "GLACIER_IR"
    }

    noncurrent_version_transition {
      noncurrent_days = 30
      storage_class   = "GLACIER_IR"
    }

    noncurrent_version_expiration {
      noncurrent_days = 365
    }
  }
}

# IAM Policy para acesso da EC2 API
resource "aws_iam_policy" "s3_access" {
  name        = "${var.project}-${var.environment}-s3-access"
  description = "Permite acesso ao bucket de uploads"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.uploads.arn,
          "${aws_s3_bucket.uploads.arn}/*"
        ]
      }
    ]
  })

  tags = var.common_tags
}
