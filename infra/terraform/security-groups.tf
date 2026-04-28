resource "aws_security_group" "backend_alb" {
  count = var.enable_backend_alb ? 1 : 0

  name        = "${var.project_name}-${var.environment}-backend-alb-sg"
  description = "Security group for Geo-Sentinel backend ALB"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "Public HTTP access to backend ALB"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "Public HTTPS access to backend ALB"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "Allow ALB outbound traffic to backend targets"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${var.environment}-backend-alb-sg"
    Role = "backend-alb"
  })
}

resource "aws_security_group" "backend" {
  name        = "${var.project_name}-${var.environment}-backend-sg"
  description = "Security group for Geo-Sentinel backend API"
  vpc_id      = aws_vpc.main.id

  dynamic "ingress" {
    for_each = var.enable_backend_alb ? [] : [1]

    content {
      description = "Public Geo-Sentinel backend API"
      from_port   = var.backend_port
      to_port     = var.backend_port
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
    }
  }

  dynamic "ingress" {
    for_each = aws_security_group.backend_alb

    content {
      description     = "Backend API access from ALB"
      from_port       = var.backend_port
      to_port         = var.backend_port
      protocol        = "tcp"
      security_groups = [ingress.value.id]
    }
  }

  dynamic "ingress" {
    for_each = var.ssh_allowed_cidrs

    content {
      description = "SSH admin access"
      from_port   = 22
      to_port     = 22
      protocol    = "tcp"
      cidr_blocks = [ingress.value]
    }
  }

  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${var.environment}-backend-sg"
    Role = "backend-api"
  })
}