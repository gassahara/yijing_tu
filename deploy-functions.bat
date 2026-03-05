@echo off
echo ==========================================
echo Deploying YijingTu Supabase Functions
echo ==========================================
echo.
echo Configuration: JWT verification disabled (legacy secret not used)
echo.

echo Deploying: bazi-astrol
supabase functions deploy bazi-astrol
echo.

echo Deploying: yijingtu
supabase functions deploy yijingtu
echo.

echo Deploying: yijingtu-translate
supabase functions deploy yijingtu-translate
echo.

echo Deploying: yijingtu-remedies
supabase functions deploy yijingtu-remedies
echo.

echo Deploying: yijingtu-advice
supabase functions deploy yijingtu-advice
echo.

echo Deploying: yijingtu-interpret
supabase functions deploy yijingtu-interpret
echo.

echo ==========================================
echo Deployment complete!
echo ==========================================
echo.
echo Verifying deployments...
supabase functions list

pause
