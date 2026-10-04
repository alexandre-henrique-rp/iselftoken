output "alb_arn" {
  description = "ARN do ALB"
  value       = aws_lb.main.arn
}

output "alb_dns_name" {
  description = "DNS name do ALB"
  value       = aws_lb.main.dns_name
}

output "alb_zone_id" {
  description = "Zone ID do ALB (para Route 53 alias)"
  value       = aws_lb.main.zone_id
}
