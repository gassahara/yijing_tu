#!/bin/bash

# Supabase Functions Deployment Script
# Deploys all functions with verify_jwt disabled (legacy secret not used)

FUNCTIONS=(
    "bazi-astrol"
    "yijingtu"
    "yijingtu-translate"
    "yijingtu-remedies"
    "yijingtu-advice"
    "yijingtu-interpret"
)

echo "=========================================="
echo "Deploying YijingTu Supabase Functions"
echo "=========================================="
echo ""
echo "Configuration: JWT verification disabled (legacy secret not used)"
echo ""

for func in "${FUNCTIONS[@]}"; do
    echo "Deploying function: $func"
    if supabase functions deploy "$func"; then
        echo "  ✓ $func deployed successfully"
    else
        echo "  ✗ $func deployment failed"
    fi
    echo ""
done

echo "=========================================="
echo "Deployment complete!"
echo "=========================================="
echo ""
echo "Verifying deployments..."
supabase functions list
