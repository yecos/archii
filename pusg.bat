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

:: Step 1: Check current status
echo  ── Paso 1: Revisando cambios...
echo.

git status --short
echo.

:: Check if there are changes
git diff-index --quiet HEAD -- 2>nul
if %errorlevel% equ 0 (
    echo  ✅ No hay cambios pendientes. Todo está al día.
    echo.
    git pull origin main
    echo.
    echo  🎉 ¡Tu repo ya está sincronizado!
    pause
    exit /b 0
)

:: Step 2: Detect what changed and suggest commit message
echo  ── Paso 2: Detectando cambios para el commit...
echo.

set "commit_msg="

:: Check specific files for smart commit messages
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

findstr /i "TasksScreen\|TaskScreen\|tasks" "%temp%\archiflow_files.txt" >nul 2>&1
if %errorlevel% equ 0 set "commit_msg=feat: mejoras en gestión de tareas"

findstr /i "DashboardScreen" "%temp%\archiflow_files.txt" >nul 2>&1
if %errorlevel% equ 0 set "commit_msg=feat: mejoras en dashboard"

findstr /i "InventoryScreen\|inventario\|inv" "%temp%\archiflow_files.txt" >nul 2>&1
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

findstr /i "types.ts\|types" "%temp%\archiflow_files.txt" >nul 2>&1
if not defined commit_msg set "commit_msg=refactor: actualización de tipos"

findstr /i "helpers\|utils" "%temp%\archiflow_files.txt" >nul 2>&1
if not defined commit_msg set "commit_msg=refactor: actualización de utilidades"

findstr /i "firebase\|firestore" "%temp%\archiflow_files.txt" >nul 2>&1
if not defined commit_msg set "commit_msg=fix: actualización de firebase"

:: If nothing matched, use generic message
if not defined commit_msg set "commit_msg=update: actualización general del proyecto"

echo  💡 Commit sugerido: "%commit_msg%"
echo.

:: Ask user for custom message or accept suggestion
set /p "user_msg=  ✏️  Escribe tu commit (Enter para usar el sugerido): "

if not "%user_msg%"=="" (
    set "commit_msg=%user_msg%"
)

echo.

:: Step 3: Git Add
echo  ── Paso 3: Agregando cambios...
git add .
echo  ✅ Archivos agregados
echo.

:: Step 4: Git Commit
echo  ── Paso 4: Creando commit...
git commit -m "%commit_msg%"
if %errorlevel% neq 0 (
    echo  ❌ Error al crear commit. Revisa si hay archivos con problemas.
    pause
    exit /b 1
)
echo  ✅ Commit creado: "%commit_msg%"
echo.

:: Step 5: Git Pull (always before push!)
echo  ── Paso 5: Sincronizando con GitHub (pull)...
echo.

:: Try rebase first (cleaner history)
git pull origin main --rebase 2>nul
if %errorlevel% neq 0 (
    echo  ⚠️  Rebase falló, intentando merge normal...
    git pull origin main 2>nul
    if %errorlevel% neq 0 (
        echo.
        echo  ❌ No se pudo hacer pull. Puede haber conflictos.
        echo  📋 Instrucciones:
        echo     1. Revisa los archivos marcados con conflictos
        echo     2. Edita y elige qué versión mantener
        echo     3. Borra las líneas que dicen <<<< ==== >>>>
        echo     4. Vuelve a ejecutar este script
        echo.
        pause
        exit /b 1
    )
)

echo  ✅ Sincronizado con GitHub
echo.

:: Step 6: Git Push
echo  ── Paso 6: Subiendo a GitHub (push)...
echo.

git push origin main
if %errorlevel% neq 0 (
    echo  ❌ Error al hacer push. Verifica tu conexión o permisos.
    echo.
    echo  💡 Si dice "rejected", intenta:
    echo     git pull origin main --rebase
    echo     git push origin main
    echo.
    pause
    exit /b 1
)

echo.
echo  ╔══════════════════════════════════════╗
echo  ║          ✅ ¡PUSH EXITOSO!           ║
echo  ╚══════════════════════════════════════╝
echo.
echo  📦 Commit: %commit_msg%
echo  🚀 Vercel desplegará automáticamente
echo  🌐 Revisa: https://archii-theta.vercel.app
echo.
pause