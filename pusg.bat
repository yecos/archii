@echo off
chcp 65001 >nul 2>&1
title ArchiFlow — Push a GitHub
echo.
echo  ╔══════════════════════════════════════╗
echo  ║   ArchiFlow — Git Push Automático   ║
echo  ╚══════════════════════════════════════╝
echo.

:: Check if we're in a git repo
git rev-parse --is-inside-work-tree >nul 2>&1
if %errorlevel% neq 0 (
    echo  ❌ Error: No estás en un repositorio Git.
    echo     Abre este archivo DENTRO de la carpeta del proyecto.
    echo     Ejemplo: C:\Users\yecos\Archiflow\archii-project
    pause
    exit /b 1
)

echo  📂 Carpeta: %cd%
echo.

:: Detect branch name
for /f "tokens=*" %%a in ('git branch --show-current') do set "BRANCH=%%a"
echo  🌿 Rama: %BRANCH%
echo.

:: Step 1: Check if local is ahead of remote
echo  ── Paso 1: Verificando estado...
echo.

:: Check if there are uncommitted changes
git diff-index --quiet HEAD -- 2>nul
set "has_uncommitted=%errorlevel%"

:: Check if local is ahead of remote
set "is_ahead=0"
for /f %%a in ('git rev-list --count origin/%BRANCH%..HEAD 2^>nul') do set "is_ahead=%%a"

if "%has_uncommitted%"=="0" if "%is_ahead%"=="0" (
    echo  ✅ No hay cambios pendientes. Todo está al día con GitHub.
    echo.
    pause
    exit /b 0
)

if "%has_uncommitted%"=="0" (
    echo  ⚠️  Hay %is_ahead% commit(s) sin subir a GitHub.
    echo  📋 Ejecutando push directo...
    echo.
    git push origin %BRANCH%
    if %errorlevel% neq 0 (
        echo  ❌ Error al hacer push. Intenta manualmente:
        echo     git push origin %BRANCH%
        pause
        exit /b 1
    )
    goto :verify
)

:: Step 2: Show changed files
echo  Archivos modificados:
echo.
git status --short
echo.

:: Step 3: Detect what changed for smart commit message
echo  ── Paso 2: Generando mensaje de commit...
echo.

set "commit_msg="

git diff --name-only HEAD > "%temp%\archiflow_files.txt"

findstr /i "ChatScreen" "%temp%\archiflow_files.txt" >nul 2>&1
if %errorlevel% equ 0 set "commit_msg=feat: mejoras en pantalla de chat"

findstr /i "AppContext" "%temp%\archiflow_files.txt" >nul 2>&1
if %errorlevel% equ 0 (
    if defined commit_msg (
        set "commit_msg=feat: mejoras en chat y contexto de app"
    ) else (
        set "commit_msg=feat: actualización de contexto de app"
    )
)

findstr /i "TasksScreen\|TaskScreen" "%temp%\archiflow_files.txt" >nul 2>&1
if %errorlevel% equ 0 set "commit_msg=feat: mejoras en gestión de tareas"

findstr /i "DashboardScreen" "%temp%\archiflow_files.txt" >nul 2>&1
if %errorlevel% equ 0 set "commit_msg=feat: mejoras en dashboard"

findstr /i "InventoryScreen\|inventory" "%temp%\archiflow_files.txt" >nul 2>&1
if %errorlevel% equ 0 set "commit_msg=feat: mejoras en inventario"

findstr /i "GalleryScreen\|gallery" "%temp%\archiflow_files.txt" >nul 2>&1
if %errorlevel% equ 0 set "commit_msg=feat: mejoras en galería de fotos"

findstr /i "CalendarScreen\|calendar" "%temp%\archiflow_files.txt" >nul 2>&1
if %errorlevel% equ 0 set "commit_msg=feat: mejoras en calendario"

findstr /i "ReportsScreen\|reports" "%temp%\archiflow_files.txt" >nul 2>&1
if %errorlevel% equ 0 set "commit_msg=feat: mejoras en reportes"

findstr /i "BudgetScreen\|budget" "%temp%\archiflow_files.txt" >nul 2>&1
if %errorlevel% equ 0 set "commit_msg=feat: mejoras en presupuestos"

findstr /i "ProfileScreen\|profile" "%temp%\archiflow_files.txt" >nul 2>&1
if %errorlevel% equ 0 set "commit_msg=feat: mejoras en perfil de usuario"

findstr /i "AdminScreen\|admin" "%temp%\archiflow_files.txt" >nul 2>&1
if %errorlevel% equ 0 set "commit_msg=feat: mejoras en panel de administración"

findstr /i "Sidebar\|sidebar\|layout" "%temp%\archiflow_files.txt" >nul 2>&1
if %errorlevel% equ 0 set "commit_msg=feat: mejoras en navegación y layout"

findstr /i "globals.css\|tailwind\|style" "%temp%\archiflow_files.txt" >nul 2>&1
if %errorlevel% equ 0 set "commit_msg=style: actualización de estilos"

findstr /i "types.ts" "%temp%\archiflow_files.txt" >nul 2>&1
if not defined commit_msg set "commit_msg=refactor: actualización de tipos"

findstr /i "helpers\|utils" "%temp%\archiflow_files.txt" >nul 2>&1
if not defined commit_msg set "commit_msg=refactor: actualización de utilidades"

findstr /i "firebase\|firestore" "%temp%\archiflow_files.txt" >nul 2>&1
if not defined commit_msg set "commit_msg=fix: actualización de firebase"

if not defined commit_msg set "commit_msg=update: actualización general del proyecto"

echo  💡 Sugerencia: "%commit_msg%"
echo.

:: Ask user
set /p "user_msg=  ✏️  Tu commit (Enter = usar sugerido): "
if not "%user_msg%"=="" set "commit_msg=%user_msg%"
echo.

:: Step 4: Git Add
echo  ── Paso 3: git add...
git add .
if %errorlevel% neq 0 (
    echo  ❌ Error al agregar archivos.
    pause
    exit /b 1
)
echo  ✅ Archivos agregados
echo.

:: Step 5: Git Commit
echo  ── Paso 4: git commit...
git commit -m "%commit_msg%"
if %errorlevel% neq 0 (
    echo  ⚠️  Commit vacío o sin cambios. Verificando push pendiente...
    echo.
)
echo  ✅ Commit: "%commit_msg%"
echo.

:: Step 6: Git Pull BEFORE push
echo  ── Paso 5: Sincronizando con GitHub (pull antes de push)...
echo.

:: Save current commit hash for later verification
for /f %%a in ('git rev-parse HEAD') do set "local_hash=%%a"

git pull origin %BRANCH% --rebase 2>nul
if %errorlevel% neq 0 (
    echo  ⚠️  Rebase falló, intentando merge normal...
    git pull origin %BRANCH% 2>nul
    if %errorlevel% neq 0 (
        echo.
        echo  ❌ No se pudo sincronizar con GitHub.
        echo  📋 Posibles causas:
        echo     - No tienes conexión a internet
        echo     - La rama "%BRANCH%" no existe en GitHub
        echo     - Hay conflictos que resolver manualmente
        echo.
        echo  💡 Intenta manualmente:
        echo     git pull origin %BRANCH%
        echo.
        pause
        exit /b 1
    )
)
echo  ✅ Sincronizado con GitHub
echo.

:: Step 7: Git Push
echo  ── Paso 6: Subiendo a GitHub...
echo.

git push origin %BRANCH%
if %errorlevel% neq 0 (
    echo.
    echo  ❌❌❌ PUSH FALLÓ ❌❌❌
    echo.
    echo  El commit se creó localmente pero NO llegó a GitHub.
    echo  Intenta manualmente:
    echo     git push origin %BRANCH%
    echo.
    pause
    exit /b 1
)
echo  ✅ Push enviado a GitHub
echo.

:: Step 8: VERIFY that remote matches local
:verify
echo  ── Paso 7: Verificación final...
echo.

git fetch origin %BRANCH% >nul 2>&1
for /f %%a in ('git rev-parse HEAD') do set "current_local=%%a"
for /f %%a in ('git rev-parse origin/%BRANCH%') do set "current_remote=%%a"

if "%current_local%"=="%current_remote%" (
    echo  ✅ Local y GitHub están sincronizados: %current_local:~0,7%
    echo.
    echo  ╔══════════════════════════════════════╗
    echo  ║       ✅ ¡TODO LISTO, PUSH OK!       ║
    echo  ╚══════════════════════════════════════╝
    echo.
    echo  📦 Commit: %commit_msg%
    echo  🌿 Rama: %BRANCH%
    echo  🚀 Vercel desplegará en 1-2 minutos
    echo  🌐 https://archii-theta.vercel.app
    echo.
) else (
    echo  ❌ ADVERTENCIA: Local y GitHub NO coinciden!
    echo     Local:  %current_local:~0,7%
    echo     Remote: %current_remote:~0,7%
    echo.
    echo  💡 Ejecuta el script de nuevo para resolver.
    echo.
)

:: Cleanup
del "%temp%\archiflow_files.txt" >nul 2>&1

pause