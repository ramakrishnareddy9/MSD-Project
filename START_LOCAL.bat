@echo off
echo ========================================
echo FarmKart Local Development Setup
echo ========================================
echo.

echo Step 1: Creating Backend .env file...
(
echo NODE_ENV=development
echo PORT=5000
echo MONGODB_URI=mongodb+srv://RamaKrishna_Reddy:12345@msd.ivea6xc.mongodb.net/farmkart?retryWrites=true^&w=majority
echo JWT_SECRET=4e912d1390cdaacef0f20239169ff2c92cec716b913011c1de2c6eccb36c07f6a472974ea6829b7d8d004912b24b928e1acb5df6ee6d9c4c5b46063f4f611d90
echo JWT_EXPIRE=7d
echo ENABLE_SCHEDULER=true
) > backend\.env
echo ✓ Backend .env created
echo.

echo Step 2: Creating Frontend .env file...
(
echo VITE_API_URL=http://localhost:5000/api
) > FrontEnd\.env
echo ✓ Frontend .env created
echo.

echo ========================================
echo Environment files created successfully!
echo ========================================
echo.
echo Next steps:
echo 1. Open TWO terminals
echo.
echo Terminal 1 - Backend:
echo    cd backend
echo    npm run dev
echo.
echo Terminal 2 - Frontend:
echo    cd FrontEnd
echo    npm run dev
echo.
echo Then open: http://localhost:5173
echo ========================================
pause
