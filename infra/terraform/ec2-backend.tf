locals {
  public_subnet_ids = values(aws_subnet.public)[*].id
}

resource "aws_instance" "backend" {
  count = var.enable_backend_ec2 ? 1 : 0

  ami                         = data.aws_ssm_parameter.amazon_linux_2023_ami.value
  instance_type               = var.backend_instance_type
  subnet_id                   = local.public_subnet_ids[0]
  vpc_security_group_ids      = [aws_security_group.backend.id]
  associate_public_ip_address = true
  key_name                    = var.backend_key_name != "" ? var.backend_key_name : null

  user_data = templatefile("${path.module}/backend/user_data.sh", {
    github_repository_url    = var.github_repository_url
    backend_git_ref          = var.backend_git_ref
    backend_clone_path       = var.backend_clone_path
    backend_port             = tostring(var.backend_port)
    python_worker_timeout_ms = tostring(var.python_worker_timeout_ms)
    frontend_origin          = "http://${aws_s3_bucket_website_configuration.frontend_bucket_website.website_endpoint}"
  })

  user_data_replace_on_change = false
  monitoring                  = false

  metadata_options {
    http_endpoint = "enabled"
    http_tokens   = "required"
  }

  credit_specification {
    cpu_credits = "standard"
  }

  root_block_device {
    volume_size           = 8
    volume_type           = "gp3"
    encrypted             = true
    delete_on_termination = true

    tags = merge(local.common_tags, {
      Name = "${var.project_name}-${var.environment}-backend-root-volume"
      Role = "backend-api"
    })
  }

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${var.environment}-backend-ec2"
    Role = "backend-api"
  })
}