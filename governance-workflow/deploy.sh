#!/bin/bash

# deploy.sh - Automated deployment script for Data Governance Decision Tool
# Usage: ./deploy.sh [target] [environment]
# Targets: docker, aws, azure, kubernetes, standalone
# Environments: development, staging, production

set -e  # Exit on any error
set -u  # Exit on undefined variable

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_NAME="data-governance-decision-tool"
VERSION=$(node -p "require('./package.json').version")
BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
COMMIT_SHA=${GITHUB_SHA:-$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
TARGET="${1:-docker}"
ENVIRONMENT="${2:-production}"
SKIP_TESTS="${SKIP_TESTS:-false}"
SKIP_BUILD="${SKIP_BUILD:-false}"
DRY_RUN="${DRY_RUN:-false}"

# Logging functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ⚠️  $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ❌ $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed"
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        error "npm is not installed"
        exit 1
    fi
    
    # Check git
    if ! command -v git &> /dev/null; then
        warning "Git is not installed - some features may not work"
    fi
    
    # Check Docker for docker deployment
    if [[ "$TARGET" == "docker" || "$TARGET" == "kubernetes" ]] && ! command -v docker &> /dev/null; then
        error "Docker is not installed but required for $TARGET deployment"
        exit 1
    fi
    
    # Check AWS CLI for AWS deployment
    if [[ "$TARGET" == "aws" ]] && ! command -v aws &> /dev/null; then
        error "AWS CLI is not installed but required for AWS deployment"
        exit 1
    fi
    
    # Check Azure CLI for Azure deployment
    if [[ "$TARGET" == "azure" ]] && ! command -v az &> /dev/null; then
        error "Azure CLI is not installed but required for Azure deployment"
        exit 1
    fi
    
    # Check kubectl for Kubernetes deployment
    if [[ "$TARGET" == "kubernetes" ]] && ! command -v kubectl &> /dev/null; then
        error "kubectl is not installed but required for Kubernetes deployment"
        exit 1
    fi
    
    success "Prerequisites check completed"
}

# Install dependencies
install_dependencies() {
    if [[ "$SKIP_BUILD" == "true" ]]; then
        log "Skipping dependency installation"
        return
    fi
    
    log "Installing dependencies..."
    npm ci --silent
    success "Dependencies installed"
}

# Run tests
run_tests() {
    if [[ "$SKIP_TESTS" == "true" ]]; then
        log "Skipping tests"
        return
    fi
    
    log "Running tests..."
    npm run lint
    npm run test
    success "Tests completed"
}

# Build application
build_application() {
    if [[ "$SKIP_BUILD" == "true" ]]; then
        log "Skipping build"
        return
    fi
    
    log "Building application..."
    
    # Clean previous build
    rm -rf dist
    
    # Build the application
    npm run build
    
    # Add version information
    cat > dist/version.json << EOF
{
  "version": "$VERSION",
  "buildDate": "$BUILD_DATE",
  "commitSha": "$COMMIT_SHA",
  "environment": "$ENVIRONMENT",
  "target": "$TARGET"
}
EOF
    
    # Copy additional files
    cp README.md dist/ 2>/dev/null || true
    cp LICENSE dist/ 2>/dev/null || true
    
    success "Application built successfully"
}

# Docker deployment
deploy_docker() {
    log "Deploying to Docker..."
    
    local image_name="$PROJECT_NAME:$VERSION"
    local latest_name="$PROJECT_NAME:latest"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log "DRY RUN: Would build Docker image: $image_name"
        return
    fi
    
    # Build Docker image
    docker build \
        --build-arg VERSION="$VERSION" \
        --build-arg BUILD_DATE="$BUILD_DATE" \
        --build-arg COMMIT_SHA="$COMMIT_SHA" \
        --tag "$image_name" \
        --tag "$latest_name" \
        .
    
    # Tag for registry if specified
    if [[ -n "${DOCKER_REGISTRY:-}" ]]; then
        docker tag "$image_name" "$DOCKER_REGISTRY/$image_name"
        docker tag "$latest_name" "$DOCKER_REGISTRY/$latest_name"
        
        if [[ "${DOCKER_PUSH:-false}" == "true" ]]; then
            docker push "$DOCKER_REGISTRY/$image_name"
            docker push "$DOCKER_REGISTRY/$latest_name"
        fi
    fi
    
    success "Docker deployment completed"
    log "Image: $image_name"
    log "Latest: $latest_name"
}

# AWS S3/CloudFront deployment
deploy_aws() {
    log "Deploying to AWS S3..."
    
    local bucket_name="${AWS_BUCKET:-governance-tool-bucket}"
    local cloudfront_id="${AWS_CLOUDFRONT_ID:-}"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log "DRY RUN: Would sync to S3 bucket: $bucket_name"
        return
    fi
    
    # Sync to S3
    aws s3 sync dist/ "s3://$bucket_name" \
        --delete \
        --cache-control "max-age=31536000" \
        --exclude "*.html" \
        --exclude "version.json"
    
    # Upload HTML files with different cache control
    aws s3 sync dist/ "s3://$bucket_name" \
        --cache-control "max-age=3600" \
        --include "*.html" \
        --include "version.json"
    
    # Invalidate CloudFront if distribution ID provided
    if [[ -n "$cloudfront_id" ]]; then
        log "Invalidating CloudFront distribution: $cloudfront_id"
        aws cloudfront create-invalidation \
            --distribution-id "$cloudfront_id" \
            --paths "/*"
    fi
    
    success "AWS deployment completed"
    log "Bucket: s3://$bucket_name"
}

# Azure deployment
deploy_azure() {
    log "Deploying to Azure..."
    
    local resource_group="${AZURE_RESOURCE_GROUP:-governance-rg}"
    local app_name="${AZURE_APP_NAME:-governance-app}"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log "DRY RUN: Would deploy to Azure app: $app_name"
        return
    fi
    
    # Create deployment package
    cd dist
    zip -r "../deployment.zip" .
    cd ..
    
    # Deploy to Azure Web App
    az webapp deployment source config-zip \
        --resource-group "$resource_group" \
        --name "$app_name" \
        --src "deployment.zip"
    
    # Clean up
    rm deployment.zip
    
    success "Azure deployment completed"
    log "App: $app_name"
}

# Kubernetes deployment
deploy_kubernetes() {
    log "Deploying to Kubernetes..."
    
    local namespace="${K8S_NAMESPACE:-governance}"
    local deployment_name="${K8S_DEPLOYMENT:-governance-tool}"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log "DRY RUN: Would deploy to Kubernetes namespace: $namespace"
        return
    fi
    
    # Create namespace if it doesn't exist
    kubectl create namespace "$namespace" --dry-run=client -o yaml | kubectl apply -f -
    
    # Generate Kubernetes manifests
    cat > k8s-deployment.yaml << EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: $deployment_name
  namespace: $namespace
  labels:
    app: $deployment_name
    version: $VERSION
spec:
  replicas: 3
  selector:
    matchLabels:
      app: $deployment_name
  template:
    metadata:
      labels:
        app: $deployment_name
        version: $VERSION
    spec:
      containers:
      - name: governance-tool
        image: $PROJECT_NAME:$VERSION
        ports:
        - containerPort: 80
        resources:
          requests:
            memory: "64Mi"
            cpu: "250m"
          limits:
            memory: "128Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 80
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 80
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: $deployment_name-service
  namespace: $namespace
spec:
  selector:
    app: $deployment_name
  ports:
  - protocol: TCP
    port: 80
    targetPort: 80
  type: ClusterIP
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: $deployment_name-ingress
  namespace: $namespace
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  rules:
  - host: governance.${K8S_DOMAIN:-local}
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: $deployment_name-service
            port:
              number: 80
EOF
    
    # Apply manifests
    kubectl apply -f k8s-deployment.yaml
    
    # Wait for deployment
    kubectl rollout status deployment/$deployment_name -n "$namespace"
    
    # Clean up
    rm k8s-deployment.yaml
    
    success "Kubernetes deployment completed"
    log "Namespace: $namespace"
    log "Deployment: $deployment_name"
}

# Standalone package deployment
deploy_standalone() {
    log "Creating standalone package..."
    
    local package_name="$PROJECT_NAME-standalone-v$VERSION"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log "DRY RUN: Would create package: $package_name.zip"
        return
    fi
    
    # Create package directory
    mkdir -p "packages/$package_name"
    
    # Copy built application
    cp -r dist/* "packages/$package_name/"
    
    # Add deployment files
    cp Dockerfile "packages/$package_name/" 2>/dev/null || true
    cp docker-compose.yml "packages/$package_name/" 2>/dev/null || true
    cp nginx.conf "packages/$package_name/" 2>/dev/null || true
    cp nginx-default.conf "packages/$package_name/" 2>/dev/null || true
    cp security-headers.conf "packages/$package_name/" 2>/dev/null || true
    
    # Add documentation
    mkdir -p "packages/$package_name/docs"
    cp -r docs/* "packages/$package_name/docs/" 2>/dev/null || true
    # ...existing code...

    # Add documentation
    mkdir -p "packages/$package_name/docs"
    cp -r docs/* "packages/$package_name/docs/" 2>/dev/null || true

    # Zip the package
    cd packages
    zip -r "$package_name.zip" "$package_name"
    cd ..

    # Clean up the unzipped package directory
    rm -rf "packages/$package_name"

    success "Standalone package created: packages/$package_name.zip"
}

# Main deployment logic
main() {
    check_prerequisites
    install_dependencies
    run_tests
    build_application

    case "$TARGET" in
        docker)
            deploy_docker
            ;;
        aws)
            deploy_aws
            ;;
        azure)
            deploy_azure
            ;;
        kubernetes)
            deploy_kubernetes
            ;;
        standalone)
            deploy_standalone
            ;;
        *)
            error "Unknown deployment target: $TARGET"
            echo "Usage: $0 [docker|aws|azure|kubernetes|standalone] [environment]"
            exit 1
            ;;
    esac
}

main "$@"