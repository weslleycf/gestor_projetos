# Sobe o backend Django e o frontend Vite do SGP.
# Uso:  .\iniciar.ps1
#       .\iniciar.ps1 -SemSeed      (nao popula dados de demonstracao)
#       .\iniciar.ps1 -SemFrontend  (apenas a API)
#
# Se a porta 8000 ja estiver ocupada por outro projeto, escolha outra:
#       .\iniciar.ps1 -PortaApi 8010
# A mesma porta e repassada ao proxy da interface, entao os dois ficam juntos.

[CmdletBinding()]
param(
    [switch]$SemSeed,
    [switch]$SemFrontend,
    [int]$PortaApi = $(if ($env:SGP_API_PORT) { [int]$env:SGP_API_PORT } else { 8000 }),
    [int]$PortaWeb = 5173
)

# O vite.config.ts le esta variavel para apontar o proxy /api para a porta certa.
$env:SGP_API_PORT = [string]$PortaApi

$ErrorActionPreference = "Stop"
$raiz = $PSScriptRoot
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host ""
Write-Host "  SGP - Sistema de Gestao de Projetos, Portfolio e Capacidades" -ForegroundColor Cyan
Write-Host "  ------------------------------------------------------------" -ForegroundColor DarkGray

function Testar-Porta {
    param([int]$Porta)
    try {
        $conexao = Get-NetTCPConnection -LocalPort $Porta -State Listen -ErrorAction Stop
        return $null -ne $conexao
    } catch {
        return $false
    }
}

# ------------------------------------------------------------------- backend
if (Testar-Porta -Porta $PortaApi) {
    Write-Host "  [ok]  A API ja esta respondendo na porta $PortaApi" -ForegroundColor Green
} else {
    Write-Host "  [..]  Preparando o backend..." -ForegroundColor Yellow
    $pastaBackend = Join-Path $raiz "backend"
    Push-Location $pastaBackend

    if (-not (Test-Path "db.sqlite3")) {
        Write-Host "  [..]  Aplicando migracoes..." -ForegroundColor DarkGray
        python manage.py migrate | Out-Null
        if (-not $SemSeed) {
            Write-Host "  [..]  Populando dados de demonstracao (pode levar 1-2 minutos)..." -ForegroundColor DarkGray
            python manage.py seed_sgp
        }
    }

    # A central de ajuda e conteudo versionado: sempre recarregada para refletir
    # a versao atual dos guias.
    Write-Host "  [..]  Carregando a central de ajuda..." -ForegroundColor DarkGray
    python manage.py carregar_ajuda | Out-Null

    Write-Host "  [..]  Iniciando a API em http://127.0.0.1:$PortaApi ..." -ForegroundColor DarkGray
    $argumentos = @("manage.py", "runserver", "127.0.0.1:$PortaApi")
    $backend = Start-Process -FilePath "python" -ArgumentList $argumentos -WorkingDirectory $pastaBackend -PassThru -WindowStyle Minimized
    Pop-Location

    $pronto = $false
    for ($i = 0; $i -lt 40; $i++) {
        Start-Sleep -Milliseconds 500
        try {
            $resposta = Invoke-WebRequest -Uri "http://127.0.0.1:$PortaApi/api/v1/health/" -UseBasicParsing -TimeoutSec 3
            if ($resposta.StatusCode -eq 200) { $pronto = $true; break }
        } catch { }
    }

    if ($pronto) {
        Write-Host "  [ok]  API em execucao (PID $($backend.Id))" -ForegroundColor Green
    } else {
        Write-Host "  [!]   A API nao respondeu ao healthcheck. Verifique a janela minimizada." -ForegroundColor Red
    }
    Write-Host "  [ok]  Documentacao navegavel: http://127.0.0.1:$PortaApi/api/v1/" -ForegroundColor Green
    Write-Host "  [ok]  Django admin: http://127.0.0.1:$PortaApi/admin/" -ForegroundColor Green
}

# ------------------------------------------------------------------ frontend
if (-not $SemFrontend) {
    if (Testar-Porta -Porta $PortaWeb) {
        Write-Host "  [ok]  A interface ja esta respondendo na porta $PortaWeb" -ForegroundColor Green
    } else {
        $pastaFrontend = Join-Path $raiz "frontend"
        Push-Location $pastaFrontend
        if (-not (Test-Path "node_modules")) {
            Write-Host "  [..]  Instalando dependencias do frontend..." -ForegroundColor DarkGray
            npm install --no-audit --no-fund
        }
        Write-Host "  [..]  Iniciando a interface..." -ForegroundColor DarkGray
        $argumentosNpm = @("run", "dev")
        Start-Process -FilePath "npm" -ArgumentList $argumentosNpm -WorkingDirectory $pastaFrontend -WindowStyle Minimized
        Pop-Location
        Start-Sleep -Seconds 5
        Write-Host "  [ok]  Interface: http://localhost:$PortaWeb" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "  Contas de demonstracao (senha: sgp123456)" -ForegroundColor Cyan
Write-Host "    admin@empresa.com.br              Administrador" -ForegroundColor Gray
Write-Host "    helena.marques@empresa.com.br     Executiva" -ForegroundColor Gray
Write-Host "    ricardo.tavares@empresa.com.br    PMO" -ForegroundColor Gray
Write-Host "    bruno.carvalho@empresa.com.br     Gerente de Projetos" -ForegroundColor Gray
Write-Host "    ana.cunha@empresa.com.br          Membro de Equipe" -ForegroundColor Gray
Write-Host ""
Write-Host "  Para encerrar: feche as janelas minimizadas ou rode" -ForegroundColor DarkGray
Write-Host "    Get-Process python,node | Stop-Process" -ForegroundColor DarkGray
Write-Host ""
