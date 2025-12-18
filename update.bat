@echo off
title Atualizador de Extensao Twitch
echo ============================================
echo   ENVIANDO ATUALIZACAO PARA GITHUB PAGES
echo ============================================
echo.

:: Verifica se o Git esta instalado
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRO] Git nao encontrado. Instale o Git para usar este script.
    pause
    exit
)

:: Executa os comandos de deploy
echo [+] Adicionando arquivos...
git add .

echo [+] Criando commit de ajuste...
git commit -m "Ajuste de design e interface: %date% %time%"

echo [+] Enviando para o GitHub (Main)...
git push origin main

echo.
echo ============================================
echo   SUCESSO! 
echo   Aguarde cerca de 1 minuto para o cache 
echo   do GitHub Pages atualizar na Twitch.
echo ============================================
pause