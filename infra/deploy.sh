#!/bin/bash
set -e

# Supply Chain Game - AWS Deployment Script
# Deploys to EC2 + CloudFront in ap-southeast-1

REGION="ap-southeast-1"
INSTANCE_TYPE="t3.small"
APP_NAME="supply-chain-game"
KEY_NAME="supply-chain-game-key"
SG_NAME="supply-chain-game-sg"

echo "🚀 Deploying Supply Chain Broker to AWS..."

# 1. Build frontend
echo "📦 Building frontend..."
cd "$(dirname "$0")/.."
cd client && npm run build && cd ..
rm -rf public && cp -r client/dist public

# 2. Create key pair (if not exists)
echo "🔑 Setting up key pair..."
if ! aws ec2 describe-key-pairs --key-names $KEY_NAME --region $REGION 2>/dev/null; then
  aws ec2 create-key-pair --key-name $KEY_NAME --region $REGION \
    --query 'KeyMaterial' --output text > ~/.ssh/${KEY_NAME}.pem
  chmod 400 ~/.ssh/${KEY_NAME}.pem
  echo "  Key saved to ~/.ssh/${KEY_NAME}.pem"
else
  echo "  Key pair already exists"
fi

# 3. Get default VPC
echo "🌐 Getting VPC info..."
VPC_ID=$(aws ec2 describe-vpcs --region $REGION \
  --filters "Name=isDefault,Values=true" \
  --query 'Vpcs[0].VpcId' --output text)
echo "  VPC: $VPC_ID"

# 4. Create Security Group
echo "🔒 Creating security group..."
SG_ID=$(aws ec2 describe-security-groups --region $REGION \
  --filters "Name=group-name,Values=$SG_NAME" \
  --query 'SecurityGroups[0].GroupId' --output text 2>/dev/null || echo "None")

if [ "$SG_ID" = "None" ] || [ -z "$SG_ID" ]; then
  SG_ID=$(aws ec2 create-security-group \
    --group-name $SG_NAME \
    --description "Supply Chain Game - HTTP from CloudFront" \
    --vpc-id $VPC_ID \
    --region $REGION \
    --query 'GroupId' --output text)
  
  # Allow SSH from anywhere (for setup)
  aws ec2 authorize-security-group-ingress --group-id $SG_ID --region $REGION \
    --protocol tcp --port 22 --cidr 0.0.0.0/0
  
  # Allow HTTP from anywhere (CloudFront uses various IPs)
  aws ec2 authorize-security-group-ingress --group-id $SG_ID --region $REGION \
    --protocol tcp --port 3000 --cidr 0.0.0.0/0
  
  # Allow port 80 too
  aws ec2 authorize-security-group-ingress --group-id $SG_ID --region $REGION \
    --protocol tcp --port 80 --cidr 0.0.0.0/0
fi
echo "  Security Group: $SG_ID"

# 5. Find latest Amazon Linux 2023 AMI
echo "🖥️ Finding AMI..."
AMI_ID=$(aws ec2 describe-images --region $REGION \
  --owners amazon \
  --filters "Name=name,Values=al2023-ami-2023*-x86_64" "Name=state,Values=available" \
  --query 'sort_by(Images, &CreationDate)[-1].ImageId' --output text)
echo "  AMI: $AMI_ID"

# 6. Create user data script
cat > /tmp/userdata.sh << 'USERDATA'
#!/bin/bash
yum update -y
yum install -y nodejs npm git

# Create app directory
mkdir -p /opt/supply-chain-game
cd /opt/supply-chain-game

# App will be copied via scp after instance is ready
# Setup systemd service
cat > /etc/systemd/system/supply-chain-game.service << 'EOF'
[Unit]
Description=Supply Chain Broker Game
After=network.target

[Service]
ExecStart=/usr/bin/node /opt/supply-chain-game/server/index.js
WorkingDirectory=/opt/supply-chain-game
Restart=always
RestartSec=10
Environment=PORT=3000
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable supply-chain-game
USERDATA

# 7. Launch EC2 instance
echo "🚀 Launching EC2 instance..."
INSTANCE_ID=$(aws ec2 run-instances --region $REGION \
  --image-id $AMI_ID \
  --instance-type $INSTANCE_TYPE \
  --key-name $KEY_NAME \
  --security-group-ids $SG_ID \
  --user-data file:///tmp/userdata.sh \
  --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=$APP_NAME}]" \
  --query 'Instances[0].InstanceId' --output text)
echo "  Instance: $INSTANCE_ID"

# 8. Wait for instance to be running
echo "⏳ Waiting for instance to be running..."
aws ec2 wait instance-running --instance-ids $INSTANCE_ID --region $REGION
sleep 10

# Get public IP
PUBLIC_IP=$(aws ec2 describe-instances --instance-ids $INSTANCE_ID --region $REGION \
  --query 'Reservations[0].Instances[0].PublicIpAddress' --output text)
echo "  Public IP: $PUBLIC_IP"

# 9. Wait for SSH to be ready
echo "⏳ Waiting for SSH..."
for i in {1..30}; do
  if ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 -i ~/.ssh/${KEY_NAME}.pem ec2-user@$PUBLIC_IP "echo ready" 2>/dev/null; then
    break
  fi
  sleep 10
done

# 10. Copy app files
echo "📤 Copying app files..."
# Create a tarball excluding node_modules and client source
tar -czf /tmp/app.tar.gz \
  --exclude='node_modules' \
  --exclude='client/node_modules' \
  --exclude='client/src' \
  --exclude='client/dist' \
  --exclude='.git' \
  -C "$(pwd)" .

scp -o StrictHostKeyChecking=no -i ~/.ssh/${KEY_NAME}.pem /tmp/app.tar.gz ec2-user@$PUBLIC_IP:/tmp/

ssh -o StrictHostKeyChecking=no -i ~/.ssh/${KEY_NAME}.pem ec2-user@$PUBLIC_IP << 'REMOTE'
sudo tar -xzf /tmp/app.tar.gz -C /opt/supply-chain-game/
cd /opt/supply-chain-game
sudo npm install --production
sudo systemctl restart supply-chain-game
sleep 3
sudo systemctl status supply-chain-game
REMOTE

echo "✅ App deployed! http://$PUBLIC_IP:3000"

# 11. Create CloudFront distribution
echo "☁️ Creating CloudFront distribution..."
DIST_CONFIG=$(cat << EOF
{
  "CallerReference": "supply-chain-$(date +%s)",
  "Comment": "Supply Chain Broker Game",
  "DefaultCacheBehavior": {
    "TargetOriginId": "ec2-origin",
    "ViewerProtocolPolicy": "redirect-to-https",
    "AllowedMethods": {
      "Quantity": 7,
      "Items": ["GET", "HEAD", "OPTIONS", "PUT", "PATCH", "POST", "DELETE"],
      "CachedMethods": {
        "Quantity": 2,
        "Items": ["GET", "HEAD"]
      }
    },
    "ForwardedValues": {
      "QueryString": true,
      "Cookies": { "Forward": "all" },
      "Headers": {
        "Quantity": 3,
        "Items": ["Host", "Origin", "Upgrade"]
      }
    },
    "MinTTL": 0,
    "DefaultTTL": 0,
    "MaxTTL": 0,
    "Compress": true
  },
  "Origins": {
    "Quantity": 1,
    "Items": [
      {
        "Id": "ec2-origin",
        "DomainName": "$PUBLIC_IP",
        "CustomOriginConfig": {
          "HTTPPort": 3000,
          "HTTPSPort": 443,
          "OriginProtocolPolicy": "http-only",
          "OriginReadTimeout": 60,
          "OriginKeepaliveTimeout": 60
        }
      }
    ]
  },
  "Enabled": true,
  "Restrictions": {
    "GeoRestriction": {
      "RestrictionType": "whitelist",
      "Quantity": 2,
      "Items": ["TH", "SG"]
    }
  },
  "DefaultRootObject": "",
  "PriceClass": "PriceClass_200"
}
EOF
)

echo "$DIST_CONFIG" > /tmp/cf-config.json

CF_RESULT=$(aws cloudfront create-distribution \
  --distribution-config file:///tmp/cf-config.json \
  --region us-east-1 \
  --query 'Distribution.{Id:Id,DomainName:DomainName}' --output json 2>&1)

if echo "$CF_RESULT" | grep -q "DomainName"; then
  CF_DOMAIN=$(echo "$CF_RESULT" | grep -o '"DomainName": "[^"]*"' | cut -d'"' -f4)
  CF_ID=$(echo "$CF_RESULT" | grep -o '"Id": "[^"]*"' | cut -d'"' -f4)
  echo ""
  echo "========================================="
  echo "✅ DEPLOYMENT COMPLETE!"
  echo "========================================="
  echo "EC2 Direct:  http://$PUBLIC_IP:3000"
  echo "CloudFront:  https://$CF_DOMAIN"
  echo "CF Dist ID:  $CF_ID"
  echo "(CloudFront may take 5-15 min to deploy)"
  echo "========================================="
else
  echo "⚠️ CloudFront creation had an issue. Direct access available:"
  echo "EC2 Direct:  http://$PUBLIC_IP:3000"
  echo "Error: $CF_RESULT"
fi
