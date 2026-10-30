@echo off
rem Starter ElektroStudio lokalt og åpner nettsiden i nettleseren.
rem La dette vinduet stå åpent mens du bruker programmet. Lukk det for å stoppe.
title ElektroStudio
cd /d "%~dp0"
set "PATH=C:\Program Files\nodejs;%PATH%"
if not exist node_modules (
  echo Installerer avhengigheter forste gang ...
  call npm install
)
call npm run dev -- --open
