@echo off
chcp 65001 >nul 2>&1
title ArchiFlow — Push a GitHub
setlocal enabledelayedexpansion

echo.
echo  ========================================
echo   ArchiFlow - Git Push Automatico
echo  ========================================
echo.

:: Check if we're in a git repo
git rev-parse --is-inside-work-tree >nul 2>&1
if %errorlevel% neq 0 (
    echo  [X] Error: No estas en un repositorio Git.
    echo      Abre este archivo DENTRO de la carpeta del proyecto.
    echo      Ejemplo: cd C:\tu-proyecto\archii-project
    pause
    exit /b 1
)

echo  Carpeta: %cd%
echo.

:: Detect branch
for /f "tokens=*" %%a in ('git branch --show-current 2^>nul') do set "BRANCH=%%a"
if not defined BRANCH (
    echo  [X] Error: No se pudo detectar la rama.
    pause
    exit /b 1
)
echo  Rama: %BRANCH%
echo.

:: ===================== STEP 1: Pull primero =====================
echo  -- Paso 1: Descargando cambios de GitHub (pull)...
echo.

git fetch origin %BRANCH% 2>nul
if %errorlevel% neq 0 (
    echo  [!] No se pudo conectar a GitHub. Verifica tu conexion a internet.
    pause
    exit /b 1
)

:: Check if pull is needed
set "NEED_PULL=0"
for /f %%a in ('git rev-list --count HEAD..origin/%BRANCH% 2^>nul') do set "NEED_PULL=%%a"

if "!NEED_PULL!"=="0" (
    echo  [OK] Ya estas al dia con GitHub.
    echo.
) else (
    echo  [!] Hay !NEED_PULL! cambio(s) en GitHub que no tienes localmente.
    echo  Aplicando rebase...
    echo.
    git pull origin %BRANCH% --rebase
    if !errorlevel! neq 0 (
        echo.
        echo  [X] Error al sincronizar. Hay conflictos.
        echo      Resuelve los conflictos y ejecuta de nuevo:
        echo        git add .
        echo        git rebase --continue
        echo.
        pause
        exit /b 1
    )
    echo  [OK] Sincronizado con GitHub.
    echo.
)

:: ===================== STEP 2: Verificar cambios =====================
echo  -- Paso 2: Verificando cambios locales...
echo.

:: Check for staged, modified, and untracked files
set "HAS_CHANGES=0"

git diff --cached --quiet 2>nul
if !errorlevel! neq 0 set "HAS_CHANGES=1"

git diff --quiet 2>nul
if !errorlevel! neq 0 set "HAS_CHANGES=1"

for /f %%a in ('git ls-files --others --exclude-standard 2^>nul ^| find /c /v ""') do set "UNTRACKED=%%a"
if "!UNTRACKED!"=="0" set "UNTRACKED=0"
if !UNTRACKED! gtr 0 set "HAS_CHANGES=1"

if "!HAS_CHANGES!"=="0" (
    echo  [OK] No hay cambios locales para subir.
    echo.
    
    :: Check if there's a commit ahead
    set "AHEAD=0"
    for /f %%a in ('git rev-list --count origin/%BRANCH%..HEAD 2^>nul') do set "AHEAD=%%a"
    
    if "!AHEAD!"=="0" (
        echo  ========================================
        echo   Todo al dia. No hay nada que hacer.
        echo  ========================================
        echo.
        pause
        exit /b 0
    ) else (
        echo  [!] Hay !AHEAD! commit(s) sin subir. Haciendo push...
        echo.
        goto :do_push
    )
)

:: Show changed files
echo  Archivos con cambios:
echo.
git status --short
echo.

:: ===================== STEP 3: Commit message =====================
echo  -- Paso 3: Mensaje de commit...
echo.

:: Detect what changed
set "commit_msg=update: actualizacion del proyecto"

git diff --name-only HEAD > "%temp%\af_files.txt" 2>nul
git diff --cached --name-only >> "%temp%\af_files.txt" 2>nul
git ls-files --others --exclude-standard >> "%temp%\af_files.txt" 2>nul

findstr /i "ChatScreen" "%temp%\af_files.txt" >nul 2>&1
if !errorlevel! equ 0 set "commit_msg=feat: mejoras en chat"

findstr /i "WorkScreen\|Bitacora" "%temp%\af_files.txt" >nul 2>&1
if !errorlevel! equ 0 set "commit_msg=feat: bitacora de obra"

findstr /i "DashboardScreen" "%temp%\af_files.txt" >nul 2>&1
if !errorlevel! equ 0 set "commit_msg=feat: mejoras en dashboard"

findstr /i "AppContext" "%temp%\af_files.txt" >nul 2>&1
if !errorlevel! equ 0 (
    echo  [!] AppContext detectado - verificacion de contexto
    set "commit_msg=feat: actualizacion de contexto de app"
)

findstr /i "auth\|login\|Auth\|Login" "%temp%\af_files.txt" >nul 2>&1
if !errorlevel! equ 0 set "commit_msg=fix: mejoras en autenticacion"

findstr /i "Sidebar\|layout\|Header" "%temp%\af_files.txt" >nul 2>&1
if !errorlevel! equ 0 set "commit_msg=feat: mejoras en layout"

findstr /i "globals.css\|tailwind\|style" "%temp%\af_files.txt" >nul 2>&1
if !errorlevel! equ 0 set "commit_msg=style: actualizacion de estilos"

del "%temp%\af_files.txt" >nul 2>&1

echo  Sugerencia: "!commit_msg!"
echo.
set /p "user_msg=  Escribe tu commit (Enter = usar sugerido): "
if not "!user_msg!"=="" set "commit_msg=!user_msg!"
echo.

:: ===================== STEP 4: Add + Commit =====================
echo  -- Paso 4: Agregando y confirmando cambios...
echo.

git add .
if !errorlevel! neq 0 (
    echo  [X] Error al agregar archivos.
    pause
    exit /b 1
)
echo  [OK] Archivos agregados.

git commit -m "!commit_msg!"
if !errorlevel! neq 0 (
    echo  [!] No se pudo crear el commit. Posiblemente no hay cambios nuevos.
    echo.
)
echo  [OK] Commit: "!commit_msg!"
echo.

:: ===================== STEP 5: Push =====================
:do_push
echo  -- Paso 5: Subiendo a GitHub (push)...
echo.

git push origin %BRANCH%
if !errorlevel! neq 0 (
    echo.
    echo  ========================================
    echo   [X] PUSH FALLIDO
    echo  ========================================
    echo.
    echo  El commit existe local pero NO llego a GitHub.
    echo.
    echo  Posibles causas:
    echo    - Permisos de Git insuficientes
    echo    - Necesitas configurar credenciales:
    echo      git config --global credential.helper manager
    echo    - Conexion a internet caida
    echo.
    echo  Intenta manualmente:
    echo    git push origin %BRANCH%
    echo.
    pause
    exit /b 1
)
echo  [OK] Push exitoso a GitHub
echo.

:: ===================== STEP 6: Verificar =====================
echo  -- Paso 6: Verificacion final...
echo.

git fetch origin %BRANCH% >nul 2>&1
for /f %%a in ('git rev-parse HEAD') do set "local_h=%%a"
for /f %%a in ('git rev-parse origin/%BRANCH% 2^>nul') do set "remote_h=%%a"

if "!local_h!"=="!remote_h!" (
    echo  ========================================
    echo   PUSH EXITOSO - TODO OK
    echo  ========================================
    echo.
    echo  Commit: !commit_msg!
    echo  Rama:   %BRANCH%
    echo  Hash:   !local_h:~0,7!
    echo  Vercel: Se desplegara en 1-2 minutos
    echo  Web:    https://archii-theta.vercel.app
    echo.
) else (
    echo  [!] ADVERTENCIA: Local y GitHub no coinciden.
    echo  Local:  !local_h:~0,7!
    echo  Remote: !remote_h:~0,7!
    echo.
    echo  Vuelve a ejecutar el script.
    echo.
)

pause
endlocal