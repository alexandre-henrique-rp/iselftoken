output "frontend_fqdn" {
  description = "FQDN do frontend"
  value       = aws_route53_record.frontend.fqdn
}

output "api_fqdn" {
  description = "FQDN da API"
  value       = aws_route53_record.api.fqdn
}
