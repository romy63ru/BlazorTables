#!/usr/bin/env pwsh

param(
    [ValidateSet("http", "https")]
    [string]$Profile = "http",
    [switch]$NoBuild
)

$ErrorActionPreference = "Stop"

$projectPath = Join-Path $PSScriptRoot "BlazorTables.csproj"
if (-not (Test-Path $projectPath)) {
    throw "Project file not found: $projectPath"
}

$url = if ($Profile -eq "https") { "https://localhost:7266" } else { "http://localhost:5088" }
$uri = [System.Uri]$url

$openBrowserJob = Start-Job -ScriptBlock {
    param($hostName, $port, $targetUrl, $platformWin, $platformMac, $platformLinux)

    $deadline = (Get-Date).AddSeconds(60)
    $connected = $false

    while ((Get-Date) -lt $deadline -and -not $connected) {
        $client = [System.Net.Sockets.TcpClient]::new()
        try {
            $async = $client.BeginConnect($hostName, $port, $null, $null)
            $connected = $async.AsyncWaitHandle.WaitOne(500) -and $client.Connected
            if ($connected) {
                $client.EndConnect($async)
            }
        }
        catch {
            $connected = $false
        }
        finally {
            $client.Dispose()
        }

        if (-not $connected) {
            Start-Sleep -Milliseconds 300
        }
    }

    if (-not $connected) {
        return
    }

    if ($platformWin) {
        Start-Process $targetUrl | Out-Null
        return
    }

    if ($platformMac) {
        Start-Process "open" -ArgumentList $targetUrl | Out-Null
        return
    }

    if ($platformLinux) {
        Start-Process "xdg-open" -ArgumentList $targetUrl | Out-Null
    }
} -ArgumentList $uri.Host, $uri.Port, $url, $IsWindows, $IsMacOS, $IsLinux

$dotnetArgs = @(
    "run",
    "--project", $projectPath,
    "--launch-profile", $Profile
)

if ($NoBuild) {
    $dotnetArgs += "--no-build"
}

try {
    & dotnet @dotnetArgs
}
finally {
    if ($openBrowserJob) {
        Receive-Job -Job $openBrowserJob -Wait -AutoRemoveJob | Out-Null
    }
}
