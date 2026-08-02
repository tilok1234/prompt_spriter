[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$rootDirectory = Split-Path -Parent $PSScriptRoot
$modulePath = Join-Path $rootDirectory 'app\QueueCore.psm1'
Import-Module $modulePath -Force

$script:Passed = 0

function Assert-True {
    param(
        [bool]$Condition,
        [string]$Message
    )

    if (-not $Condition) {
        throw "ASSERTION FAILED: $Message"
    }
    $script:Passed++
}

function Assert-Equal {
    param(
        [object]$Expected,
        [object]$Actual,
        [string]$Message
    )

    if ([string]$Expected -cne [string]$Actual) {
        throw "ASSERTION FAILED: $Message. Expected '$Expected', got '$Actual'."
    }
    $script:Passed++
}

if (-not ('ArgvHelper' -as [type])) {
    Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;

public static class ArgvHelper
{
    [DllImport("shell32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    private static extern IntPtr CommandLineToArgvW(string lpCmdLine, out int pNumArgs);

    [DllImport("kernel32.dll")]
    private static extern IntPtr LocalFree(IntPtr hMem);

    public static string[] Parse(string commandLine)
    {
        int count;
        IntPtr argv = CommandLineToArgvW(commandLine, out count);
        if (argv == IntPtr.Zero)
        {
            throw new InvalidOperationException("CommandLineToArgvW failed.");
        }
        try
        {
            string[] result = new string[count];
            for (int i = 0; i < count; i++)
            {
                IntPtr ptr = Marshal.ReadIntPtr(argv, i * IntPtr.Size);
                result[i] = Marshal.PtrToStringUni(ptr);
            }
            return result;
        }
        finally
        {
            LocalFree(argv);
        }
    }
}
'@
}

$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("AntigravityQueueLauncherTests_$([guid]::NewGuid().ToString('N'))")
$tempRootFull = [System.IO.Path]::GetFullPath($tempRoot)
$systemTempFull = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())
if (-not $tempRootFull.StartsWith($systemTempFull, [StringComparison]::OrdinalIgnoreCase)) {
    throw 'Refusing to create the test directory outside the system temporary directory.'
}

try {
    # --- Initialization ---
    $dataDirectory = Join-Path $tempRoot 'data'
    $paths = Initialize-LauncherData -DataDirectory $dataDirectory
    Assert-True (Test-Path -LiteralPath $paths.QueuePath -PathType Leaf) 'Initialization should create queue.json'
    Assert-True (Test-Path -LiteralPath $paths.SettingsPath -PathType Leaf) 'Initialization should create settings.json'
    Assert-True (Test-Path -LiteralPath $paths.SentPath -PathType Leaf) 'Initialization should create sent.jsonl'

    # --- Bulk import ---
    $bulkText = "first line`nsecond line`n---NEXT---`nthird message"
    $messages = @(ConvertFrom-BulkPromptText -Text $bulkText -Delimiter '---NEXT---')
    Assert-Equal 2 $messages.Count 'Bulk import should split two messages'
    Assert-Equal "first line`nsecond line" $messages[0] 'Bulk import should preserve multiline content'
    Assert-Equal 'third message' $messages[1] 'Bulk import should trim separator newlines'

    # --- Queue persistence ---
    $entryOne = New-QueueEntry -Text $messages[0]
    $entryTwo = New-QueueEntry -Text $messages[1]
    Save-QueueEntries -Path $paths.QueuePath -Entries @($entryOne, $entryTwo)
    $loaded = @(Get-QueueEntries -Path $paths.QueuePath)
    Assert-Equal 2 $loaded.Count 'Queue should preserve both entries'
    Assert-Equal $entryOne.id $loaded[0].id 'Queue should preserve entry order'
    Assert-Equal $messages[0] $loaded[0].text 'Queue should preserve exact multiline text'

    $unicodeMessage = "creature$([char]0x2019)s directional mark"
    $unicodeEntry = New-QueueEntry -Text $unicodeMessage
    Save-QueueEntries -Path $paths.QueuePath -Entries @($unicodeEntry)
    $unicodeLoaded = @(Get-QueueEntries -Path $paths.QueuePath)
    Assert-Equal $unicodeMessage $unicodeLoaded[0].text 'Queue should preserve UTF-8 smart punctuation exactly'

    # --- Undo last sent ---
    Save-QueueEntries -Path $paths.QueuePath -Entries @($entryTwo)
    Add-SentRecord -Path $paths.SentPath -Entry $entryOne -WorkingDirectory $tempRoot -ProcessId 1234
    $undoResult = Undo-LastSentEntry -QueuePath $paths.QueuePath -SentPath $paths.SentPath
    $restored = @(Get-QueueEntries -Path $paths.QueuePath)
    Assert-True $undoResult.Restored 'Undo should report a restored entry'
    Assert-Equal $entryOne.id $restored[0].id 'Undo should restore the entry to the front'
    Assert-Equal $entryTwo.id $restored[1].id 'Undo should preserve later queue entries'

    # --- Credit guard ---
    $fakeProfile = Join-Path $tempRoot 'profile'
    $fakeConfigDirectory = Join-Path $fakeProfile '.gemini\config'
    New-Item -ItemType Directory -Path $fakeConfigDirectory -Force | Out-Null
    $fakeConfigPath = Join-Path $fakeConfigDirectory 'config.json'

    Write-Utf8FileAtomic -Path $fakeConfigPath -Content '{"userSettings":{"useAiCredits":false}}'
    $safeGuard = Test-AgyCreditGuard -UserProfile $fakeProfile
    Assert-True $safeGuard.Allowed 'Explicitly disabled AI credits should pass the guard'

    Write-Utf8FileAtomic -Path $fakeConfigPath -Content '{"userSettings":{"useAiCredits":true}}'
    $unsafeGuard = Test-AgyCreditGuard -UserProfile $fakeProfile
    Assert-True (-not $unsafeGuard.Allowed) 'Enabled AI credits should fail the guard'

    Remove-Item -LiteralPath $fakeConfigPath -Force
    $unknownGuard = Test-AgyCreditGuard -UserProfile $fakeProfile
    Assert-True (-not $unknownGuard.Allowed) 'Missing AI-credit settings should fail closed'

    # --- Native argument escaping (CommandLineToArgvW round trip) ---
    $argumentCases = @(
        'Create an enemy-mob-32 sprite named "Lanterncap Toad".',
        'plain',
        'trailing backslash C:\path\',
        'backslash before quote \" in the middle',
        '"leading quote phrase" then text',
        'ends with a quote"',
        "two  spaces  and`ta tab",
        "multi`nline with `"quoted words`" inside",
        'a\\b\"c mixed \ escapes "here and there"',
        '-starts-with-dash but has "quotes here" and trailing\'
    )
    foreach ($case in $argumentCases) {
        $commandLine = '"C:\fake dir\agy.exe" --prompt-interactive ' + (ConvertTo-NativeArgument -Value $case)
        $argv = [ArgvHelper]::Parse($commandLine)
        Assert-Equal 3 $argv.Count "Escaped prompt should stay a single argument for case: $case"
        Assert-Equal '--prompt-interactive' $argv[1] "Flag should survive escaping for case: $case"
        Assert-Equal $case $argv[2] "Prompt text should round-trip exactly for case: $case"
    }

    # --- Queue backups: rotation and throttling ---
    $backupDirectory = Join-Path $tempRoot 'backups'
    Save-QueueEntries -Path $paths.QueuePath -Entries @($entryOne, $entryTwo)
    for ($iteration = 0; $iteration -lt 5; $iteration++) {
        $backupPath = Backup-QueueFile -QueuePath $paths.QueuePath -BackupDirectory $backupDirectory -Reason 'test' -Force -KeepCount 3
        Assert-True ($null -ne $backupPath) "Forced backup $iteration should be created"
        Start-Sleep -Milliseconds 30
    }
    $backupFiles = @(Get-ChildItem -LiteralPath $backupDirectory -File -Filter 'backup.*.json')
    Assert-True ($backupFiles.Count -le 3) 'Backup rotation should keep at most KeepCount files'
    Assert-True ($backupFiles.Count -ge 1) 'Backup rotation should keep at least the newest file'

    $throttledPath = Backup-QueueFile -QueuePath $paths.QueuePath -BackupDirectory $backupDirectory -Reason 'test' -KeepCount 3
    Assert-True ($null -eq $throttledPath) 'A non-forced backup right after another backup should be throttled'

    # --- Queue repair ---
    $repairQueuePath = Join-Path $tempRoot 'repair-queue.json'
    $goodEntry = New-QueueEntry -Text 'good message'
    $brokenDocument = @{
        version = 1
        entries = @(
            @{ id = $goodEntry.id; text = $goodEntry.text; addedAt = $goodEntry.addedAt },
            @{ id = 'no-text-entry'; text = '   ' },
            $null,
            @{ id = $goodEntry.id; text = 'duplicate id of the good entry' },
            @{ text = 'entry without an id keeps its text' }
        )
    }
    Write-Utf8FileAtomic -Path $repairQueuePath -Content ($brokenDocument | ConvertTo-Json -Depth 10)
    $repairResult = Repair-QueueFile -QueuePath $repairQueuePath -QuarantineDirectory $backupDirectory
    Assert-True $repairResult.Repaired 'Repair should succeed on parseable JSON'
    Assert-Equal 2 $repairResult.KeptCount 'Repair should keep the valid entry and regenerate the id-less entry'
    Assert-Equal 2 $repairResult.QuarantinedCount 'Repair should quarantine the empty-text and duplicate-id entries'
    Assert-True ($null -ne $repairResult.QuarantinePath -and (Test-Path -LiteralPath $repairResult.QuarantinePath)) 'Repair should write a quarantine file'
    $repairedEntries = @(Get-QueueEntries -Path $repairQueuePath)
    Assert-Equal 2 $repairedEntries.Count 'Repaired queue should load cleanly'
    Assert-Equal $goodEntry.id $repairedEntries[0].id 'Repaired queue should keep the valid entry first'

    $invalidJsonPath = Join-Path $tempRoot 'invalid-queue.json'
    Write-Utf8FileAtomic -Path $invalidJsonPath -Content 'this is not { json at all'
    $invalidResult = Repair-QueueFile -QueuePath $invalidJsonPath -QuarantineDirectory $backupDirectory
    Assert-True (-not $invalidResult.Repaired) 'Repair should refuse a file that is not JSON'

    # --- Sent-history records: read, restore by id, clear ---
    $historyData = Join-Path $tempRoot 'history-data'
    $historyPaths = Initialize-LauncherData -DataDirectory $historyData
    $recordA = New-QueueEntry -Text 'history message A'
    $recordB = New-QueueEntry -Text 'history message B'
    $recordC = New-QueueEntry -Text 'history message C'
    Add-SentRecord -Path $historyPaths.SentPath -Entry $recordA -WorkingDirectory $tempRoot -ProcessId 1111
    Add-SentRecord -Path $historyPaths.SentPath -Entry $recordB -WorkingDirectory $tempRoot -ProcessId 2222
    Add-SentRecord -Path $historyPaths.SentPath -Entry $recordC -WorkingDirectory $tempRoot -ProcessId 3333
    $sentRecords = @(Get-SentRecords -Path $historyPaths.SentPath)
    Assert-Equal 3 $sentRecords.Count 'Sent history should contain three records'
    Assert-True ($sentRecords[0].Valid -and $sentRecords[1].Valid -and $sentRecords[2].Valid) 'All sent records should parse'

    $restoreMiddle = Restore-SentRecordById -QueuePath $historyPaths.QueuePath -SentPath $historyPaths.SentPath -EntryId $recordB.id
    Assert-True $restoreMiddle.Restored 'Restoring a middle history record should succeed'
    $historyQueue = @(Get-QueueEntries -Path $historyPaths.QueuePath)
    Assert-Equal $recordB.id $historyQueue[0].id 'Restored history record should be at the queue front'
    Assert-Equal 2 @(Get-SentRecords -Path $historyPaths.SentPath).Count 'Restored record should leave the history'

    $restoreAgain = Restore-SentRecordById -QueuePath $historyPaths.QueuePath -SentPath $historyPaths.SentPath -EntryId $recordB.id
    Assert-True (-not $restoreAgain.Restored) 'Restoring the same record twice should be refused'

    Clear-SentHistory -Path $historyPaths.SentPath
    Assert-Equal 0 @(Get-SentRecords -Path $historyPaths.SentPath).Count 'Clearing history should remove all records'

    # --- Stranded inflight jobs: detection and restore ---
    $strandedData = Join-Path $tempRoot 'stranded-data'
    $strandedPaths = Initialize-LauncherData -DataDirectory $strandedData

    $deadProcess = Start-Process -FilePath $env:ComSpec -ArgumentList '/c', 'exit' -PassThru -WindowStyle Hidden
    $deadProcess.WaitForExit()
    $deadProcessId = $deadProcess.Id

    $strandedEntry = New-QueueEntry -Text 'stranded prompt text'
    $runningEntry = New-QueueEntry -Text 'still running prompt text'
    Add-SentRecord -Path $strandedPaths.SentPath -Entry $strandedEntry -WorkingDirectory $tempRoot -ProcessId $deadProcessId
    Add-SentRecord -Path $strandedPaths.SentPath -Entry $runningEntry -WorkingDirectory $tempRoot -ProcessId $PID

    foreach ($jobEntry in @($strandedEntry, $runningEntry)) {
        $jobDocument = [ordered]@{
            version = 1
            id = $jobEntry.id
            text = $jobEntry.text
            workingDirectory = $tempRoot
            agyPath = 'C:\fake\agy.exe'
            createdAt = [DateTimeOffset]::Now.ToString('o')
        }
        $jobFilePath = Join-Path $strandedPaths.InflightDirectory ("$($jobEntry.id).json")
        Write-Utf8FileAtomic -Path $jobFilePath -Content ($jobDocument | ConvertTo-Json -Depth 8)
    }

    Assert-True (-not (Test-ProcessAlive -ProcessId $deadProcessId)) 'The helper process should have exited'
    Assert-True (Test-ProcessAlive -ProcessId $PID) 'The current test process should count as alive'

    $strandedJobs = @(Get-StrandedInflightJobs -InflightDirectory $strandedPaths.InflightDirectory -SentPath $strandedPaths.SentPath)
    Assert-Equal 1 $strandedJobs.Count 'Only the job with a dead owner process should be stranded'
    Assert-Equal $strandedEntry.id $strandedJobs[0].Job.id 'The stranded job should belong to the dead process'

    $strandedRestore = Restore-InflightJob -QueuePath $strandedPaths.QueuePath -SentPath $strandedPaths.SentPath -JobPath $strandedJobs[0].Path
    Assert-True $strandedRestore.Restored 'Restoring a stranded job should succeed'
    $strandedQueue = @(Get-QueueEntries -Path $strandedPaths.QueuePath)
    Assert-Equal $strandedEntry.id $strandedQueue[0].id 'The stranded message should return to the queue front'
    Assert-Equal 'stranded prompt text' $strandedQueue[0].text 'The stranded message should keep its text'
    Assert-True (-not (Test-Path -LiteralPath $strandedJobs[0].Path)) 'The restored job file should be deleted'
    $remainingSent = @(Get-SentRecords -Path $strandedPaths.SentPath)
    Assert-Equal 1 $remainingSent.Count 'Restoring a stranded job should remove its sent record'
    Assert-Equal $runningEntry.id (($remainingSent[0].Record).entry.id) 'The running conversation record should remain'

    # --- A job with no sent record at all counts as stranded ---
    $orphanEntry = New-QueueEntry -Text 'orphan job without sent record'
    $orphanJobPath = Join-Path $strandedPaths.InflightDirectory ("$($orphanEntry.id).json")
    $orphanDocument = [ordered]@{
        version = 1
        id = $orphanEntry.id
        text = $orphanEntry.text
        workingDirectory = $tempRoot
        agyPath = 'C:\fake\agy.exe'
        createdAt = [DateTimeOffset]::Now.ToString('o')
    }
    Write-Utf8FileAtomic -Path $orphanJobPath -Content ($orphanDocument | ConvertTo-Json -Depth 8)
    $orphanStranded = @(Get-StrandedInflightJobs -InflightDirectory $strandedPaths.InflightDirectory -SentPath $strandedPaths.SentPath)
    Assert-Equal 1 $orphanStranded.Count 'A job file without any sent record should be stranded'
    Assert-Equal $orphanEntry.id $orphanStranded[0].Job.id 'The orphan job should be the stranded one'

    # --- Exit-code markers (.done) must not be mistaken for job files ---
    # The inflight folder still holds the running conversation's job and the
    # orphan job; only the restored stranded job was deleted.
    $jobsBeforeMarker = @(Get-InflightJobs -InflightDirectory $strandedPaths.InflightDirectory)
    $markerFilePath = Join-Path $strandedPaths.InflightDirectory 'someconversation.done'
    Write-Utf8FileAtomic -Path $markerFilePath -Content '0'
    $jobsWithMarker = @(Get-InflightJobs -InflightDirectory $strandedPaths.InflightDirectory)
    Assert-Equal $jobsBeforeMarker.Count $jobsWithMarker.Count 'Adding a .done marker should not change the inflight job scan'
    Assert-True (@($jobsWithMarker | Where-Object { $_.Path -like '*.done' }).Count -eq 0) 'Exit-code markers should never appear as inflight jobs'

    # --- Promptinator claim source ---
    $claimOutput = @(
        'Promptinator next-entry claim created.'
        'Entry: prompt-0123-test-critter'
        'Ordinal: 123'
        'Name: Test Critter'
        'Style: assembler-inspired-v2@0.1.0'
        'Dispatch source: normal Ready queue'
        'Claim: claim-00000000-0000-0000-0000-000000000000'
        'Expected asset ID: enemy-mob-32-test-critter'
        'Existing Library completions reconciled: 0'
        ''
        'Use the exact prompt below as submission.json request.'
        '--- PROMPTINATOR PROMPT START ---'
        'Read and follow the project documentation.'
        '--- PROMPTINATOR PROMPT END ---'
    ) -join "`r`n"
    $claimRepo = Join-Path $tempRootFull 'claim-repo'
    New-Item -ItemType Directory -Path (Join-Path $claimRepo 'tools') -Force | Out-Null
    Write-Utf8FileAtomic -Path (Join-Path $claimRepo 'tools\claim-next-prompt.mjs') -Content '// placeholder'

    $goodClaim = Request-PromptinatorClaim -RepoPath $claimRepo -Invoker { param($tool, $claimant)
        @{ ExitCode = 0; Output = $claimOutput }
    }.GetNewClosure()
    Assert-True $goodClaim.Ok 'A marker-complete claim output should be accepted'
    Assert-Equal 'prompt-0123-test-critter' $goodClaim.EntryId 'The claim entry ID should be extracted'
    Assert-Equal 'enemy-mob-32-test-critter' $goodClaim.ExpectedAssetId 'The expected asset ID should be extracted'
    Assert-True ($goodClaim.Text -like '*PROMPTINATOR PROMPT START*') 'The full printout should be kept as the message text'

    $noWork = Request-PromptinatorClaim -RepoPath $claimRepo -Invoker { param($tool, $claimant)
        @{ ExitCode = 1; Output = 'Promptinator has no Ready entries to claim.' }
    }
    Assert-True (-not $noWork.Ok) 'An exhausted queue should not return Ok'
    Assert-True $noWork.NoWork 'An exhausted queue should be reported as NoWork'

    $brokenClaim = Request-PromptinatorClaim -RepoPath $claimRepo -Invoker { param($tool, $claimant)
        @{ ExitCode = 0; Output = 'Something without markers' }
    }
    Assert-True (-not $brokenClaim.Ok) 'Output without prompt markers should be rejected'
    Assert-True (-not $brokenClaim.NoWork) 'Marker failures are errors, not queue exhaustion'

    $missingTool = Request-PromptinatorClaim -RepoPath (Join-Path $tempRootFull 'not-a-repo')
    Assert-True (-not $missingTool.Ok) 'A repository without the claim tool should be rejected'
    Assert-True ($missingTool.Message -like '*claim tool was not found*') 'The missing-tool error should name the problem'

    # --- Promptinator read-only queue view ---
    $storeRepo = Join-Path $tempRootFull 'store-repo'
    New-Item -ItemType Directory -Path (Join-Path $storeRepo 'workspace\promptinator') -Force | Out-Null
    $storeDocument = [ordered]@{
        kind = 'promptinator-store'
        schemaVersion = '1.7.0'
        updatedAt = '2026-08-02T00:00:00.000Z'
        activeTestBatch = $null
        entries = @(
            [ordered]@{ id = 'prompt-0001-done'; ordinal = 1; name = 'Done Critter'; state = 'completed' }
            [ordered]@{ id = 'prompt-0002-second'; ordinal = 2; name = 'Second Critter'; state = 'ready' }
            [ordered]@{ id = 'prompt-0003-third'; ordinal = 3; name = 'Third Critter'; state = 'ready' }
            [ordered]@{ id = 'prompt-0004-taken'; ordinal = 4; name = 'Taken Critter'; state = 'claimed' }
        )
    }
    Write-Utf8FileAtomic -Path (Join-Path $storeRepo 'workspace\promptinator\store.json') -Content ($storeDocument | ConvertTo-Json -Depth 6)

    $readyView = Get-PromptinatorReadyEntries -RepoPath $storeRepo
    Assert-True ($null -eq $readyView.Error) 'A valid store should produce no view error'
    Assert-Equal 2 (@($readyView.Entries).Count) 'Only Ready entries should appear in the view'
    Assert-Equal 'prompt-0002-second' ([string]$readyView.Entries[0].Id) 'Store order should be preserved without a batch'
    Assert-True (-not $readyView.BatchActive) 'No batch should be reported when activeTestBatch is null'

    $storeDocument.activeTestBatch = [ordered]@{
        id = 'v2-test-00000000-0000-0000-0000-000000000000'
        entryIds = @('prompt-0003-third', 'prompt-0002-second', 'prompt-0004-taken')
    }
    Write-Utf8FileAtomic -Path (Join-Path $storeRepo 'workspace\promptinator\store.json') -Content ($storeDocument | ConvertTo-Json -Depth 6)
    $batchView = Get-PromptinatorReadyEntries -RepoPath $storeRepo
    Assert-True $batchView.BatchActive 'An active test batch should be reported'
    Assert-Equal 2 (@($batchView.Entries).Count) 'Only Ready batch members should appear during a batch'
    Assert-Equal 'prompt-0003-third' ([string]$batchView.Entries[0].Id) 'Batch order should override store order'

    $missingView = Get-PromptinatorReadyEntries -RepoPath (Join-Path $tempRootFull 'no-store-repo')
    Assert-True ($null -ne $missingView.Error) 'A missing store should surface a view error'
    Assert-Equal 0 (@($missingView.Entries).Count) 'A missing store should produce an empty view'

    # --- PowerShell syntax check of all application scripts ---
    $parseErrors = @()
    $scripts = Get-ChildItem -LiteralPath (Join-Path $rootDirectory 'app') -File | Where-Object { $_.Extension -in @('.ps1', '.psm1') }
    foreach ($scriptFile in $scripts) {
        $tokens = $null
        $errors = $null
        [void][System.Management.Automation.Language.Parser]::ParseFile($scriptFile.FullName, [ref]$tokens, [ref]$errors)
        $parseErrors += @($errors)
    }
    Assert-Equal 0 $parseErrors.Count 'All PowerShell application files should parse cleanly'

    Write-Host "PASS: $script:Passed assertions completed." -ForegroundColor Green
}
finally {
    if (Test-Path -LiteralPath $tempRootFull) {
        $verified = [System.IO.Path]::GetFullPath($tempRootFull)
        if ($verified.StartsWith($systemTempFull, [StringComparison]::OrdinalIgnoreCase) -and $verified -ne $systemTempFull) {
            Remove-Item -LiteralPath $verified -Recurse -Force
        }
    }
}
