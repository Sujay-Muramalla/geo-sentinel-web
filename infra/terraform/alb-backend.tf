resource "aws_lb" "backend_api" {
  count = var.enable_backend_alb ? 1 : 0

  name               = "${var.project_name}-${var.environment}-backend-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.backend_alb[0].id]
  subnets            = local.public_subnet_ids

  enable_deletion_protection = false
  idle_timeout               = 60

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${var.environment}-backend-alb"
    Role = "backend-api-alb"
  })
}

resource "aws_lb_target_group" "backend_api" {
  count = var.enable_backend_alb ? 1 : 0

  name        = "${var.project_name}-${var.environment}-backend-tg"
  port        = var.backend_port
  protocol    = "HTTP"
  target_type = "instance"
  vpc_id      = aws_vpc.main.id

  health_check {
    enabled             = true
    path                = "/api/health"
    protocol            = "HTTP"
    matcher             = "200"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${var.environment}-backend-tg"
    Role = "backend-api-target-group"
  })
}

resource "aws_lb_target_group_attachment" "backend_api" {
  count = var.enable_backend_alb && var.enable_backend_ec2 ? 1 : 0

  target_group_arn = aws_lb_target_group.backend_api[0].arn
  target_id        = aws_instance.backend[0].id
  port             = var.backend_port
}

resource "aws_lb_listener" "backend_http" {
  count = var.enable_backend_alb ? 1 : 0

  load_balancer_arn = aws_lb.backend_api[0].arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = var.enable_backend_https ? "redirect" : "forward"
    target_group_arn = var.enable_backend_https ? null : aws_lb_target_group.backend_api[0].arn

    dynamic "redirect" {
      for_each = var.enable_backend_https ? [1] : []

      content {
        port        = "443"
        protocol    = "HTTPS"
        status_code = "HTTP_301"
      }
    }
  }
}

resource "aws_lb_listener" "backend_https" {
  count = var.enable_backend_alb && var.enable_backend_https ? 1 : 0

  load_balancer_arn = aws_lb.backend_api[0].arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = aws_acm_certificate_validation.backend_api_cert_validation[0].certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend_api[0].arn
  }
}
