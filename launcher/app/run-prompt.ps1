[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$JobPath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$modulePath = Join-Path $PSScriptRoot 'QueueCore.psm1'
Import-Module $modulePath -Force

if (-not (Test-Path -LiteralPath $JobPath -PathType Leaf)) {
    Write-Host "The launcher job file was not found: $JobPath" -ForegroundColor Red
    return
}

$job = $null
$agyWasStarted = $false

try {
    $utf8 = New-Object System.Text.UTF8Encoding($false)
    $job = [System.IO.File]::ReadAllText($JobPath, $utf8) | ConvertFrom-Json -ErrorAction Stop
    foreach ($requiredName in @('id', 'text', 'workingDirectory', 'agyPath')) {
        $property = $job.PSObject.Properties | Where-Object { $_.Name -ieq $requiredName } | Select-Object -First 1
        if ($null -eq $property -or [string]::IsNullOrWhiteSpace([string]$property.Value)) {
            throw "The launcher job is missing '$requiredName'."
        }
    }

    if (-not (Test-Path -LiteralPath $job.workingDirectory -PathType Container)) {
        throw "The Antigravity working folder no longer exists: $($job.workingDirectory)"
    }
    if (-not (Test-Path -LiteralPath $job.agyPath -PathType Leaf)) {
        throw "Antigravity CLI was not found at: $($job.agyPath)"
    }

    $creditGuard = Test-AgyCreditGuard
    if (-not $creditGuard.Allowed) {
        throw $creditGuard.Message
    }

    Set-Location -LiteralPath $job.workingDirectory
    Write-Host 'Antigravity Queue Launcher' -ForegroundColor Cyan
    Write-Host $creditGuard.Message -ForegroundColor Green
    Write-Host "Starting a fresh conversation for queue entry $($job.id)..." -ForegroundColor Cyan
    Write-Host ''

    $agyPath = [string]$job.agyPath
    $promptText = [string]$job.text

    $autoClose = $false
    $autoCloseProperty = $job.PSObject.Properties | Where-Object { $_.Name -ieq 'autoCloseOnSuccess' } | Select-Object -First 1
    if ($null -ne $autoCloseProperty) {
        try {
            $autoClose = [bool]$autoCloseProperty.Value
        }
        catch {
            $autoClose = $false
        }
    }

    $mode = 'interactive'
    $modeProperty = $job.PSObject.Properties | Where-Object { $_.Name -ieq 'mode' } | Select-Object -First 1
    if ($null -ne $modeProperty -and [string]$modeProperty.Value -ieq 'print') {
        $mode = 'print'
    }

    $printTimeoutMinutes = 10
    $timeoutProperty = $job.PSObject.Properties | Where-Object { $_.Name -ieq 'printTimeoutMinutes' } | Select-Object -First 1
    if ($null -ne $timeoutProperty) {
        try {
            $printTimeoutMinutes = [int]$timeoutProperty.Value
        }
        catch {
            $printTimeoutMinutes = 10
        }
    }
    if ($printTimeoutMinutes -lt 1 -or $printTimeoutMinutes -gt 720) {
        $printTimeoutMinutes = 10
    }

    if ($mode -eq 'print') {
        Write-Host "Running the prompt non-interactively (print mode, $printTimeoutMinutes minute timeout). Antigravity exits by itself when the task completes." -ForegroundColor Cyan
        Write-Host ''
    }

    # Build the command line explicitly. Plain PowerShell 5.1 argument passing does
    # not escape embedded double quotes, which corrupts the prompt and can even
    # splice extra arguments out of the message text.
    if ($mode -eq 'print') {
        # Print mode does not adopt the current directory as the workspace, so
        # declare it explicitly - otherwise file writes land in agy's own
        # scratch folder while the conversation still reports success.
        $modelArgument = ''
        $modelProperty = $job.PSObject.Properties | Where-Object { $_.Name -ieq 'model' } | Select-Object -First 1
        if ($null -ne $modelProperty -and -not [string]::IsNullOrWhiteSpace([string]$modelProperty.Value)) {
            $modelArgument = '--model ' + (ConvertTo-NativeArgument -Value (([string]$modelProperty.Value).Trim())) + ' '
        }

        $agyArguments = $modelArgument + '--add-dir ' + (ConvertTo-NativeArgument -Value ([string]$job.workingDirectory)) +
            " --print-timeout ${printTimeoutMinutes}m --prompt " + (ConvertTo-NativeArgument -Value $promptText)

        $dataDirectory = Split-Path -Parent (Split-Path -Parent $JobPath)
        $logDirectory = Join-Path $dataDirectory 'logs'
        New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null
        $logPath = Join-Path $logDirectory ("$($job.id).log")
        $stdoutPath = Join-Path $logDirectory ("$($job.id).out.tmp")
        $stderrPath = Join-Path $logDirectory ("$($job.id).err.tmp")

        $agyWasStarted = $true
        $agyProcess = Start-Process -FilePath $agyPath -ArgumentList $agyArguments -WorkingDirectory ([string]$job.workingDirectory) -NoNewWindow -PassThru -RedirectStandardOutput $stdoutPath -RedirectStandardError $stderrPath
        # Cache the process handle; without this, ExitCode from a Start-Process
        # object is null after the process exits (Windows PowerShell quirk).
        $null = $agyProcess.Handle

        # The prompt is now in Antigravity's hands, so the job file has served its
        # recovery purpose. The .done marker written after exit tells the launcher
        # how the conversation ended, even if this process is killed by hand.
        Remove-Item -LiteralPath $JobPath -Force -ErrorAction SilentlyContinue

        $agyProcess.WaitForExit()
        $agyExitCode = $agyProcess.ExitCode
        if ($null -eq $agyExitCode) {
            $agyExitCode = 0
        }

        $utf8Reader = New-Object System.Text.UTF8Encoding($false)
        $logPieces = New-Object System.Collections.Generic.List[string]
        $logPieces.Add("=== Queue entry $($job.id) | print mode | timeout ${printTimeoutMinutes}m | finished $([DateTimeOffset]::Now.ToString('o')) ===")
        if (Test-Path -LiteralPath $stdoutPath) {
            $stdoutText = [System.IO.File]::ReadAllText($stdoutPath, $utf8Reader)
            $logPieces.Add($stdoutText.TrimEnd())
        }
        if (Test-Path -LiteralPath $stderrPath) {
            $stderrText = [System.IO.File]::ReadAllText($stderrPath, $utf8Reader)
            if (-not [string]::IsNullOrWhiteSpace($stderrText)) {
                $logPieces.Add('=== stderr ===')
                $logPieces.Add($stderrText.TrimEnd())
            }
        }
        $logPieces.Add("=== exit code $agyExitCode ===")
        Write-Utf8FileAtomic -Path $logPath -Content (($logPieces -join [Environment]::NewLine) + [Environment]::NewLine)
        Remove-Item -LiteralPath $stdoutPath, $stderrPath -Force -ErrorAction SilentlyContinue

        Write-Host "The reply was saved to $logPath" -ForegroundColor Cyan
    }
    else {
        $startInfo = New-Object System.Diagnostics.ProcessStartInfo
        $startInfo.FileName = $agyPath
        $startInfo.Arguments = '--prompt-interactive ' + (ConvertTo-NativeArgument -Value $promptText)
        $startInfo.WorkingDirectory = [string]$job.workingDirectory
        $startInfo.UseShellExecute = $false

        $agyWasStarted = $true
        $agyProcess = [System.Diagnostics.Process]::Start($startInfo)

        # The prompt is now in Antigravity's hands, so the job file has served its
        # recovery purpose. The .done marker written after exit tells the launcher
        # how the conversation ended, even if this window is closed by hand.
        Remove-Item -LiteralPath $JobPath -Force -ErrorAction SilentlyContinue

        $agyProcess.WaitForExit()
        $agyExitCode = $agyProcess.ExitCode
    }

    $markerPath = [System.IO.Path]::ChangeExtension($JobPath, '.done')
    try {
        Write-Utf8FileAtomic -Path $markerPath -Content ([string]$agyExitCode)
    }
    catch {
    }

    Write-Host ''
    if ($agyExitCode -eq 0) {
        Write-Host 'Antigravity exited normally.' -ForegroundColor Green
        if ($autoClose) {
            Write-Host 'Auto-send: closing this window.' -ForegroundColor Cyan
            [Environment]::Exit(0)
        }
    }
    else {
        Write-Host "Antigravity exited with code $agyExitCode. Use Undo last in the queue launcher if the prompt was not accepted." -ForegroundColor Yellow
    }
}
catch {
    Write-Host ''
    Write-Host 'The queued message was not started.' -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ''
    Write-Host 'Use Undo last in the queue launcher to return it to the pending queue.' -ForegroundColor Yellow
}
finally {
    if ($agyWasStarted -and (Test-Path -LiteralPath $JobPath)) {
        Remove-Item -LiteralPath $JobPath -Force -ErrorAction SilentlyContinue
    }
}
