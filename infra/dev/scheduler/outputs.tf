output "lambda_start_arn" {
  description = "ARN da Lambda de start"
  value       = aws_lambda_function.start.arn
}

output "lambda_stop_arn" {
  description = "ARN da Lambda de stop"
  value       = aws_lambda_function.stop.arn
}
