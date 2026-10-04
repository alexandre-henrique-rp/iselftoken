output "instance_id" {
  description = "ID da instância EC2 Frontend"
  value       = aws_instance.frontend.id
}

output "elastic_ip" {
  description = "Elastic IP da EC2 Frontend"
  value       = aws_eip.frontend.public_ip
}

output "private_ip" {
  description = "IP privado da EC2 Frontend"
  value       = aws_instance.frontend.private_ip
}
