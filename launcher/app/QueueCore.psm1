Set-StrictMode -Version Latest

function Write-Utf8FileAtomic {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path,

        [Parameter(Mandatory = $true)]
        [AllowEmptyString()]
        [string]$Content
    )

    $directory = Split-Path -Parent $Path
    if (-not (Test-Path -LiteralPath $directory -PathType Container)) {
        New-Item -ItemType Directory -Path $directory -Force | Out-Null
    }

    $temporaryPath = "$Path.tmp.$PID.$([guid]::NewGuid().ToString('N'))"
    $encoding = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($temporaryPath, $Content, $encoding)

    try {
        Move-Item -LiteralPath $temporaryPath -Destination $Path -Force
    }
    finally {
        if (Test-Path -LiteralPath $temporaryPath) {
            Remove-Item -LiteralPath $temporaryPath -Force -ErrorAction SilentlyContinue
        }
    }
}

function Initialize-LauncherData {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$DataDirectory
    )

    $inflightDirectory = Join-Path $DataDirectory 'inflight'
    New-Item -ItemType Directory -Path $DataDirectory -Force | Out-Null
    New-Item -ItemType Directory -Path $inflightDirectory -Force | Out-Null

    $queuePath = Join-Path $DataDirectory 'queue.json'
    $settingsPath = Join-Path $DataDirectory 'settings.json'
    $sentPath = Join-Path $DataDirectory 'sent.jsonl'

    if (-not (Test-Path -LiteralPath $queuePath)) {
        Save-QueueEntries -Path $queuePath -Entries @()
    }

    if (-not (Test-Path -LiteralPath $settingsPath)) {
        $settings = [pscustomobject]@{
            version = 1
            workingDirectory = ''
            delimiter = '---NEXT---'
            maxPromptCharacters = 20000
        }
        Write-Utf8FileAtomic -Path $settingsPath -Content ($settings | ConvertTo-Json -Depth 5)
    }

    if (-not (Test-Path -LiteralPath $sentPath)) {
        Write-Utf8FileAtomic -Path $sentPath -Content ''
    }

    return [pscustomobject]@{
        QueuePath = $queuePath
        SettingsPath = $settingsPath
        SentPath = $sentPath
        InflightDirectory = $inflightDirectory
    }
}

function Get-QueueEntries {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    if (-not (Test-Path -LiteralPath $Path)) {
        return
    }

    $utf8 = New-Object System.Text.UTF8Encoding($false)
    $raw = [System.IO.File]::ReadAllText($Path, $utf8)
    if ([string]::IsNullOrWhiteSpace($raw)) {
        return
    }

    $document = $raw | ConvertFrom-Json -ErrorAction Stop
    if ($null -eq $document.entries) {
        throw "Queue file does not contain an entries collection: $Path"
    }

    foreach ($entry in @($document.entries)) {
        if ($null -eq $entry) {
            continue
        }
        if ($null -eq $entry.id -or [string]::IsNullOrWhiteSpace([string]$entry.id)) {
            throw 'A queue entry is missing its id.'
        }
        if ($null -eq $entry.text -or [string]::IsNullOrWhiteSpace([string]$entry.text)) {
            throw "Queue entry '$($entry.id)' has no message text."
        }
        $entry
    }
}

function Save-QueueEntries {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path,

        [Parameter(Mandatory = $true)]
        [AllowEmptyCollection()]
        [object[]]$Entries
    )

    $document = [ordered]@{
        version = 1
        entries = @($Entries)
    }
    $json = $document | ConvertTo-Json -Depth 10
    Write-Utf8FileAtomic -Path $Path -Content $json
}

function New-QueueEntry {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$Text
    )

    if ([string]::IsNullOrWhiteSpace($Text)) {
        throw 'Message text cannot be empty.'
    }

    return [pscustomobject][ordered]@{
        id = [guid]::NewGuid().ToString('N')
        text = $Text
        addedAt = [DateTimeOffset]::Now.ToString('o')
    }
}

function ConvertFrom-BulkPromptText {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$Text,

        [Parameter(Mandatory = $true)]
        [AllowEmptyString()]
        [string]$Delimiter
    )

    if ([string]::IsNullOrWhiteSpace($Text)) {
        throw 'Nothing was entered to import.'
    }

    $normalized = $Text.Replace("`r`n", "`n").Replace("`r", "`n")
    if ([string]::IsNullOrEmpty($Delimiter)) {
        $parts = @($normalized)
    }
    else {
        $parts = [regex]::Split($normalized, [regex]::Escape($Delimiter))
    }

    foreach ($part in $parts) {
        $message = $part.Trim([char[]]"`r`n")
        if (-not [string]::IsNullOrWhiteSpace($message)) {
            $message
        }
    }
}

function Add-SentRecord {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path,

        [Parameter(Mandatory = $true)]
        [object]$Entry,

        [Parameter(Mandatory = $true)]
        [string]$WorkingDirectory,

        [Parameter(Mandatory = $true)]
        [int]$ProcessId
    )

    $record = [ordered]@{
        status = 'launched'
        launchedAt = [DateTimeOffset]::Now.ToString('o')
        processId = $ProcessId
        workingDirectory = $WorkingDirectory
        entry = $Entry
    }
    $jsonLine = ($record | ConvertTo-Json -Depth 10 -Compress) + [Environment]::NewLine
    $encoding = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::AppendAllText($Path, $jsonLine, $encoding)
}

function Undo-LastSentEntry {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$QueuePath,

        [Parameter(Mandatory = $true)]
        [string]$SentPath
    )

    if (-not (Test-Path -LiteralPath $SentPath)) {
        return [pscustomobject]@{ Restored = $false; Message = 'There is no sent history to undo.' }
    }

    $lines = [System.Collections.Generic.List[string]]::new()
    $utf8 = New-Object System.Text.UTF8Encoding($false)
    foreach ($line in [System.IO.File]::ReadAllLines($SentPath, $utf8)) {
        $lines.Add($line)
    }

    $lastIndex = -1
    for ($index = $lines.Count - 1; $index -ge 0; $index--) {
        if (-not [string]::IsNullOrWhiteSpace($lines[$index])) {
            $lastIndex = $index
            break
        }
    }

    if ($lastIndex -lt 0) {
        return [pscustomobject]@{ Restored = $false; Message = 'There is no sent history to undo.' }
    }

    $record = $lines[$lastIndex] | ConvertFrom-Json -ErrorAction Stop
    if ($null -eq $record.entry -or [string]::IsNullOrWhiteSpace([string]$record.entry.id)) {
        throw 'The last sent-history record is invalid and cannot be restored.'
    }

    $currentEntries = @(Get-QueueEntries -Path $QueuePath)
    if (@($currentEntries | Where-Object { [string]$_.id -eq [string]$record.entry.id }).Count -gt 0) {
        throw 'The last sent entry is already present in the queue.'
    }

    $restoredEntries = @($record.entry) + $currentEntries
    Save-QueueEntries -Path $QueuePath -Entries $restoredEntries

    $lines.RemoveAt($lastIndex)
    $remainingText = ''
    if ($lines.Count -gt 0) {
        $remainingText = ($lines -join [Environment]::NewLine)
        if (-not [string]::IsNullOrEmpty($remainingText)) {
            $remainingText += [Environment]::NewLine
        }
    }
    Write-Utf8FileAtomic -Path $SentPath -Content $remainingText

    return [pscustomobject]@{
        Restored = $true
        Message = 'The last launched message was returned to the front of the queue.'
        Entry = $record.entry
    }
}

function Get-NamedProperty {
    param(
        [Parameter(Mandatory = $true)]
        [object]$InputObject,

        [Parameter(Mandatory = $true)]
        [string]$Name
    )

    $property = $InputObject.PSObject.Properties | Where-Object { $_.Name -ieq $Name } | Select-Object -First 1
    if ($null -eq $property) {
        return [pscustomobject]@{ Found = $false; Value = $null }
    }
    return [pscustomobject]@{ Found = $true; Value = $property.Value }
}

function ConvertTo-CreditBoolean {
    param([object]$Value)

    if ($Value -is [bool]) {
        return [pscustomobject]@{ Known = $true; Value = [bool]$Value }
    }

    $text = [string]$Value
    if ($text -ieq 'true') {
        return [pscustomobject]@{ Known = $true; Value = $true }
    }
    if ($text -ieq 'false') {
        return [pscustomobject]@{ Known = $true; Value = $false }
    }
    return [pscustomobject]@{ Known = $false; Value = $null }
}

function Test-AgyCreditGuard {
    [CmdletBinding()]
    param(
        [string]$UserProfile = $env:USERPROFILE
    )

    $recognizedValues = New-Object System.Collections.Generic.List[object]
    $problems = New-Object System.Collections.Generic.List[string]

    $globalConfigPath = Join-Path $UserProfile '.gemini\config\config.json'
    if (Test-Path -LiteralPath $globalConfigPath) {
        try {
            $globalConfig = Get-Content -LiteralPath $globalConfigPath -Raw | ConvertFrom-Json -ErrorAction Stop
            $userSettingsProperty = Get-NamedProperty -InputObject $globalConfig -Name 'userSettings'
            if ($userSettingsProperty.Found -and $null -ne $userSettingsProperty.Value) {
                $creditProperty = Get-NamedProperty -InputObject $userSettingsProperty.Value -Name 'useAiCredits'
                if ($creditProperty.Found) {
                    $converted = ConvertTo-CreditBoolean -Value $creditProperty.Value
                    if ($converted.Known) {
                        $recognizedValues.Add([pscustomobject]@{
                            Name = 'userSettings.useAiCredits'
                            Value = $converted.Value
                            Path = $globalConfigPath
                        })
                    }
                    else {
                        $problems.Add('The Antigravity useAiCredits value is not a recognized boolean.')
                    }
                }
            }
        }
        catch {
            $problems.Add("The Antigravity global configuration could not be read: $($_.Exception.Message)")
        }
    }

    $cliSettingsPath = Join-Path $UserProfile '.gemini\antigravity-cli\settings.json'
    if (Test-Path -LiteralPath $cliSettingsPath) {
        try {
            $cliSettings = Get-Content -LiteralPath $cliSettingsPath -Raw | ConvertFrom-Json -ErrorAction Stop
            $creditProperty = Get-NamedProperty -InputObject $cliSettings -Name 'useG1Credits'
            if ($creditProperty.Found) {
                $converted = ConvertTo-CreditBoolean -Value $creditProperty.Value
                if ($converted.Known) {
                    $recognizedValues.Add([pscustomobject]@{
                        Name = 'useG1Credits'
                        Value = $converted.Value
                        Path = $cliSettingsPath
                    })
                }
                else {
                    $problems.Add('The Antigravity CLI useG1Credits value is not a recognized boolean.')
                }
            }
        }
        catch {
            $problems.Add("The Antigravity CLI settings could not be read: $($_.Exception.Message)")
        }
    }

    if ($problems.Count -gt 0) {
        return [pscustomobject]@{
            Allowed = $false
            Message = $problems[0]
            Sources = $recognizedValues.ToArray()
        }
    }

    $enabled = @($recognizedValues | Where-Object { $_.Value -eq $true })
    if ($enabled.Count -gt 0) {
        return [pscustomobject]@{
            Allowed = $false
            Message = "Blocked: AI-credit overages are enabled by $($enabled[0].Name)."
            Sources = $recognizedValues.ToArray()
        }
    }

    $disabled = @($recognizedValues | Where-Object { $_.Value -eq $false })
    if ($disabled.Count -eq 0) {
        return [pscustomobject]@{
            Allowed = $false
            Message = 'Blocked: no explicit disabled AI-credit setting was found.'
            Sources = @()
        }
    }

    return [pscustomobject]@{
        Allowed = $true
        Message = "Protected: AI-credit overages are explicitly disabled by $($disabled[0].Name)."
        Sources = $recognizedValues.ToArray()
    }
}

function Get-AgyExecutable {
    [CmdletBinding()]
    param()

    $installedPath = Join-Path $env:LOCALAPPDATA 'agy\bin\agy.exe'
    if (Test-Path -LiteralPath $installedPath -PathType Leaf) {
        return $installedPath
    }

    $command = Get-Command agy.exe -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($null -ne $command -and -not [string]::IsNullOrWhiteSpace([string]$command.Source)) {
        return [string]$command.Source
    }

    return $null
}

function ConvertTo-NativeArgument {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [AllowEmptyString()]
        [string]$Value
    )

    # Quote for the CommandLineToArgvW rules native executables use: backslashes
    # immediately before a double quote are doubled and the quote is escaped, and
    # trailing backslashes are doubled so the closing quote survives.
    $escaped = $Value -replace '(\\*)"', '$1$1\"'
    $escaped = $escaped -replace '(\\+)$', '$1$1'
    return '"' + $escaped + '"'
}

function Backup-QueueFile {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$QueuePath,

        [Parameter(Mandatory = $true)]
        [string]$BackupDirectory,

        [string]$Reason = 'manual',

        [switch]$Force,

        [int]$KeepCount = 30,

        [int]$ThrottleMinutes = 10
    )

    if (-not (Test-Path -LiteralPath $QueuePath -PathType Leaf)) {
        return $null
    }

    New-Item -ItemType Directory -Path $BackupDirectory -Force | Out-Null
    $existing = @(Get-ChildItem -LiteralPath $BackupDirectory -File -Filter 'backup.*.json' |
        Sort-Object LastWriteTimeUtc -Descending)

    if (-not $Force -and $existing.Count -gt 0) {
        $newestAge = [DateTimeOffset]::UtcNow - [DateTimeOffset]$existing[0].LastWriteTimeUtc
        if ($newestAge.TotalMinutes -lt $ThrottleMinutes) {
            return $null
        }
    }

    $safeReason = ($Reason -replace '[^a-zA-Z0-9-]', '-')
    if ([string]::IsNullOrWhiteSpace($safeReason)) {
        $safeReason = 'manual'
    }
    $stamp = [DateTimeOffset]::Now.ToString('yyyyMMdd-HHmmss-fff')
    $destination = Join-Path $BackupDirectory "backup.$stamp.$safeReason.json"
    Copy-Item -LiteralPath $QueuePath -Destination $destination -Force

    $all = @(Get-ChildItem -LiteralPath $BackupDirectory -File -Filter 'backup.*.json' |
        Sort-Object LastWriteTimeUtc -Descending)
    if ($all.Count -gt $KeepCount) {
        foreach ($old in ($all | Select-Object -Skip $KeepCount)) {
            Remove-Item -LiteralPath $old.FullName -Force -ErrorAction SilentlyContinue
        }
    }

    return $destination
}

function Repair-QueueFile {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$QueuePath,

        [Parameter(Mandatory = $true)]
        [string]$QuarantineDirectory
    )

    if (-not (Test-Path -LiteralPath $QueuePath -PathType Leaf)) {
        return [pscustomobject]@{ Repaired = $false; Message = 'The queue file does not exist.'; KeptCount = 0; QuarantinedCount = 0; QuarantinePath = $null }
    }

    $utf8 = New-Object System.Text.UTF8Encoding($false)
    $raw = [System.IO.File]::ReadAllText($QueuePath, $utf8)

    $document = $null
    if (-not [string]::IsNullOrWhiteSpace($raw)) {
        try {
            $document = $raw | ConvertFrom-Json -ErrorAction Stop
        }
        catch {
            return [pscustomobject]@{
                Repaired = $false
                Message = "The queue file is not valid JSON, so it cannot be repaired automatically. Restore a copy from the data\backups folder instead. ($($_.Exception.Message))"
                KeptCount = 0
                QuarantinedCount = 0
                QuarantinePath = $null
            }
        }
    }

    $candidates = @()
    if ($null -ne $document) {
        $entriesProperty = Get-NamedProperty -InputObject $document -Name 'entries'
        if ($entriesProperty.Found -and $null -ne $entriesProperty.Value) {
            $candidates = @($entriesProperty.Value)
        }
    }

    $valid = New-Object System.Collections.Generic.List[object]
    $invalid = New-Object System.Collections.Generic.List[object]
    $seenIds = New-Object 'System.Collections.Generic.HashSet[string]'

    foreach ($entry in $candidates) {
        if ($null -eq $entry) {
            continue
        }
        $idProperty = Get-NamedProperty -InputObject $entry -Name 'id'
        $textProperty = Get-NamedProperty -InputObject $entry -Name 'text'
        $id = if ($idProperty.Found) { [string]$idProperty.Value } else { '' }
        $text = if ($textProperty.Found) { [string]$textProperty.Value } else { '' }

        if ([string]::IsNullOrWhiteSpace($text)) {
            $invalid.Add($entry)
            continue
        }
        if ([string]::IsNullOrWhiteSpace($id)) {
            $valid.Add((New-QueueEntry -Text $text))
            continue
        }
        if (-not $seenIds.Add($id)) {
            $invalid.Add($entry)
            continue
        }
        $valid.Add($entry)
    }

    $quarantinePath = $null
    if ($invalid.Count -gt 0) {
        New-Item -ItemType Directory -Path $QuarantineDirectory -Force | Out-Null
        $stamp = [DateTimeOffset]::Now.ToString('yyyyMMdd-HHmmss-fff')
        $quarantinePath = Join-Path $QuarantineDirectory "queue.quarantine.$stamp.json"
        $quarantineDocument = [ordered]@{
            version = 1
            entries = @($invalid.ToArray())
        }
        Write-Utf8FileAtomic -Path $quarantinePath -Content ($quarantineDocument | ConvertTo-Json -Depth 10)
    }

    Save-QueueEntries -Path $QueuePath -Entries $valid.ToArray()

    return [pscustomobject]@{
        Repaired = $true
        Message = "Repair kept $($valid.Count) message(s) and quarantined $($invalid.Count)."
        KeptCount = $valid.Count
        QuarantinedCount = $invalid.Count
        QuarantinePath = $quarantinePath
    }
}

function Test-ProcessAlive {
    [CmdletBinding()]
    param(
        [int]$ProcessId
    )

    if ($ProcessId -le 0) {
        return $false
    }
    return $null -ne (Get-Process -Id $ProcessId -ErrorAction SilentlyContinue)
}

function Get-InflightJobs {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$InflightDirectory
    )

    if (-not (Test-Path -LiteralPath $InflightDirectory -PathType Container)) {
        return
    }

    $utf8 = New-Object System.Text.UTF8Encoding($false)
    foreach ($file in @(Get-ChildItem -LiteralPath $InflightDirectory -File -Filter '*.json')) {
        $result = [pscustomobject]@{
            Path = $file.FullName
            Valid = $false
            Job = $null
            Error = $null
        }
        try {
            $job = [System.IO.File]::ReadAllText($file.FullName, $utf8) | ConvertFrom-Json -ErrorAction Stop
            $idProperty = Get-NamedProperty -InputObject $job -Name 'id'
            $textProperty = Get-NamedProperty -InputObject $job -Name 'text'
            if (-not $idProperty.Found -or [string]::IsNullOrWhiteSpace([string]$idProperty.Value)) {
                throw 'The job file has no id.'
            }
            if (-not $textProperty.Found -or [string]::IsNullOrWhiteSpace([string]$textProperty.Value)) {
                throw 'The job file has no message text.'
            }
            $result.Valid = $true
            $result.Job = $job
        }
        catch {
            $result.Error = $_.Exception.Message
        }
        $result
    }
}

function Get-SentRecords {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        return
    }

    $utf8 = New-Object System.Text.UTF8Encoding($false)
    $lines = [System.IO.File]::ReadAllLines($Path, $utf8)
    for ($index = 0; $index -lt $lines.Count; $index++) {
        if ([string]::IsNullOrWhiteSpace($lines[$index])) {
            continue
        }
        $item = [pscustomobject]@{
            LineIndex = $index
            Valid = $false
            Record = $null
            Raw = $lines[$index]
            Error = $null
        }
        try {
            $item.Record = $lines[$index] | ConvertFrom-Json -ErrorAction Stop
            $item.Valid = $true
        }
        catch {
            $item.Error = $_.Exception.Message
        }
        $item
    }
}

function Get-SentEntryId {
    param(
        [Parameter(Mandatory = $true)]
        [object]$Record
    )

    $entryProperty = Get-NamedProperty -InputObject $Record -Name 'entry'
    if (-not $entryProperty.Found -or $null -eq $entryProperty.Value) {
        return $null
    }
    $idProperty = Get-NamedProperty -InputObject $entryProperty.Value -Name 'id'
    if (-not $idProperty.Found -or [string]::IsNullOrWhiteSpace([string]$idProperty.Value)) {
        return $null
    }
    return [string]$idProperty.Value
}

function Remove-SentRecordLine {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path,

        [Parameter(Mandatory = $true)]
        [int]$LineIndex
    )

    $utf8 = New-Object System.Text.UTF8Encoding($false)
    $lines = [System.Collections.Generic.List[string]]::new()
    foreach ($line in [System.IO.File]::ReadAllLines($Path, $utf8)) {
        $lines.Add($line)
    }

    if ($LineIndex -lt 0 -or $LineIndex -ge $lines.Count) {
        throw "Sent-history line $LineIndex does not exist."
    }
    $lines.RemoveAt($LineIndex)

    $remainingText = ''
    if ($lines.Count -gt 0) {
        $remainingText = ($lines -join [Environment]::NewLine)
        if (-not [string]::IsNullOrEmpty($remainingText)) {
            $remainingText += [Environment]::NewLine
        }
    }
    Write-Utf8FileAtomic -Path $Path -Content $remainingText
}

function Restore-SentRecordById {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$QueuePath,

        [Parameter(Mandatory = $true)]
        [string]$SentPath,

        [Parameter(Mandatory = $true)]
        [string]$EntryId
    )

    $found = $null
    foreach ($item in @(Get-SentRecords -Path $SentPath)) {
        if (-not $item.Valid) {
            continue
        }
        if ((Get-SentEntryId -Record $item.Record) -eq [string]$EntryId) {
            $found = $item
        }
    }

    if ($null -eq $found) {
        return [pscustomobject]@{ Restored = $false; Message = 'That sent-history entry could not be found.' }
    }

    $entry = (Get-NamedProperty -InputObject $found.Record -Name 'entry').Value
    $currentEntries = @(Get-QueueEntries -Path $QueuePath)
    if (@($currentEntries | Where-Object { [string]$_.id -eq [string]$EntryId }).Count -gt 0) {
        return [pscustomobject]@{ Restored = $false; Message = 'That message is already in the queue.' }
    }

    Save-QueueEntries -Path $QueuePath -Entries (@($entry) + $currentEntries)
    Remove-SentRecordLine -Path $SentPath -LineIndex $found.LineIndex

    return [pscustomobject]@{
        Restored = $true
        Message = 'The message was returned to the front of the queue.'
        Entry = $entry
    }
}

function Clear-SentHistory {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    Write-Utf8FileAtomic -Path $Path -Content ''
}

function Get-StrandedInflightJobs {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$InflightDirectory,

        [Parameter(Mandatory = $true)]
        [string]$SentPath
    )

    $processIdByEntryId = @{}
    foreach ($sentItem in @(Get-SentRecords -Path $SentPath)) {
        if (-not $sentItem.Valid) {
            continue
        }
        $entryId = Get-SentEntryId -Record $sentItem.Record
        if ($null -eq $entryId) {
            continue
        }
        $processIdProperty = Get-NamedProperty -InputObject $sentItem.Record -Name 'processId'
        $processIdValue = 0
        if ($processIdProperty.Found) {
            try {
                $processIdValue = [int]$processIdProperty.Value
            }
            catch {
                $processIdValue = 0
            }
        }
        $processIdByEntryId[$entryId] = $processIdValue
    }

    foreach ($jobInfo in @(Get-InflightJobs -InflightDirectory $InflightDirectory)) {
        if (-not $jobInfo.Valid) {
            $jobInfo
            continue
        }
        $jobId = [string]$jobInfo.Job.id
        $ownerProcessId = 0
        if ($processIdByEntryId.ContainsKey($jobId)) {
            $ownerProcessId = [int]$processIdByEntryId[$jobId]
        }
        if (-not (Test-ProcessAlive -ProcessId $ownerProcessId)) {
            $jobInfo
        }
    }
}

function Restore-InflightJob {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$QueuePath,

        [Parameter(Mandatory = $true)]
        [string]$SentPath,

        [Parameter(Mandatory = $true)]
        [string]$JobPath
    )

    $utf8 = New-Object System.Text.UTF8Encoding($false)
    $job = [System.IO.File]::ReadAllText($JobPath, $utf8) | ConvertFrom-Json -ErrorAction Stop

    $idProperty = Get-NamedProperty -InputObject $job -Name 'id'
    $textProperty = Get-NamedProperty -InputObject $job -Name 'text'
    if (-not $idProperty.Found -or [string]::IsNullOrWhiteSpace([string]$idProperty.Value)) {
        throw 'The job file has no id and cannot be restored.'
    }
    if (-not $textProperty.Found -or [string]::IsNullOrWhiteSpace([string]$textProperty.Value)) {
        throw 'The job file has no message text and cannot be restored.'
    }

    $createdAtProperty = Get-NamedProperty -InputObject $job -Name 'createdAt'
    $addedAt = if ($createdAtProperty.Found -and -not [string]::IsNullOrWhiteSpace([string]$createdAtProperty.Value)) {
        [string]$createdAtProperty.Value
    }
    else {
        [DateTimeOffset]::Now.ToString('o')
    }

    $entry = [pscustomobject][ordered]@{
        id = [string]$idProperty.Value
        text = [string]$textProperty.Value
        addedAt = $addedAt
    }

    $currentEntries = @(Get-QueueEntries -Path $QueuePath)
    $alreadyQueued = @($currentEntries | Where-Object { [string]$_.id -eq $entry.id }).Count -gt 0
    if (-not $alreadyQueued) {
        Save-QueueEntries -Path $QueuePath -Entries (@($entry) + $currentEntries)
    }

    $foundSent = $null
    foreach ($item in @(Get-SentRecords -Path $SentPath)) {
        if ($item.Valid -and (Get-SentEntryId -Record $item.Record) -eq $entry.id) {
            $foundSent = $item
        }
    }
    if ($null -ne $foundSent) {
        Remove-SentRecordLine -Path $SentPath -LineIndex $foundSent.LineIndex
    }

    Remove-Item -LiteralPath $JobPath -Force

    return [pscustomobject]@{
        Restored = (-not $alreadyQueued)
        Message = if ($alreadyQueued) { 'The message was already in the queue; the leftover job file was removed.' } else { 'The message was returned to the front of the queue.' }
        Entry = $entry
    }
}

function Get-PromptinatorReadyEntries {
    <#
        Read-only view of the Promptinator queue for display. Returns the
        entries a future claim would take, in claim order: while a v2 test
        batch is active, claims come exclusively from it; otherwise the
        Ready entries are claimed in store order. Never locks or writes.
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$RepoPath
    )

    $storePath = Join-Path $RepoPath 'workspace\promptinator\store.json'
    if (-not (Test-Path -LiteralPath $storePath)) {
        return [pscustomobject]@{
            Entries = @()
            BatchActive = $false
            Error = "No Promptinator store was found at $storePath."
        }
    }

    try {
        $store = Get-Content -LiteralPath $storePath -Raw | ConvertFrom-Json -ErrorAction Stop
    }
    catch {
        return [pscustomobject]@{
            Entries = @()
            BatchActive = $false
            Error = "The Promptinator store could not be read: $($_.Exception.Message)"
        }
    }

    $allEntries = @()
    try {
        $allEntries = @($store.entries)
    }
    catch {
        $allEntries = @()
    }
    $byId = @{}
    foreach ($entry in $allEntries) {
        $byId[[string]$entry.id] = $entry
    }

    $batch = $null
    try {
        $batch = $store.activeTestBatch
    }
    catch {
        $batch = $null
    }

    $ordered = New-Object System.Collections.Generic.List[object]
    if ($null -ne $batch) {
        foreach ($entryId in @($batch.entryIds)) {
            $entry = $byId[[string]$entryId]
            if ($null -ne $entry -and [string]$entry.state -eq 'ready') {
                $ordered.Add($entry)
            }
        }
    }
    else {
        foreach ($entry in $allEntries) {
            if ([string]$entry.state -eq 'ready') {
                $ordered.Add($entry)
            }
        }
    }

    $view = @($ordered.ToArray() | ForEach-Object {
        [pscustomobject]@{
            Id = [string]$_.id
            Ordinal = [int]$_.ordinal
            Name = [string]$_.name
        }
    })

    return [pscustomobject]@{
        Entries = $view
        BatchActive = ($null -ne $batch)
        Error = $null
    }
}

function Get-RevisionBatchQueue {
    <#
        Read-only list of revision-batch items that still need a conversation,
        in batch order. An item is finished once its asset owns a revision
        whose parentRevisionId equals the item's base revision (trusted
        ingestion allocates that when the revision job completes).
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$RepoPath
    )

    $batchesRoot = Join-Path $RepoPath 'workspace\batches\revision'
    if (-not (Test-Path -LiteralPath $batchesRoot)) {
        return @()
    }

    $pending = New-Object System.Collections.Generic.List[object]
    $batchDirectories = Get-ChildItem -LiteralPath $batchesRoot -Directory -ErrorAction SilentlyContinue |
        Sort-Object Name
    foreach ($batchDirectory in $batchDirectories) {
        $batchPath = Join-Path $batchDirectory.FullName 'batch.json'
        if (-not (Test-Path -LiteralPath $batchPath)) {
            continue
        }
        $batch = $null
        try {
            $batch = Get-Content -LiteralPath $batchPath -Raw | ConvertFrom-Json -ErrorAction Stop
        }
        catch {
            continue
        }
        $items = @($batch.items)
        for ($index = 0; $index -lt $items.Count; $index++) {
            $item = $items[$index]
            $assetId = [string]$item.assetId
            $baseRevisionId = [string]$item.baseRevisionId
            $assetDirectory = Join-Path $RepoPath "workspace\library\assets\$assetId"
            $revisionsRoot = Join-Path $assetDirectory 'revisions'
            if (-not (Test-Path -LiteralPath $revisionsRoot)) {
                continue
            }
            $completed = $false
            foreach ($revisionDirectory in Get-ChildItem -LiteralPath $revisionsRoot -Directory -ErrorAction SilentlyContinue) {
                $revisionPath = Join-Path $revisionDirectory.FullName 'revision.json'
                if (-not (Test-Path -LiteralPath $revisionPath)) {
                    continue
                }
                try {
                    $revision = Get-Content -LiteralPath $revisionPath -Raw | ConvertFrom-Json -ErrorAction Stop
                    if ([string]$revision.parentRevisionId -ceq $baseRevisionId) {
                        $completed = $true
                        break
                    }
                }
                catch {
                }
            }
            if ($completed) {
                continue
            }
            # The revision template's staleness rule: only dispatch while the
            # base revision is still the active Revise candidate.
            $reviewPath = Join-Path $assetDirectory 'review.json'
            if (-not (Test-Path -LiteralPath $reviewPath)) {
                continue
            }
            $stale = $true
            try {
                $review = Get-Content -LiteralPath $reviewPath -Raw | ConvertFrom-Json -ErrorAction Stop
                if (
                    $null -ne $review.candidate -and
                    [string]$review.candidate.lane -ceq 'revise' -and
                    [string]$review.candidate.revisionId -ceq $baseRevisionId
                ) {
                    $stale = $false
                }
            }
            catch {
            }
            if ($stale) {
                continue
            }
            $name = $assetId
            $assetPath = Join-Path $assetDirectory 'asset.json'
            if (Test-Path -LiteralPath $assetPath) {
                try {
                    $asset = Get-Content -LiteralPath $assetPath -Raw | ConvertFrom-Json -ErrorAction Stop
                    if (-not [string]::IsNullOrWhiteSpace([string]$asset.name)) {
                        $name = [string]$asset.name
                    }
                }
                catch {
                }
            }
            $pending.Add([pscustomobject]@{
                BatchId = [string]$batch.id
                AssetId = $assetId
                BaseRevisionId = $baseRevisionId
                Name = $name
                Notes = @($item.notes | ForEach-Object { [string]$_ })
                Position = $index + 1
                Total = $items.Count
            })
        }
    }
    return $pending.ToArray()
}

function New-RevisionDispatchMessage {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [object]$Item
    )

    $noteLines = @($Item.Notes | ForEach-Object { "- $_" })
    if ($noteLines.Count -eq 0) {
        $noteLines = @('- Resolve every unresolved note recorded in review.json.')
    }
    $lines = @(
        'Read and follow the project documentation.'
        ''
        'Follow jobs/templates/enemy-mob-32-revision.md for an existing-asset revision job.'
        ''
        "Revision batch: $($Item.BatchId) (item $($Item.Position) of $($Item.Total))"
        "Asset ID: $($Item.AssetId)"
        "Base revision: $($Item.BaseRevisionId)"
        "Requested name: $($Item.Name)"
        "Create a fresh kebab-case staging job directory such as workspace/staging/$($Item.AssetId)-revision."
        ''
        'Unresolved notes to resolve:'
    ) + $noteLines + @(
        ''
        "Use the exact submission identity above (assetId, baseRevisionId, requestedName). Follow the template's validator and trusted ingestion commands, and stop only after ingestion reports the new revision in Intake."
    )
    return ($lines -join "`r`n")
}

function Request-PromptinatorClaim {
    <#
        Claims the next Ready Promptinator entry from the Prompt Spriter
        repository this launcher lives in and returns the full claim printout
        as the message to send. The claim tool itself is the single source of
        truth: it locks the store, reconciles completions, and prints the
        exact prompt plus staging instructions between its markers.
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$RepoPath,

        [string]$Claimant = 'Queue Launcher',

        # Test seam: receives the tool path and claimant, returns
        # @{ ExitCode = <int>; Output = <string> } without running node.
        [scriptblock]$Invoker
    )

    $toolPath = Join-Path $RepoPath 'tools\claim-next-prompt.mjs'
    if (-not (Test-Path -LiteralPath $toolPath)) {
        return [pscustomobject]@{
            Ok = $false
            NoWork = $false
            Message = "The Promptinator claim tool was not found at $toolPath."
        }
    }

    $exitCode = 0
    $outputText = ''
    if ($null -ne $Invoker) {
        $result = & $Invoker $toolPath $Claimant
        $exitCode = [int]$result.ExitCode
        $outputText = [string]$result.Output
    }
    else {
        $node = Get-Command -Name 'node' -ErrorAction SilentlyContinue
        if ($null -eq $node) {
            return [pscustomobject]@{
                Ok = $false
                NoWork = $false
                Message = 'node was not found on PATH. Node.js is required to claim Promptinator entries.'
            }
        }
        $lines = & $node.Source $toolPath '--claimant' $Claimant 2>&1 | ForEach-Object { "$_" }
        $exitCode = $LASTEXITCODE
        $outputText = ($lines -join "`r`n").Trim()
    }

    return ConvertFrom-PromptinatorClaimOutput -ExitCode $exitCode -Output $outputText
}

function ConvertFrom-PromptinatorClaimOutput {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [int]$ExitCode,

        [AllowEmptyString()]
        [string]$Output
    )

    $outputText = ([string]$Output).Trim()
    if ($ExitCode -ne 0) {
        $noWork = $outputText -match 'no Ready entries'
        return [pscustomobject]@{
            Ok = $false
            NoWork = [bool]$noWork
            Message = $outputText
        }
    }

    if ($outputText -notmatch '--- PROMPTINATOR PROMPT START ---' -or
        $outputText -notmatch '--- PROMPTINATOR PROMPT END ---') {
        return [pscustomobject]@{
            Ok = $false
            NoWork = $false
            Message = "The claim output did not contain the expected prompt markers.`r`n$outputText"
        }
    }

    $entryId = ''
    if ($outputText -match '(?m)^Entry:\s*(\S+)') {
        $entryId = $Matches[1]
    }
    $expectedAssetId = ''
    if ($outputText -match '(?m)^Expected asset ID:\s*(\S+)') {
        $expectedAssetId = $Matches[1]
    }

    return [pscustomobject]@{
        Ok = $true
        NoWork = $false
        Text = $outputText
        EntryId = $entryId
        ExpectedAssetId = $expectedAssetId
    }
}

Export-ModuleMember -Function @(
    'Write-Utf8FileAtomic',
    'Initialize-LauncherData',
    'Get-QueueEntries',
    'Save-QueueEntries',
    'Request-PromptinatorClaim',
    'ConvertFrom-PromptinatorClaimOutput',
    'Get-PromptinatorReadyEntries',
    'Get-RevisionBatchQueue',
    'New-RevisionDispatchMessage',
    'New-QueueEntry',
    'ConvertFrom-BulkPromptText',
    'Add-SentRecord',
    'Undo-LastSentEntry',
    'Test-AgyCreditGuard',
    'Get-AgyExecutable',
    'ConvertTo-NativeArgument',
    'Backup-QueueFile',
    'Repair-QueueFile',
    'Test-ProcessAlive',
    'Get-InflightJobs',
    'Get-SentRecords',
    'Remove-SentRecordLine',
    'Restore-SentRecordById',
    'Clear-SentHistory',
    'Get-StrandedInflightJobs',
    'Restore-InflightJob'
)
