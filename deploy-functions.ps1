# Supabase Functions Deployment Script
# Deploys all functions with verify_jwt disabled (legacy secret not used)

$functions = @(
    "bazi-astrol",
    "yijingtu",
    "yijingtu-translate",
    "yijingtu-remedies",
    "yijingtu-advice",
    "yijingtu-interpret"
)

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Deploying YijingTu Supabase Functions" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Configuration: JWT verification disabled (legacy secret not used)" -ForegroundColor Yellow
Write-Host ""

foreach ($func in $functions) {
    Write-Host "Deploying function: $func" -ForegroundColor Green
    try {
        supabase functions deploy $func
        Write-Host "  ✓ $func deployed successfully" -ForegroundColor Green
    } catch {
        Write-Host "  ✗ $func deployment failed: $_" -ForegroundColor Red
    }
    Write-Host ""
}

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Deployment complete!" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Verifying deployments..." -ForegroundColor Yellow

# List deployed functions
supabase functions list
