output "bucket_name" {
  description = "Nome do bucket S3"
  value       = aws_s3_bucket.uploads.bucket
}

output "bucket_arn" {
  description = "ARN do bucket S3"
  value       = aws_s3_bucket.uploads.arn
}

output "bucket_regional_domain" {
  description = "Domain regional do bucket"
  value       = aws_s3_bucket.uploads.bucket_regional_domain_name
}

output "s3_access_policy_arn" {
  description = "ARN da policy IAM para acesso ao S3"
  value       = aws_iam_policy.s3_access.arn
}
