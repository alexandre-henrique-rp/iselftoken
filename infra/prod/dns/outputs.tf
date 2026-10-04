output "root_fqdn" {
  description = "FQDN do domínio raiz"
  value       = aws_route53_record.root.fqdn
}

output "www_fqdn" {
  description = "FQDN do www"
  value       = aws_route53_record.www.fqdn
}

output "api_fqdn" {
  description = "FQDN da API"
  value       = aws_route53_record.api.fqdn
}
