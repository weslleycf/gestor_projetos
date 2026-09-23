# Verificacao completa do SGP: backend (checks + testes + smoke) e frontend (tipos + temas + build).
# Uso: .\verificar.ps1            (verificacao completa)
#      .\verificar.ps1 -Rapido    (pula testes unitarios e build)

[CmdletBinding()]
param(
    [switch]$Rapido
)

$ErrorActionPreference = "Continue"
$raiz = $PSScriptRoot
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$NL = [char]10

$falhas = New-Object System.Collections.Generic.List[string]

function Titulo {
    param([string]$Texto)
    Write-Host ""
    Write-Host "  $Texto" -ForegroundColor Cyan
    Write-Host "  $('-' * $Texto.Length)" -ForegroundColor DarkGray
}

function Resultado {
    param([string]$Nome, [bool]$Ok, [string]$Detalhe = "")
    if ($Ok) {
        Write-Host "  [ok]  $Nome" -ForegroundColor Green
    } else {
        Write-Host "  [X]   $Nome" -ForegroundColor Red
        if ($Detalhe) { Write-Host "        $Detalhe" -ForegroundColor DarkGray }
        $falhas.Add($Nome)
    }
}

function UltimasLinhas {
    param([string]$Texto, [int]$Quantidade = 1)
    return (($Texto -split $NL | Where-Object { $_.Trim() -ne "" } | Select-Object -Last $Quantidade) -join " ")
}

Write-Host ""
Write-Host "  SGP - Verificacao do projeto" -ForegroundColor White

# ------------------------------------------------------------------- backend
Titulo "Backend (Django)"
Push-Location (Join-Path $raiz "backend")

$check = python manage.py check 2>&1 | Out-String
Resultado "manage.py check" ($LASTEXITCODE -eq 0) (UltimasLinhas $check)

$migracoes = python manage.py makemigrations --check --dry-run 2>&1 | Out-String
Resultado "sem migracoes pendentes" ($LASTEXITCODE -eq 0) (UltimasLinhas $migracoes)

if (-not $Rapido) {
    $testes = python manage.py test apps 2>&1 | Out-String
    $resumoTestes = ($testes -split $NL | Where-Object { $_ -match "^Ran \d+ test|^OK|^FAILED" }) -join " | "
    Resultado "testes unitarios (todos os apps)" ($LASTEXITCODE -eq 0) $resumoTestes.Trim()
}

$smoke = python smoke_test.py 2>&1 | Out-String
$linhaSmoke = ($smoke -split $NL | Where-Object { $_ -match "ENDPOINTS OK|FALHAS" }) -join " | "
Resultado "smoke test da API" ($LASTEXITCODE -eq 0) $linhaSmoke.Trim()

# Central de ajuda: os arquivos de conteudo precisam ser validos e cobrir todas as telas
$ajuda = python manage.py carregar_ajuda --validar 2>&1 | Out-String
$linhaAjuda = ($ajuda -split $NL | Where-Object { $_ -match "guia\(s\) valido|problema" }) -join " | "
Resultado "guias da central de ajuda" ($LASTEXITCODE -eq 0) $linhaAjuda.Trim()

Pop-Location

# ------------------------------------------------------------------ frontend
Titulo "Frontend (React + TypeScript)"
Push-Location (Join-Path $raiz "frontend")

$tipos = npx tsc --noEmit -p tsconfig.json 2>&1 | Out-String
$errosTipo = @($tipos -split $NL | Where-Object { $_ -match "error TS" })
Resultado "verificacao de tipos (tsc)" ($errosTipo.Count -eq 0) "$($errosTipo.Count) erro(s) de tipo"
if ($errosTipo.Count -gt 0) {
    $errosTipo | Select-Object -First 12 | ForEach-Object { Write-Host "        $_" -ForegroundColor DarkGray }
}

# Temas: contraste WCAG e integridade dos tokens
npx esbuild verificar-temas.ts --bundle --platform=node --format=esm --outfile=.tmp-verificar-temas.mjs --log-level=error 2>&1 | Out-Null
$temas = node .tmp-verificar-temas.mjs 2>&1 | Out-String
$codigoTemas = $LASTEXITCODE
Remove-Item -ErrorAction SilentlyContinue .tmp-verificar-temas.mjs
$resumoTemas = ($temas -split $NL | Where-Object { $_ -match "TODOS OS TEMAS|FALHA|Total de temas" }) -join " | "
Resultado "temas e contraste WCAG" ($codigoTemas -eq 0) $resumoTemas.Trim()

if (-not $Rapido) {
    $build = npm run build 2>&1 | Out-String
    Resultado "build de producao (vite)" ($LASTEXITCODE -eq 0) (UltimasLinhas $build 2)
}

Pop-Location

# -------------------------------------------------------------------- resumo
Write-Host ""
Write-Host "  $('=' * 58)" -ForegroundColor DarkGray
if ($falhas.Count -eq 0) {
    Write-Host "  TUDO OK - o projeto esta consistente." -ForegroundColor Green
} else {
    Write-Host "  $($falhas.Count) verificacao(oes) falharam:" -ForegroundColor Red
    $falhas | ForEach-Object { Write-Host "    - $_" -ForegroundColor Red }
}
Write-Host "  $('=' * 58)" -ForegroundColor DarkGray
Write-Host ""

exit $(if ($falhas.Count -eq 0) { 0 } else { 1 })
