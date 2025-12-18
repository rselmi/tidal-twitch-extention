@echo off
title Atualizador de Extensao Twitch - Fix Branch
echo ============================================
echo   INICIANDO PROCESSO DE ATUALIZACAO
echo ============================================
echo.

:: 1. Verificar se o Git funciona
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRO] O Git nao esta instalado ou nao esta no PATH.
    pause
    exit
)

:: 2. CORREÇÃO DE BRANCH
echo [+] Corrigindo estado do Git...
git checkout -B main
git branch -u origin/main >nul 2>&1

:: 3. Sincronizar (Apenas busca, sem apagar o que voce fez agora)
echo [+] Sincronizando com o servidor...
git fetch origin main

:: 4. Adicionar seus arquivos atuais
echo [+] Preparando arquivos para envio...
git add .

:: 5. Criar o commit local
echo [+] Criando registro de alteracoes...
git commit -m "Auto-update: %date% %time%"

:: 6. Enviar forçado (Isso resolve o conflito e faz o Action disparar)
echo [+] Enviando para o GitHub...
git push origin main --force

echo.
echo ============================================
echo   PROCESSO CONCLUIDO!
echo   Aguarde 1 minuto e verifique a aba ACTIONS.
echo ============================================
echo.
pause