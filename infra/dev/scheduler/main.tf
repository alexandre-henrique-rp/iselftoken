# =============================================================================
# Scheduler Module — EventBridge + Lambda (Start/Stop EC2s e RDS)
# =============================================================================

# --- IAM Role para Lambda ---

resource "aws_iam_role" "scheduler" {
  name = "${var.project}-${var.environment}-scheduler-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = var.common_tags
}

resource "aws_iam_role_policy" "scheduler" {
  name = "${var.project}-${var.environment}-scheduler-policy"
  role = aws_iam_role.scheduler.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ec2:StartInstances",
          "ec2:StopInstances",
          "ec2:DescribeInstances",
          "rds:StartDBInstance",
          "rds:StopDBInstance",
          "rds:DescribeDBInstances"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}

# --- Lambda: Start ---

data "archive_file" "start" {
  type        = "zip"
  output_path = "${path.module}/lambda_start.zip"

  source {
    content = templatefile("${path.module}/lambda_start.py.tpl", {
      ec2_instance_ids = jsonencode(var.ec2_instance_ids)
      rds_instance_id  = var.rds_instance_id
    })
    filename = "lambda_function.py"
  }
}

resource "aws_lambda_function" "start" {
  function_name    = "${var.project}-${var.environment}-scheduler-start"
  role             = aws_iam_role.scheduler.arn
  handler          = "lambda_function.lambda_handler"
  runtime          = "python3.12"
  timeout          = 60
  filename         = data.archive_file.start.output_path
  source_code_hash = data.archive_file.start.output_base64sha256

  tags = merge(var.common_tags, {
    Name = "${var.project}-${var.environment}-scheduler-start"
  })
}

# --- Lambda: Stop ---

data "archive_file" "stop" {
  type        = "zip"
  output_path = "${path.module}/lambda_stop.zip"

  source {
    content = templatefile("${path.module}/lambda_stop.py.tpl", {
      ec2_instance_ids = jsonencode(var.ec2_instance_ids)
      rds_instance_id  = var.rds_instance_id
    })
    filename = "lambda_function.py"
  }
}

resource "aws_lambda_function" "stop" {
  function_name    = "${var.project}-${var.environment}-scheduler-stop"
  role             = aws_iam_role.scheduler.arn
  handler          = "lambda_function.lambda_handler"
  runtime          = "python3.12"
  timeout          = 60
  filename         = data.archive_file.stop.output_path
  source_code_hash = data.archive_file.stop.output_base64sha256

  tags = merge(var.common_tags, {
    Name = "${var.project}-${var.environment}-scheduler-stop"
  })
}

# --- EventBridge Rules ---

resource "aws_cloudwatch_event_rule" "start" {
  name                = "${var.project}-${var.environment}-schedule-start"
  description         = "Liga EC2s e RDS no horário de trabalho"
  schedule_expression = var.schedule_start

  tags = var.common_tags
}

resource "aws_cloudwatch_event_rule" "stop" {
  name                = "${var.project}-${var.environment}-schedule-stop"
  description         = "Desliga EC2s e RDS fora do horário de trabalho"
  schedule_expression = var.schedule_stop

  tags = var.common_tags
}

# --- EventBridge Targets ---

resource "aws_cloudwatch_event_target" "start" {
  rule      = aws_cloudwatch_event_rule.start.name
  target_id = "lambda-start"
  arn       = aws_lambda_function.start.arn
}

resource "aws_cloudwatch_event_target" "stop" {
  rule      = aws_cloudwatch_event_rule.stop.name
  target_id = "lambda-stop"
  arn       = aws_lambda_function.stop.arn
}

# --- Lambda Permissions (EventBridge → Lambda) ---

resource "aws_lambda_permission" "start" {
  statement_id  = "AllowEventBridgeStart"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.start.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.start.arn
}

resource "aws_lambda_permission" "stop" {
  statement_id  = "AllowEventBridgeStop"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.stop.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.stop.arn
}
