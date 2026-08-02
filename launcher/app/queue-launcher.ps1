[CmdletBinding()]
param(
    [switch]$SmokeTest
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName PresentationFramework
Add-Type -AssemblyName PresentationCore
Add-Type -AssemblyName WindowsBase
Add-Type -AssemblyName System.Windows.Forms

$modulePath = Join-Path $PSScriptRoot 'QueueCore.psm1'
Import-Module $modulePath -Force

$rootDirectory = Split-Path -Parent $PSScriptRoot
$dataDirectory = Join-Path $rootDirectory 'data'
$backupDirectory = Join-Path $dataDirectory 'backups'
$paths = Initialize-LauncherData -DataDirectory $dataDirectory
$runnerPath = Join-Path $PSScriptRoot 'run-prompt.ps1'

$createdNew = $false
$instanceMutex = [System.Threading.Mutex]::new($true, 'Local\AntigravityQueueLauncher', [ref]$createdNew)
if (-not $createdNew) {
    [System.Windows.MessageBox]::Show(
        'Antigravity Queue Launcher is already running.',
        'Already running',
        [System.Windows.MessageBoxButton]::OK,
        [System.Windows.MessageBoxImage]::Information
    ) | Out-Null
    exit 0
}

if (-not ('QueueListItem' -as [type])) {
    Add-Type -TypeDefinition @'
public class QueueListItem
{
    public string Id { get; set; }
    public string Display { get; set; }
    public override string ToString() { return Display; }
}
'@
}

function Get-LauncherSettings {
    $defaults = [pscustomobject]@{
        version = 1
        workingDirectory = ''
        delimiter = '---NEXT---'
        maxPromptCharacters = 20000
        windowLeft = 0
        windowTop = 0
        windowWidth = 0
        windowHeight = 0
        autoSendMode = 'print'
        printTimeoutMinutes = 10
        autoSendConcurrency = 2
        autoSendModel = ''
        promptinatorEnabled = $false
        promptinatorRepo = ''
        promptinatorClaimant = 'Queue Launcher'
    }

    try {
        $document = Get-Content -LiteralPath $paths.SettingsPath -Raw | ConvertFrom-Json -ErrorAction Stop
        foreach ($name in @('workingDirectory', 'delimiter', 'maxPromptCharacters', 'windowLeft', 'windowTop', 'windowWidth', 'windowHeight', 'autoSendMode', 'printTimeoutMinutes', 'autoSendConcurrency', 'autoSendModel', 'promptinatorEnabled', 'promptinatorRepo', 'promptinatorClaimant')) {
            $property = $document.PSObject.Properties | Where-Object { $_.Name -ieq $name } | Select-Object -First 1
            if ($null -ne $property) {
                $defaults.$name = $property.Value
            }
        }
    }
    catch {
        [System.Windows.MessageBox]::Show(
            "The launcher settings could not be read. Defaults will be used.`n`n$($_.Exception.Message)",
            'Settings warning',
            [System.Windows.MessageBoxButton]::OK,
            [System.Windows.MessageBoxImage]::Warning
        ) | Out-Null
    }

    return $defaults
}

function ConvertTo-SafeDouble {
    param([object]$Value)

    try {
        return [Math]::Round([double]$Value, 0)
    }
    catch {
        return 0
    }
}

function Save-LauncherSettings {
    param([object]$Settings)

    $maxCharacters = 0
    try {
        $maxCharacters = [int]$Settings.maxPromptCharacters
    }
    catch {
        $maxCharacters = 0
    }
    if ($maxCharacters -le 0) {
        $maxCharacters = 20000
    }

    $autoSendMode = 'print'
    try {
        if ([string]$Settings.autoSendMode -ieq 'interactive') {
            $autoSendMode = 'interactive'
        }
    }
    catch {
    }

    $printTimeout = 10
    try {
        $printTimeout = [int]$Settings.printTimeoutMinutes
    }
    catch {
        $printTimeout = 10
    }
    if ($printTimeout -lt 1 -or $printTimeout -gt 720) {
        $printTimeout = 10
    }

    $concurrency = 2
    try {
        $concurrency = [int]$Settings.autoSendConcurrency
    }
    catch {
        $concurrency = 2
    }
    if ($concurrency -lt 1 -or $concurrency -gt 4) {
        $concurrency = 2
    }

    $document = [ordered]@{
        version = 1
        workingDirectory = [string]$Settings.workingDirectory
        delimiter = [string]$Settings.delimiter
        maxPromptCharacters = $maxCharacters
        windowLeft = ConvertTo-SafeDouble -Value $Settings.windowLeft
        windowTop = ConvertTo-SafeDouble -Value $Settings.windowTop
        windowWidth = ConvertTo-SafeDouble -Value $Settings.windowWidth
        windowHeight = ConvertTo-SafeDouble -Value $Settings.windowHeight
        autoSendMode = $autoSendMode
        printTimeoutMinutes = $printTimeout
        autoSendConcurrency = $concurrency
        autoSendModel = ([string]$Settings.autoSendModel).Trim()
        promptinatorEnabled = ($Settings.promptinatorEnabled -eq $true)
        promptinatorRepo = ([string]$Settings.promptinatorRepo).Trim()
        promptinatorClaimant = ([string]$Settings.promptinatorClaimant).Trim()
    }
    Write-Utf8FileAtomic -Path $paths.SettingsPath -Content ($document | ConvertTo-Json -Depth 5)
}

[xml]$xaml = @'
<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="Antigravity Queue Launcher" Height="780" Width="1080"
        MinHeight="660" MinWidth="940" WindowStartupLocation="CenterScreen"
        Background="#F4F6FA" FontFamily="Segoe UI">
  <Grid Margin="22">
    <Grid.RowDefinitions>
      <RowDefinition Height="Auto"/>
      <RowDefinition Height="Auto"/>
      <RowDefinition Height="Auto"/>
      <RowDefinition Height="Auto"/>
      <RowDefinition Height="*"/>
      <RowDefinition Height="Auto"/>
      <RowDefinition Height="Auto"/>
      <RowDefinition Height="Auto"/>
    </Grid.RowDefinitions>

    <StackPanel Grid.Row="0" Margin="0,0,0,12">
      <TextBlock Text="Antigravity Queue Launcher" FontSize="24" FontWeight="SemiBold" Foreground="#172033"/>
      <TextBlock Text="The top message in the queue is sent next. Each send starts one fresh Antigravity terminal conversation." Foreground="#556070" Margin="0,4,0,0"/>
    </StackPanel>

    <Border x:Name="GuardBorder" Grid.Row="1" CornerRadius="6" Padding="12" Margin="0,0,0,12" Background="#FDECEC" BorderBrush="#E6B8B8" BorderThickness="1">
      <DockPanel>
        <Button x:Name="RecheckGuardButton" DockPanel.Dock="Right" Content="Recheck" Padding="10,4" Margin="12,0,0,0" VerticalAlignment="Top"/>
        <StackPanel>
          <TextBlock x:Name="GuardText" TextWrapping="Wrap" FontWeight="SemiBold" Foreground="#9B2525"/>
          <TextBlock x:Name="GuardHintText" TextWrapping="Wrap" Foreground="#7A4A4A" FontSize="12" Margin="0,5,0,0" Visibility="Collapsed"
                     Text="How to fix: turn off AI-credit overages inside Antigravity so that useAiCredits reads false in %USERPROFILE%\.gemini\config\config.json (or useG1Credits in .gemini\antigravity-cli\settings.json). The launcher only reads these settings and never changes them. Click Recheck afterwards."/>
        </StackPanel>
      </DockPanel>
    </Border>

    <Grid Grid.Row="2" Margin="0,0,0,12">
      <Grid.ColumnDefinitions>
        <ColumnDefinition Width="Auto"/>
        <ColumnDefinition Width="*"/>
        <ColumnDefinition Width="Auto"/>
      </Grid.ColumnDefinitions>
      <TextBlock Grid.Column="0" Text="Working folder:" VerticalAlignment="Center" Margin="0,0,10,0" FontWeight="SemiBold"/>
      <TextBox x:Name="WorkingDirectoryText" Grid.Column="1" Padding="7" VerticalContentAlignment="Center"/>
      <Button x:Name="BrowseButton" Grid.Column="2" Content="Browse..." Padding="12,6" Margin="10,0,0,0"/>
    </Grid>

    <Grid Grid.Row="3" Margin="0,0,0,8">
      <Grid.ColumnDefinitions>
        <ColumnDefinition Width="Auto"/>
        <ColumnDefinition Width="*"/>
        <ColumnDefinition Width="Auto"/>
        <ColumnDefinition Width="Auto"/>
      </Grid.ColumnDefinitions>
      <StackPanel Grid.Column="0" Orientation="Horizontal" VerticalAlignment="Center">
        <TextBlock Text="Queue" FontSize="17" FontWeight="SemiBold"/>
        <Border Background="#E7ECF6" CornerRadius="10" Padding="9,3" Margin="10,0,0,0">
          <TextBlock x:Name="PendingText" Text="0 pending" Foreground="#35445F" FontWeight="SemiBold"/>
        </Border>
        <TextBlock Text="(the top message is sent next)" Foreground="#8790A0" FontSize="11" VerticalAlignment="Center" Margin="10,2,0,0"/>
      </StackPanel>
      <TextBlock Grid.Column="2" Text="Search:" VerticalAlignment="Center" Margin="0,0,8,0" Foreground="#556070"/>
      <TextBox x:Name="SearchText" Grid.Column="3" Width="220" Padding="5" ToolTip="Filter the queue list (Ctrl+F)"/>
    </Grid>

    <Grid Grid.Row="4">
      <Grid.ColumnDefinitions>
        <ColumnDefinition Width="5*"/>
        <ColumnDefinition Width="Auto"/>
        <ColumnDefinition Width="6*"/>
      </Grid.ColumnDefinitions>
      <ListBox x:Name="QueueList" Grid.Column="0" SelectionMode="Extended" FontFamily="Consolas" FontSize="12"
               BorderBrush="#C8D0DE" Background="White"
               ScrollViewer.HorizontalScrollBarVisibility="Auto" ScrollViewer.VerticalScrollBarVisibility="Auto"/>
      <StackPanel Grid.Column="1" Margin="8,0" VerticalAlignment="Top">
        <Button x:Name="MoveTopButton" Content="Top" Width="66" Margin="0,0,0,6" Padding="0,4" ToolTip="Move the selected message to the front of the queue"/>
        <Button x:Name="MoveUpButton" Content="Up" Width="66" Margin="0,0,0,6" Padding="0,4" ToolTip="Move the selected message one place earlier"/>
        <Button x:Name="MoveDownButton" Content="Down" Width="66" Margin="0,0,0,10" Padding="0,4" ToolTip="Move the selected message one place later"/>
        <Button x:Name="EditButton" Content="Edit" Width="66" Margin="0,0,0,6" Padding="0,4" ToolTip="Edit the selected message (F2)"/>
        <Button x:Name="DeleteButton" Content="Delete" Width="66" Padding="0,4" ToolTip="Delete the selected message(s) (Del)"/>
      </StackPanel>
      <DockPanel Grid.Column="2">
        <Grid DockPanel.Dock="Top" Margin="0,0,0,6">
          <TextBlock Text="Selected message" FontWeight="SemiBold" HorizontalAlignment="Left"/>
          <TextBlock x:Name="CharCountText" HorizontalAlignment="Right" Foreground="#687386" FontSize="11" VerticalAlignment="Center"/>
        </Grid>
        <TextBox x:Name="PreviewText" IsReadOnly="True" AcceptsReturn="True"
                 VerticalScrollBarVisibility="Auto" HorizontalScrollBarVisibility="Auto"
                 TextWrapping="NoWrap" Padding="10" FontFamily="Consolas" FontSize="13"
                 Background="White" BorderBrush="#C8D0DE"/>
      </DockPanel>
    </Grid>

    <Grid Grid.Row="5" Margin="0,14,0,10">
      <Grid.ColumnDefinitions>
        <ColumnDefinition Width="*"/>
        <ColumnDefinition Width="Auto"/>
      </Grid.ColumnDefinitions>
      <StackPanel Grid.Column="0" Orientation="Horizontal" VerticalAlignment="Center">
        <Button x:Name="ImportButton" Content="Add / import messages" Padding="12,7" Margin="0,0,10,0" ToolTip="Ctrl+I"/>
        <Button x:Name="UndoButton" Content="Undo last" Padding="12,7" Margin="0,0,10,0" ToolTip="Return the most recently launched message to the front of the queue"/>
        <Button x:Name="HistoryButton" Content="History..." Padding="12,7" Margin="0,0,10,0" ToolTip="Browse launched messages, restore any of them, or clear the history"/>
        <Button x:Name="OpenDataButton" Content="Open data folder" Padding="12,7" Margin="0,0,10,0"/>
        <Button x:Name="RepairButton" Content="Repair queue..." Padding="12,7" Background="#F6D8D8" BorderBrush="#D6A6A6" Visibility="Collapsed"/>
      </StackPanel>
      <StackPanel Grid.Column="1" Orientation="Horizontal" VerticalAlignment="Center">
        <CheckBox x:Name="PromptinatorCheck" VerticalAlignment="Center" Margin="0,0,14,0" Content="Pull from Promptinator"
                  ToolTip="When the local queue is empty, claim the next Ready Promptinator entry from this repository and send its exact claimed prompt. Claims are created one send at a time, ingestion completes them automatically, and Undo last returns an unlaunched claim text to the queue front for resume."/>
        <CheckBox x:Name="AutoSendCheck" VerticalAlignment="Center" Margin="0,0,14,0" Content="Auto-send the queue"
                  ToolTip="Tick to start working through the queue immediately. Up to two conversations (autoSendConcurrency in settings) run at once in the background with staggered starts; each ends on its own when its task completes and the next message follows. Turns itself off if anything fails or the queue empties. Off by default each time the launcher starts."/>
        <Button x:Name="SendButton" Grid.Column="1" Content="Send next" Padding="24,9"
                FontWeight="Bold" FontSize="15" Background="#2E6BE6" Foreground="White" BorderBrush="#2355B8" ToolTip="Ctrl+Enter"/>
      </StackPanel>
    </Grid>

    <DockPanel Grid.Row="6" Margin="0,0,0,8">
      <TextBlock x:Name="AgyPathText" DockPanel.Dock="Right" Foreground="#687386" FontSize="11" VerticalAlignment="Center"/>
      <TextBlock x:Name="RunningText" Foreground="#556070" FontStyle="Italic" FontSize="12" VerticalAlignment="Center"/>
    </DockPanel>

    <Border Grid.Row="7" CornerRadius="5" Padding="10" Background="#E9EDF4">
      <TextBlock x:Name="StatusText" Text="Choose a working folder and add messages to begin." TextWrapping="Wrap" Foreground="#445064"/>
    </Border>
  </Grid>
</Window>
'@

$reader = New-Object System.Xml.XmlNodeReader $xaml
$window = [System.Windows.Markup.XamlReader]::Load($reader)

$guardBorder = $window.FindName('GuardBorder')
$guardText = $window.FindName('GuardText')
$guardHintText = $window.FindName('GuardHintText')
$recheckGuardButton = $window.FindName('RecheckGuardButton')
$workingDirectoryText = $window.FindName('WorkingDirectoryText')
$browseButton = $window.FindName('BrowseButton')
$pendingText = $window.FindName('PendingText')
$searchText = $window.FindName('SearchText')
$queueList = $window.FindName('QueueList')
$moveTopButton = $window.FindName('MoveTopButton')
$moveUpButton = $window.FindName('MoveUpButton')
$moveDownButton = $window.FindName('MoveDownButton')
$editButton = $window.FindName('EditButton')
$deleteButton = $window.FindName('DeleteButton')
$charCountText = $window.FindName('CharCountText')
$previewText = $window.FindName('PreviewText')
$importButton = $window.FindName('ImportButton')
$undoButton = $window.FindName('UndoButton')
$historyButton = $window.FindName('HistoryButton')
$openDataButton = $window.FindName('OpenDataButton')
$repairButton = $window.FindName('RepairButton')
$autoSendCheck = $window.FindName('AutoSendCheck')
$promptinatorCheck = $window.FindName('PromptinatorCheck')
$sendButton = $window.FindName('SendButton')
$agyPathText = $window.FindName('AgyPathText')
$runningText = $window.FindName('RunningText')
$statusText = $window.FindName('StatusText')

$script:Settings = Get-LauncherSettings
$script:CreditGuard = $null
$script:IsSending = $false
$script:ModalOpen = $false
$script:IsRefreshingList = $false
$script:AllEntries = @()
$script:QueueError = $null
$script:QueueStamp = ''
$script:ActiveLaunches = New-Object System.Collections.Generic.List[object]
$script:LastFinishedText = ''
$script:LastChainLaunchAt = [DateTimeOffset]::MinValue
$script:AnyAutoLaunchThisSession = $false
$script:PromptinatorView = $null
$script:PromptinatorStamp = ''
$workingDirectoryText.Text = [string]$script:Settings.workingDirectory
$promptinatorCheck.IsChecked = ($script:Settings.promptinatorEnabled -eq $true)

function Set-Status {
    param(
        [string]$Message,
        [ValidateSet('Normal', 'Success', 'Warning', 'Error')]
        [string]$Kind = 'Normal'
    )

    $statusText.Text = $Message
    switch ($Kind) {
        'Success' { $statusText.Foreground = '#1D6B3A' }
        'Warning' { $statusText.Foreground = '#8A5B13' }
        'Error' { $statusText.Foreground = '#9B2525' }
        default { $statusText.Foreground = '#445064' }
    }
}

function Show-Confirm {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Text,

        [Parameter(Mandatory = $true)]
        [string]$Title,

        [string]$Buttons = 'YesNo',

        [string]$Icon = 'Warning'
    )

    $script:ModalOpen = $true
    try {
        return [System.Windows.MessageBox]::Show($window, $Text, $Title, [System.Windows.MessageBoxButton]$Buttons, [System.Windows.MessageBoxImage]$Icon)
    }
    finally {
        $script:ModalOpen = $false
    }
}

function Get-ObjectProperty {
    param(
        [object]$InputObject,
        [string]$Name
    )

    if ($null -eq $InputObject) {
        return $null
    }
    $property = $InputObject.PSObject.Properties | Where-Object { $_.Name -ieq $Name } | Select-Object -First 1
    if ($null -eq $property) {
        return $null
    }
    return $property.Value
}

function Get-MaxPromptCharacters {
    $value = 0
    try {
        $value = [int]$script:Settings.maxPromptCharacters
    }
    catch {
        $value = 0
    }
    if ($value -le 0) {
        return 20000
    }
    return $value
}

function Get-AutoSendMode {
    $mode = ''
    try {
        $mode = [string]$script:Settings.autoSendMode
    }
    catch {
        $mode = ''
    }
    if ($mode -ieq 'interactive') {
        return 'interactive'
    }
    return 'print'
}

function Get-PrintTimeoutMinutes {
    $value = 0
    try {
        $value = [int]$script:Settings.printTimeoutMinutes
    }
    catch {
        $value = 0
    }
    if ($value -lt 1 -or $value -gt 720) {
        return 10
    }
    return $value
}

function Get-AutoSendConcurrency {
    $value = 0
    try {
        $value = [int]$script:Settings.autoSendConcurrency
    }
    catch {
        $value = 0
    }
    if ($value -lt 1 -or $value -gt 4) {
        return 2
    }
    return $value
}

function Get-AutoSendModel {
    $value = ''
    try {
        $value = [string]$script:Settings.autoSendModel
    }
    catch {
        $value = ''
    }
    return $value.Trim()
}

function Format-Snippet {
    param(
        [Parameter(Mandatory = $true)]
        [AllowEmptyString()]
        [string]$Text
    )

    $line = ''
    foreach ($candidate in ($Text -split "`n")) {
        $trimmed = $candidate.Trim()
        if (-not [string]::IsNullOrEmpty($trimmed)) {
            $line = $trimmed
            break
        }
    }
    if ($line.Length -gt 70) {
        return ($line.Substring(0, 70) + '...')
    }
    return $line
}

function Get-QueueFileStamp {
    try {
        $info = Get-Item -LiteralPath $paths.QueuePath -ErrorAction Stop
        return "$($info.LastWriteTimeUtc.Ticks)|$($info.Length)"
    }
    catch {
        return 'missing'
    }
}

function Read-QueueState {
    $script:QueueStamp = Get-QueueFileStamp
    try {
        $script:AllEntries = @(Get-QueueEntries -Path $paths.QueuePath)
        $script:QueueError = $null
    }
    catch {
        $script:AllEntries = @()
        $script:QueueError = $_.Exception.Message
    }
}

function Get-PromptinatorRepo {
    $configured = ''
    try {
        $configured = ([string]$script:Settings.promptinatorRepo).Trim()
    }
    catch {
        $configured = ''
    }
    if (-not [string]::IsNullOrEmpty($configured)) {
        return $configured
    }
    # The launcher lives at <repo>\launcher\app, so the repository is two up.
    return (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))
}

function Get-PromptinatorClaimant {
    try {
        $value = ([string]$script:Settings.promptinatorClaimant).Trim()
        if (-not [string]::IsNullOrEmpty($value)) {
            return $value
        }
    }
    catch {
    }
    return 'Queue Launcher'
}

function Test-PromptinatorReady {
    if ($promptinatorCheck.IsChecked -ne $true) {
        return $false
    }
    $toolPath = Join-Path (Get-PromptinatorRepo) 'tools\claim-next-prompt.mjs'
    return (Test-Path -LiteralPath $toolPath)
}

function Update-PromptinatorView {
    # Refreshes the cached read-only view of Ready Promptinator entries.
    # Returns $true when the visible rows changed and the list should redraw.
    param([switch]$Force)

    if ($promptinatorCheck.IsChecked -ne $true) {
        $hadRows = $null -ne $script:PromptinatorView
        $script:PromptinatorView = $null
        $script:PromptinatorStamp = ''
        return $hadRows
    }

    $storePath = Join-Path (Get-PromptinatorRepo) 'workspace\promptinator\store.json'
    $stamp = 'missing'
    try {
        $info = Get-Item -LiteralPath $storePath -ErrorAction Stop
        $stamp = "$($info.LastWriteTimeUtc.Ticks)|$($info.Length)"
    }
    catch {
        $stamp = 'missing'
    }
    if (-not $Force -and $stamp -ceq $script:PromptinatorStamp -and $null -ne $script:PromptinatorView) {
        return $false
    }
    $script:PromptinatorStamp = $stamp
    $script:PromptinatorView = Get-PromptinatorReadyEntries -RepoPath (Get-PromptinatorRepo)
    return $true
}

function Update-SendAvailability {
    $workingDirectoryValue = [string]$workingDirectoryText.Text
    $validDirectory = (-not [string]::IsNullOrWhiteSpace($workingDirectoryValue)) -and (Test-Path -LiteralPath $workingDirectoryValue -PathType Container)
    $hasAgy = $null -ne (Get-AgyExecutable)
    $guardAllows = $null -ne $script:CreditGuard -and $script:CreditGuard.Allowed
    $hasSource = ($script:AllEntries.Count -gt 0) -or (Test-PromptinatorReady)
    $queueReady = ($null -eq $script:QueueError) -and $hasSource
    $sendButton.IsEnabled = (-not $script:IsSending) -and $queueReady -and $validDirectory -and $hasAgy -and $guardAllows
}

function Update-SelectionState {
    $selected = @($queueList.SelectedItems)
    $filterActive = -not [string]::IsNullOrEmpty([string]$searchText.Text)
    $single = ($selected.Count -eq 1) -and ($null -eq $script:QueueError)

    $moveTopButton.IsEnabled = $single -and -not $filterActive
    $moveUpButton.IsEnabled = $single -and -not $filterActive
    $moveDownButton.IsEnabled = $single -and -not $filterActive
    $editButton.IsEnabled = $single
    $deleteButton.IsEnabled = ($selected.Count -gt 0) -and ($null -eq $script:QueueError)

    if ($null -ne $script:QueueError) {
        $previewText.Text = "The queue file could not be read:`n$($script:QueueError)`n`nUse Repair queue..., or restore a copy from the data\backups folder."
        $charCountText.Text = ''
        return
    }
    if ($selected.Count -gt 0 -and ([string]$selected[0].Id).StartsWith('prompt:')) {
        $moveTopButton.IsEnabled = $false
        $moveUpButton.IsEnabled = $false
        $moveDownButton.IsEnabled = $false
        $editButton.IsEnabled = $false
        $deleteButton.IsEnabled = $false
        $pId = ([string]$selected[0].Id).Substring(7)
        $pName = ''
        if ($null -ne $script:PromptinatorView) {
            $match = @($script:PromptinatorView.Entries) | Where-Object { [string]$_.Id -eq $pId } | Select-Object -First 1
            if ($null -ne $match) {
                $pName = [string]$match.Name
            }
        }
        $previewText.Text = "Promptinator entry $pId ($pName).`n`nThis row is a read-only view of the Promptinator queue. The exact prompt is rendered and claimed at send time, after every local message above it has been sent. Reorder or edit it in the Prompt Spriter Promptinator tab, not here."
        $charCountText.Text = ''
        return
    }
    if ($script:AllEntries.Count -eq 0) {
        $promptinatorRows = 0
        if ($null -ne $script:PromptinatorView) {
            $promptinatorRows = @($script:PromptinatorView.Entries).Count
        }
        if ($promptinatorRows -gt 0) {
            $previewText.Text = "The local queue is empty. $promptinatorRows Promptinator entr$(if ($promptinatorRows -eq 1) { 'y is' } else { 'ies are' }) Ready below - Send next claims the first one."
        }
        else {
            $previewText.Text = 'The queue is empty. Use Add / import messages to load entries.'
        }
        $charCountText.Text = ''
        return
    }
    if ($selected.Count -eq 0) {
        $previewText.Text = 'Select a message on the left to preview it.'
        $charCountText.Text = ''
        return
    }

    $entry = $script:AllEntries | Where-Object { [string]$_.id -eq [string]$selected[0].Id } | Select-Object -First 1
    if ($null -eq $entry) {
        $previewText.Text = ''
        $charCountText.Text = ''
        return
    }
    $text = [string]$entry.text
    $previewText.Text = $text
    $limit = Get-MaxPromptCharacters
    if ($text.Length -gt $limit) {
        $charCountText.Text = ('{0:N0} characters - over the {1:N0} send limit' -f $text.Length, $limit)
        $charCountText.Foreground = '#9B2525'
    }
    else {
        $charCountText.Text = ('{0:N0} characters' -f $text.Length)
        $charCountText.Foreground = '#687386'
    }
}

function Update-QueueList {
    $script:IsRefreshingList = $true
    try {
        $selectedIds = New-Object System.Collections.Generic.List[string]
        foreach ($item in @($queueList.SelectedItems)) {
            $selectedIds.Add([string]$item.Id)
        }

        $filter = [string]$searchText.Text
        $items = New-Object System.Collections.Generic.List[object]
        for ($index = 0; $index -lt $script:AllEntries.Count; $index++) {
            $entry = $script:AllEntries[$index]
            $text = [string]$entry.text
            if (-not [string]::IsNullOrEmpty($filter) -and $text.IndexOf($filter, [System.StringComparison]::OrdinalIgnoreCase) -lt 0) {
                continue
            }
            $listItem = New-Object QueueListItem
            $listItem.Id = [string]$entry.id
            $listItem.Display = ('{0,4}.  {1,9}  {2}' -f ($index + 1), ('{0:N0} ch' -f $text.Length), (Format-Snippet -Text $text))
            $items.Add($listItem)
        }
        $promptinatorShown = 0
        if ($promptinatorCheck.IsChecked -eq $true -and $null -ne $script:PromptinatorView) {
            $badge = if ($script:PromptinatorView.BatchActive) { '[Batch]' } else { '[Ready]' }
            $pOrder = 0
            foreach ($pEntry in @($script:PromptinatorView.Entries)) {
                $pOrder++
                $pText = "$($pEntry.Id)  $($pEntry.Name)"
                if (-not [string]::IsNullOrEmpty($filter) -and $pText.IndexOf($filter, [System.StringComparison]::OrdinalIgnoreCase) -lt 0) {
                    continue
                }
                $listItem = New-Object QueueListItem
                $listItem.Id = "prompt:$($pEntry.Id)"
                $listItem.Display = ('{0,4}.  {1,9}  {2}' -f ($script:AllEntries.Count + $pOrder), $badge, $pText)
                $items.Add($listItem)
                $promptinatorShown++
            }
        }
        $queueList.ItemsSource = $items

        $count = $script:AllEntries.Count
        if ($null -ne $script:QueueError) {
            $pendingText.Text = 'Queue error'
            $window.Title = 'Antigravity Queue Launcher - queue error'
            $repairButton.Visibility = [System.Windows.Visibility]::Visible
        }
        else {
            $pendingLabel = if ($count -eq 1) { '1 pending' } else { "$count pending" }
            if ($promptinatorShown -gt 0) {
                $sourceWord = if ($script:PromptinatorView.BatchActive) { 'in the active test batch' } else { 'Ready in Promptinator' }
                $pendingText.Text = "$pendingLabel + $promptinatorShown $sourceWord"
                $window.Title = "Antigravity Queue Launcher - $count pending + $promptinatorShown Promptinator"
            }
            else {
                $pendingText.Text = $pendingLabel
                $window.Title = "Antigravity Queue Launcher - $count pending"
            }
            $repairButton.Visibility = [System.Windows.Visibility]::Collapsed
        }

        if ($selectedIds.Count -gt 0) {
            foreach ($item in $items) {
                if ($selectedIds.Contains([string]$item.Id)) {
                    [void]$queueList.SelectedItems.Add($item)
                }
            }
        }
        if ($queueList.SelectedItems.Count -eq 0 -and $items.Count -gt 0) {
            $queueList.SelectedIndex = 0
        }
        if ($queueList.SelectedItems.Count -gt 0) {
            $queueList.ScrollIntoView($queueList.SelectedItems[0])
        }
    }
    finally {
        $script:IsRefreshingList = $false
    }

    Update-SelectionState
    Update-SendAvailability
}

function Update-QueueView {
    Read-QueueState
    Update-QueueList

    $agyPath = Get-AgyExecutable
    $agyPathText.Text = if ($null -eq $agyPath) { 'agy.exe not found' } else { "CLI: $agyPath" }
}

function Update-CreditGuard {
    try {
        $script:CreditGuard = Test-AgyCreditGuard
        $guardText.Text = $script:CreditGuard.Message
        if ($script:CreditGuard.Allowed) {
            $guardBorder.Background = '#E9F6ED'
            $guardBorder.BorderBrush = '#A7D7B6'
            $guardText.Foreground = '#1D6B3A'
            $guardHintText.Visibility = [System.Windows.Visibility]::Collapsed
        }
        else {
            $guardBorder.Background = '#FDECEC'
            $guardBorder.BorderBrush = '#E6B8B8'
            $guardText.Foreground = '#9B2525'
            $guardHintText.Visibility = [System.Windows.Visibility]::Visible
        }
    }
    catch {
        $script:CreditGuard = [pscustomobject]@{ Allowed = $false; Message = $_.Exception.Message }
        $guardText.Text = "Blocked: the AI-credit setting could not be verified. $($_.Exception.Message)"
        $guardBorder.Background = '#FDECEC'
        $guardBorder.BorderBrush = '#E6B8B8'
        $guardText.Foreground = '#9B2525'
        $guardHintText.Visibility = [System.Windows.Visibility]::Visible
    }
    Update-SendAvailability
}

function Update-RunningState {
    $autoOn = ($autoSendCheck.IsChecked -eq $true)

    $stillActive = New-Object System.Collections.Generic.List[object]
    $pauseReason = $null
    # .ToArray() rather than @(...): wrapping a generic List in the array
    # subexpression throws 'Argument types do not match' under strict mode
    # in Windows PowerShell 5.1.
    foreach ($launch in $script:ActiveLaunches.ToArray()) {
        $idText = [string]$launch.Id
        $shortId = $idText.Substring(0, [Math]::Min(8, $idText.Length))
        $jobExists = Test-Path -LiteralPath $launch.JobPath
        $markerExists = Test-Path -LiteralPath $launch.MarkerPath
        $terminalAlive = Test-ProcessAlive -ProcessId ([int]$launch.ProcessId)

        if ($markerExists) {
            $exitCode = $null
            try {
                $exitCode = [int](([System.IO.File]::ReadAllText($launch.MarkerPath)).Trim())
            }
            catch {
                $exitCode = $null
            }
            Remove-Item -LiteralPath $launch.MarkerPath -Force -ErrorAction SilentlyContinue
            if ($null -ne $exitCode -and $exitCode -ne 0) {
                $script:LastFinishedText = "Conversation $shortId failed with exit code $exitCode."
                $pauseReason = "the conversation for message $shortId exited with code $exitCode. Its output log is in data\logs."
            }
            else {
                $script:LastFinishedText = "Conversation $shortId finished."
            }
            continue
        }
        if (-not $terminalAlive) {
            if ($jobExists) {
                $script:LastFinishedText = "The launch for message $shortId did not complete."
                $pauseReason = "the launch for message $shortId did not complete. Use Undo last to requeue it, or restart the launcher to recover it."
            }
            else {
                $script:LastFinishedText = "Conversation $shortId ended."
            }
            continue
        }
        $stillActive.Add($launch)
    }
    $script:ActiveLaunches = $stillActive

    if ($null -ne $pauseReason -and $autoOn) {
        $autoSendCheck.IsChecked = $false
        $autoOn = $false
        Set-Status -Message "Auto-send paused: $pauseReason Tick auto-send again to continue." -Kind Warning
    }

    if ($autoOn) {
        Invoke-AutoSendIfReady
    }

    if ($script:ActiveLaunches.Count -eq 0) {
        if (-not [string]::IsNullOrEmpty($script:LastFinishedText)) {
            $runningText.Text = "$($script:LastFinishedText) Nothing is running right now."
        }
        elseif ($autoSendCheck.IsChecked -eq $true) {
            $runningText.Text = 'Auto-send is on.'
        }
        else {
            $runningText.Text = 'No conversation has been launched in this session.'
        }
        return
    }

    $idList = @($script:ActiveLaunches | ForEach-Object { ([string]$_.Id).Substring(0, [Math]::Min(8, ([string]$_.Id).Length)) }) -join ', '
    $stuckNote = ''
    foreach ($launch in $script:ActiveLaunches) {
        if ((Test-Path -LiteralPath $launch.JobPath) -and (([DateTimeOffset]::Now - $launch.LaunchedAt).TotalMinutes -gt 3)) {
            $stuckNote = ' One launch has been preparing unusually long - check data\logs if nothing finishes.'
            break
        }
    }
    $conversationWord = if ($script:ActiveLaunches.Count -eq 1) { 'conversation' } else { 'conversations' }
    $runningText.Text = "$($script:ActiveLaunches.Count) $conversationWord running ($idList). Auto-send replies are saved in data\logs.$stuckNote"
}

function Invoke-AutoSendIfReady {
    if ($script:IsSending -or $script:ModalOpen) {
        return
    }
    if ($null -ne $script:QueueError) {
        return
    }
    if ($script:AllEntries.Count -eq 0 -and -not (Test-PromptinatorReady)) {
        if ($script:ActiveLaunches.Count -eq 0 -and $script:AnyAutoLaunchThisSession -and ($autoSendCheck.IsChecked -eq $true)) {
            $autoSendCheck.IsChecked = $false
            Set-Status -Message 'Auto-send finished: the queue is empty.' -Kind Success
        }
        return
    }
    if ($script:ActiveLaunches.Count -ge (Get-AutoSendConcurrency)) {
        return
    }
    if ($script:ActiveLaunches.Count -gt 0) {
        $sinceLastLaunch = [DateTimeOffset]::Now - $script:LastChainLaunchAt
        if ($sinceLastLaunch.TotalSeconds -lt 60) {
            return
        }
    }
    if ($sendButton.IsEnabled) {
        Set-Status -Message 'Auto-send: launching the next message...' -Kind Normal
        Invoke-SendNext -FromAutoSend
    }
}

function Invoke-PeriodicRefresh {
    if ($script:IsSending -or $script:ModalOpen) {
        return
    }
    try {
        Update-CreditGuard
        if ((Get-QueueFileStamp) -cne $script:QueueStamp) {
            Update-QueueView
        }
        if (Update-PromptinatorView) {
            Update-QueueList
        }
        Update-RunningState
    }
    catch {
    }
}

function Invoke-SendNext {
    param([switch]$FromAutoSend)

    if ($script:IsSending) {
        return
    }

    $script:IsSending = $true
    $sendButton.IsEnabled = $false
    $queueRemoved = $false
    $processStarted = $false
    $jobPath = $null
    $entry = $null
    $clipboardWarning = $null

    try {
        Update-CreditGuard
        if (-not $script:CreditGuard.Allowed) {
            throw $script:CreditGuard.Message
        }

        $workingDirectory = $workingDirectoryText.Text.Trim()
        if ([string]::IsNullOrWhiteSpace($workingDirectory) -or -not (Test-Path -LiteralPath $workingDirectory -PathType Container)) {
            throw 'Choose an existing working folder before sending.'
        }

        $agyPath = Get-AgyExecutable
        if ($null -eq $agyPath) {
            throw 'agy.exe was not found. Antigravity CLI must be installed first.'
        }

        $entries = @(Get-QueueEntries -Path $paths.QueuePath)
        $fromPromptinator = $false
        if ($entries.Count -gt 0) {
            $entry = $entries[0]
        }
        elseif (Test-PromptinatorReady) {
            Set-Status -Message 'Claiming the next Ready Promptinator entry...' -Kind Normal
            $claim = Request-PromptinatorClaim -RepoPath (Get-PromptinatorRepo) -Claimant (Get-PromptinatorClaimant)
            if (-not $claim.Ok) {
                if ($claim.NoWork) {
                    throw 'Promptinator has no Ready entries to claim.'
                }
                throw "The Promptinator claim failed:`n$($claim.Message)"
            }
            $entry = New-QueueEntry -Text $claim.Text
            $fromPromptinator = $true
        }
        else {
            throw 'The queue is empty.'
        }

        $prompt = [string]$entry.text
        $limit = Get-MaxPromptCharacters
        if ($prompt.Length -gt $limit) {
            throw "This message is $($prompt.Length) characters. The safe limit is $limit characters. Edit the message or split it before sending."
        }

        try {
            [System.Windows.Clipboard]::SetText($prompt)
        }
        catch {
            $clipboardWarning = $_.Exception.Message
        }

        $jobPath = Join-Path $paths.InflightDirectory ("$($entry.id).json")
        $markerPath = Join-Path $paths.InflightDirectory ("$($entry.id).done")
        if (Test-Path -LiteralPath $markerPath) {
            Remove-Item -LiteralPath $markerPath -Force -ErrorAction SilentlyContinue
        }
        $useAutoChain = ($autoSendCheck.IsChecked -eq $true)
        $jobMode = 'interactive'
        if ($useAutoChain -and (Get-AutoSendMode) -eq 'print') {
            $jobMode = 'print'
        }
        $job = [ordered]@{
            version = 1
            id = [string]$entry.id
            text = $prompt
            workingDirectory = $workingDirectory
            agyPath = $agyPath
            createdAt = [DateTimeOffset]::Now.ToString('o')
            autoCloseOnSuccess = $useAutoChain
            mode = $jobMode
            model = (Get-AutoSendModel)
            printTimeoutMinutes = Get-PrintTimeoutMinutes
        }
        Write-Utf8FileAtomic -Path $jobPath -Content ($job | ConvertTo-Json -Depth 8)

        if ($fromPromptinator) {
            # The claim never sat in queue.json, but marking it removed makes
            # the failure path below restore the exact claimed prompt to the
            # queue front, which is the documented claim-resume path.
            $queueRemoved = $true
        }
        else {
            $remainingEntries = @($entries | Select-Object -Skip 1)
            Save-QueueEntries -Path $paths.QueuePath -Entries $remainingEntries
            $queueRemoved = $true
        }

        $escapedRunner = $runnerPath.Replace("'", "''")
        $escapedJob = $jobPath.Replace("'", "''")
        $childCommand = "& '$escapedRunner' -JobPath '$escapedJob'"
        $encodedCommand = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($childCommand))
        $powershellExe = Join-Path $env:WINDIR 'System32\WindowsPowerShell\v1.0\powershell.exe'

        if ($jobMode -eq 'print') {
            # Chained conversations need no window: they run hidden, and the
            # reply lands in data\logs. Without -NoExit nothing lingers.
            $argumentLine = "-NoLogo -NoProfile -ExecutionPolicy Bypass -EncodedCommand $encodedCommand"
            $process = Start-Process -FilePath $powershellExe -ArgumentList $argumentLine -WorkingDirectory $workingDirectory -WindowStyle Hidden -PassThru
        }
        else {
            $argumentLine = "-NoLogo -NoProfile -NoExit -ExecutionPolicy Bypass -EncodedCommand $encodedCommand"
            $process = Start-Process -FilePath $powershellExe -ArgumentList $argumentLine -WorkingDirectory $workingDirectory -PassThru
        }
        $processStarted = $true
        [void]$script:ActiveLaunches.Add(@{
            Id = [string]$entry.id
            JobPath = $jobPath
            MarkerPath = $markerPath
            ProcessId = [int]$process.Id
            Mode = $jobMode
            LaunchedAt = [DateTimeOffset]::Now
        })
        $script:LastChainLaunchAt = [DateTimeOffset]::Now
        if ($FromAutoSend) {
            $script:AnyAutoLaunchThisSession = $true
        }

        $historyWarning = $null
        try {
            Add-SentRecord -Path $paths.SentPath -Entry $entry -WorkingDirectory $workingDirectory -ProcessId $process.Id
        }
        catch {
            $historyWarning = $_.Exception.Message
        }

        $script:Settings.workingDirectory = $workingDirectory
        Save-LauncherSettings -Settings $script:Settings
        Update-QueueView
        Update-RunningState

        $statusMessage = if ($fromPromptinator) {
            "Launched a fresh Antigravity conversation for Promptinator entry $($claim.EntryId)."
        }
        else {
            "Launched a fresh Antigravity conversation for message $($entry.id.Substring(0, 8))."
        }
        $statusKind = 'Success'
        if ($null -eq $clipboardWarning) {
            $statusMessage += ' The message is also on your clipboard.'
        }
        else {
            $statusMessage += ' (The clipboard copy failed, but the launch continued.)'
            $statusKind = 'Warning'
        }
        if ($null -ne $historyWarning) {
            $statusMessage += " Sent history could not be recorded: $historyWarning"
            $statusKind = 'Warning'
        }
        Set-Status -Message $statusMessage -Kind $statusKind
    }
    catch {
        if ($queueRemoved -and -not $processStarted -and $null -ne $entry) {
            try {
                $currentEntries = @(Get-QueueEntries -Path $paths.QueuePath)
                Save-QueueEntries -Path $paths.QueuePath -Entries (@($entry) + $currentEntries)
            }
            catch {
                [System.Windows.MessageBox]::Show(
                    $window,
                    "The launch failed and automatic queue restoration also failed. Your message remains recoverable in:`n$jobPath`n`n$($_.Exception.Message)",
                    'Recovery required',
                    [System.Windows.MessageBoxButton]::OK,
                    [System.Windows.MessageBoxImage]::Error
                ) | Out-Null
            }
        }

        if (-not $processStarted -and $null -ne $jobPath -and (Test-Path -LiteralPath $jobPath)) {
            Remove-Item -LiteralPath $jobPath -Force -ErrorAction SilentlyContinue
        }

        Update-QueueView
        if ($FromAutoSend) {
            $autoSendCheck.IsChecked = $false
            if ($_.Exception.Message -match 'no Ready entries') {
                Set-Status -Message 'Auto-send finished: the queue is empty and Promptinator has no Ready entries to claim.' -Kind Success
            }
            else {
                Set-Status -Message "Auto-send stopped: $($_.Exception.Message)" -Kind Error
            }
        }
        else {
            Set-Status -Message "Send blocked or failed: $($_.Exception.Message)" -Kind Error
            [System.Windows.MessageBox]::Show(
                $window,
                $_.Exception.Message,
                'Message not launched',
                [System.Windows.MessageBoxButton]::OK,
                [System.Windows.MessageBoxImage]::Error
            ) | Out-Null
        }
    }
    finally {
        $script:IsSending = $false
        Update-SendAvailability
    }
}

function Move-SelectedEntry {
    param(
        [ValidateSet('top', 'up', 'down')]
        [string]$Direction
    )

    $selected = @($queueList.SelectedItems)
    if ($selected.Count -ne 1 -or $null -ne $script:QueueError) {
        return
    }
    $id = [string]$selected[0].Id

    try {
        $entries = @(Get-QueueEntries -Path $paths.QueuePath)
        $index = -1
        for ($position = 0; $position -lt $entries.Count; $position++) {
            if ([string]$entries[$position].id -eq $id) {
                $index = $position
                break
            }
        }
        if ($index -lt 0) {
            Update-QueueView
            return
        }

        $list = [System.Collections.Generic.List[object]]::new()
        foreach ($existing in $entries) {
            $list.Add($existing)
        }

        switch ($Direction) {
            'top' {
                if ($index -eq 0) { return }
                $list.RemoveAt($index)
                $list.Insert(0, $entries[$index])
            }
            'up' {
                if ($index -eq 0) { return }
                $list.RemoveAt($index)
                $list.Insert($index - 1, $entries[$index])
            }
            'down' {
                if ($index -ge ($entries.Count - 1)) { return }
                $list.RemoveAt($index)
                $list.Insert($index + 1, $entries[$index])
            }
        }

        Save-QueueEntries -Path $paths.QueuePath -Entries $list.ToArray()
        Update-QueueView
        $phrase = switch ($Direction) {
            'top' { 'to the top' }
            'up' { 'up one place' }
            'down' { 'down one place' }
        }
        Set-Status -Message "Moved message $($id.Substring(0, 8)) $phrase." -Kind Normal
    }
    catch {
        Set-Status -Message "Move failed: $($_.Exception.Message)" -Kind Error
    }
}

function Invoke-DeleteSelected {
    $selected = @($queueList.SelectedItems)
    if ($selected.Count -eq 0 -or $null -ne $script:QueueError) {
        return
    }

    $confirmation = Show-Confirm -Text "Delete $($selected.Count) selected message(s) from the queue?`n`nA backup copy of the queue is kept in data\backups." -Title 'Delete messages' -Buttons 'YesNo' -Icon 'Warning'
    if ($confirmation -ne [System.Windows.MessageBoxResult]::Yes) {
        return
    }

    try {
        Backup-QueueFile -QueuePath $paths.QueuePath -BackupDirectory $backupDirectory -Reason 'delete' | Out-Null
        $ids = New-Object 'System.Collections.Generic.HashSet[string]'
        foreach ($item in $selected) {
            [void]$ids.Add([string]$item.Id)
        }
        $entries = @(Get-QueueEntries -Path $paths.QueuePath)
        $remaining = @($entries | Where-Object { -not $ids.Contains([string]$_.id) })
        Save-QueueEntries -Path $paths.QueuePath -Entries $remaining
        Update-QueueView
        Set-Status -Message "Deleted $($entries.Count - $remaining.Count) message(s)." -Kind Success
    }
    catch {
        Set-Status -Message "Delete failed: $($_.Exception.Message)" -Kind Error
    }
}

function Show-EditDialog {
    param(
        [Parameter(Mandatory = $true)]
        [System.Windows.Window]$Owner,

        [Parameter(Mandatory = $true)]
        [AllowEmptyString()]
        [string]$Text
    )

    [xml]$editXaml = @'
<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="Edit message" Height="540" Width="720"
        WindowStartupLocation="CenterOwner" ResizeMode="CanResizeWithGrip"
        Background="#F6F7FB" FontFamily="Segoe UI">
  <Grid Margin="20">
    <Grid.RowDefinitions>
      <RowDefinition Height="Auto"/>
      <RowDefinition Height="*"/>
      <RowDefinition Height="Auto"/>
      <RowDefinition Height="Auto"/>
    </Grid.RowDefinitions>
    <TextBlock Grid.Row="0" Margin="0,0,0,10" TextWrapping="Wrap"
               Text="Edit the message text. The message keeps its place in the queue."/>
    <TextBox x:Name="EditText" Grid.Row="1" AcceptsReturn="True" AcceptsTab="True"
             VerticalScrollBarVisibility="Auto" HorizontalScrollBarVisibility="Auto"
             TextWrapping="NoWrap" FontFamily="Consolas" FontSize="13" Padding="8"/>
    <TextBlock x:Name="EditCountText" Grid.Row="2" Margin="0,10,0,10" Foreground="#556070"/>
    <StackPanel Grid.Row="3" Orientation="Horizontal" HorizontalAlignment="Right">
      <Button x:Name="CancelButton" Width="90" Margin="0,0,10,0" Padding="8,5" IsCancel="True" Content="Cancel"/>
      <Button x:Name="SaveButton" Width="110" Padding="8,5" IsDefault="True" Content="Save changes"/>
    </StackPanel>
  </Grid>
</Window>
'@

    $editReader = New-Object System.Xml.XmlNodeReader $editXaml
    $dialog = [System.Windows.Markup.XamlReader]::Load($editReader)
    $dialog.Owner = $Owner
    $inputBox = $dialog.FindName('EditText')
    $countText = $dialog.FindName('EditCountText')
    $saveButton = $dialog.FindName('SaveButton')

    $limit = Get-MaxPromptCharacters
    $updateCount = {
        $length = $inputBox.Text.Replace("`r`n", "`n").Length
        if ($length -gt $limit) {
            $countText.Text = ('{0:N0} characters - over the {1:N0} send limit' -f $length, $limit)
            $countText.Foreground = '#9B2525'
        }
        else {
            $countText.Text = ('{0:N0} characters' -f $length)
            $countText.Foreground = '#556070'
        }
    }
    $inputBox.Add_TextChanged($updateCount)
    $inputBox.Text = $Text
    & $updateCount

    $saveButton.Add_Click({
        $normalized = $inputBox.Text.Replace("`r`n", "`n").Replace("`r", "`n")
        if ([string]::IsNullOrWhiteSpace($normalized)) {
            [System.Windows.MessageBox]::Show(
                $dialog,
                'The message text cannot be empty.',
                'Nothing to save',
                [System.Windows.MessageBoxButton]::OK,
                [System.Windows.MessageBoxImage]::Information
            ) | Out-Null
            return
        }
        $dialog.Tag = $normalized
        $dialog.DialogResult = $true
    })

    $inputBox.Focus() | Out-Null
    $script:ModalOpen = $true
    try {
        $result = $dialog.ShowDialog()
    }
    finally {
        $script:ModalOpen = $false
    }
    if ($result -eq $true) {
        return [string]$dialog.Tag
    }
    return $null
}

function Invoke-EditSelected {
    $selected = @($queueList.SelectedItems)
    if ($selected.Count -ne 1 -or $null -ne $script:QueueError) {
        return
    }
    $id = [string]$selected[0].Id

    try {
        $entries = @(Get-QueueEntries -Path $paths.QueuePath)
        $target = $entries | Where-Object { [string]$_.id -eq $id } | Select-Object -First 1
        if ($null -eq $target) {
            Update-QueueView
            return
        }

        $newText = Show-EditDialog -Owner $window -Text ([string]$target.text)
        if ($null -eq $newText) {
            return
        }

        Backup-QueueFile -QueuePath $paths.QueuePath -BackupDirectory $backupDirectory -Reason 'edit' | Out-Null
        $entries = @(Get-QueueEntries -Path $paths.QueuePath)
        $target = $entries | Where-Object { [string]$_.id -eq $id } | Select-Object -First 1
        if ($null -eq $target) {
            Set-Status -Message 'That message no longer exists in the queue.' -Kind Warning
            Update-QueueView
            return
        }
        $target.text = $newText
        Save-QueueEntries -Path $paths.QueuePath -Entries $entries
        Update-QueueView
        Set-Status -Message "Updated message $($id.Substring(0, 8))." -Kind Success
    }
    catch {
        Set-Status -Message "Edit failed: $($_.Exception.Message)" -Kind Error
    }
}

function Show-ImportDialog {
    param(
        [Parameter(Mandatory = $true)]
        [System.Windows.Window]$Owner,

        [Parameter(Mandatory = $true)]
        [string]$DefaultDelimiter
    )

    [xml]$importXaml = @'
<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="Add or import messages" Height="600" Width="740"
        WindowStartupLocation="CenterOwner" ResizeMode="CanResizeWithGrip"
        Background="#F6F7FB" FontFamily="Segoe UI">
  <Grid Margin="20">
    <Grid.RowDefinitions>
      <RowDefinition Height="Auto"/>
      <RowDefinition Height="*"/>
      <RowDefinition Height="Auto"/>
      <RowDefinition Height="Auto"/>
      <RowDefinition Height="Auto"/>
    </Grid.RowDefinitions>
    <TextBlock Grid.Row="0" Margin="0,0,0,10" TextWrapping="Wrap"
               Text="Paste one message, or paste many messages separated by the delimiter shown below. Multiline messages are supported."/>
    <TextBox x:Name="ImportText" Grid.Row="1" AcceptsReturn="True" AcceptsTab="True"
             VerticalScrollBarVisibility="Auto" HorizontalScrollBarVisibility="Auto"
             TextWrapping="NoWrap" FontFamily="Consolas" FontSize="13" Padding="8"/>
    <Grid Grid.Row="2" Margin="0,12,0,8">
      <Grid.ColumnDefinitions>
        <ColumnDefinition Width="Auto"/>
        <ColumnDefinition Width="*"/>
      </Grid.ColumnDefinitions>
      <TextBlock Grid.Column="0" VerticalAlignment="Center" Margin="0,0,10,0" Text="Message delimiter:"/>
      <TextBox x:Name="DelimiterText" Grid.Column="1" Padding="6"/>
    </Grid>
    <TextBlock x:Name="ImportCountText" Grid.Row="3" Margin="0,0,0,12" Foreground="#556070" FontWeight="SemiBold"/>
    <StackPanel Grid.Row="4" Orientation="Horizontal" HorizontalAlignment="Right">
      <Button x:Name="CancelButton" Width="90" Margin="0,0,10,0" Padding="8,5" IsCancel="True" Content="Cancel"/>
      <Button x:Name="ImportButton" Width="110" Padding="8,5" IsDefault="True" Content="Add to queue"/>
    </StackPanel>
  </Grid>
</Window>
'@

    $importReader = New-Object System.Xml.XmlNodeReader $importXaml
    $dialog = [System.Windows.Markup.XamlReader]::Load($importReader)
    $dialog.Owner = $Owner
    $inputBox = $dialog.FindName('ImportText')
    $delimiterBox = $dialog.FindName('DelimiterText')
    $countText = $dialog.FindName('ImportCountText')
    $importActionButton = $dialog.FindName('ImportButton')
    $delimiterBox.Text = $DefaultDelimiter

    $updateCount = {
        $messageCount = 0
        try {
            $messageCount = @(ConvertFrom-BulkPromptText -Text $inputBox.Text -Delimiter $delimiterBox.Text).Count
        }
        catch {
            $messageCount = 0
        }
        $countText.Text = "This will add $messageCount message(s) to the end of the queue."
    }
    $inputBox.Add_TextChanged($updateCount)
    $delimiterBox.Add_TextChanged($updateCount)
    & $updateCount

    $importActionButton.Add_Click({
        if ([string]::IsNullOrWhiteSpace($inputBox.Text)) {
            [System.Windows.MessageBox]::Show(
                $dialog,
                'Paste at least one message first.',
                'Nothing to import',
                [System.Windows.MessageBoxButton]::OK,
                [System.Windows.MessageBoxImage]::Information
            ) | Out-Null
            return
        }

        $dialog.Tag = [pscustomobject]@{
            Text = $inputBox.Text
            Delimiter = $delimiterBox.Text
        }
        $dialog.DialogResult = $true
    })

    $inputBox.Focus() | Out-Null
    $script:ModalOpen = $true
    try {
        $result = $dialog.ShowDialog()
    }
    finally {
        $script:ModalOpen = $false
    }
    if ($result -eq $true) {
        return $dialog.Tag
    }
    return $null
}

function Invoke-ImportFlow {
    try {
        $result = Show-ImportDialog -Owner $window -DefaultDelimiter ([string]$script:Settings.delimiter)
        if ($null -eq $result) {
            return
        }

        $messages = @(ConvertFrom-BulkPromptText -Text $result.Text -Delimiter $result.Delimiter)
        if ($messages.Count -eq 0) {
            throw 'No non-empty messages were found.'
        }

        $entries = @(Get-QueueEntries -Path $paths.QueuePath)
        $existingTexts = New-Object 'System.Collections.Generic.HashSet[string]'
        foreach ($entry in $entries) {
            [void]$existingTexts.Add([string]$entry.text)
        }

        $batchSeen = New-Object 'System.Collections.Generic.HashSet[string]'
        $newMessages = New-Object System.Collections.Generic.List[string]
        $duplicateCount = 0
        foreach ($message in $messages) {
            if ($existingTexts.Contains($message) -or -not $batchSeen.Add($message)) {
                $duplicateCount++
            }
            else {
                $newMessages.Add($message)
            }
        }

        $toAdd = $messages
        if ($duplicateCount -gt 0) {
            $choice = Show-Confirm -Text "$duplicateCount of the $($messages.Count) pasted message(s) are exact duplicates of messages already queued (or repeated in the paste).`n`nYes = add everything anyway.`nNo = add only the $($newMessages.Count) new message(s).`nCancel = import nothing." -Title 'Duplicates found' -Buttons 'YesNoCancel' -Icon 'Warning'
            if ($choice -eq [System.Windows.MessageBoxResult]::Cancel) {
                Set-Status -Message 'Import cancelled.' -Kind Normal
                return
            }
            if ($choice -eq [System.Windows.MessageBoxResult]::No) {
                $toAdd = @($newMessages.ToArray())
                if ($toAdd.Count -eq 0) {
                    Set-Status -Message 'Nothing new to add - every pasted message was already queued.' -Kind Warning
                    return
                }
            }
        }

        Backup-QueueFile -QueuePath $paths.QueuePath -BackupDirectory $backupDirectory -Reason 'import' -Force | Out-Null

        foreach ($message in $toAdd) {
            $entries += New-QueueEntry -Text $message
        }
        Save-QueueEntries -Path $paths.QueuePath -Entries $entries

        $script:Settings.delimiter = [string]$result.Delimiter
        Save-LauncherSettings -Settings $script:Settings
        Update-QueueView
        $skippedNote = if ($toAdd.Count -lt $messages.Count) { " ($($messages.Count - $toAdd.Count) duplicate(s) skipped)" } else { '' }
        Set-Status -Message "Added $($toAdd.Count) message(s) to the end of the queue.$skippedNote" -Kind Success
    }
    catch {
        Show-Confirm -Text $_.Exception.Message -Title 'Import failed' -Buttons 'OK' -Icon 'Error' | Out-Null
        Set-Status -Message "Import failed: $($_.Exception.Message)" -Kind Error
    }
}

function Invoke-UndoLast {
    $confirmation = Show-Confirm -Text "Return the last launched message to the front of the queue?`n`nThis does not cancel the Antigravity conversation that was already opened." -Title 'Undo last launch' -Buttons 'YesNo' -Icon 'Warning'
    if ($confirmation -ne [System.Windows.MessageBoxResult]::Yes) {
        return
    }

    try {
        $result = Undo-LastSentEntry -QueuePath $paths.QueuePath -SentPath $paths.SentPath
        if ($result.Restored -and $null -ne $result.Entry) {
            $restoredJobPath = Join-Path $paths.InflightDirectory ("$($result.Entry.id).json")
            if (Test-Path -LiteralPath $restoredJobPath) {
                Remove-Item -LiteralPath $restoredJobPath -Force -ErrorAction SilentlyContinue
            }
            foreach ($staleLaunch in @($script:ActiveLaunches | Where-Object { [string]$_.Id -eq [string]$result.Entry.id })) {
                [void]$script:ActiveLaunches.Remove($staleLaunch)
            }
        }
        Update-QueueView
        Update-RunningState
        Set-Status -Message $result.Message -Kind $(if ($result.Restored) { 'Success' } else { 'Normal' })
    }
    catch {
        Set-Status -Message "Undo failed: $($_.Exception.Message)" -Kind Error
    }
}

function Show-HistoryDialog {
    [xml]$historyXaml = @'
<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="Sent history" Height="560" Width="860"
        WindowStartupLocation="CenterOwner" ResizeMode="CanResizeWithGrip"
        Background="#F6F7FB" FontFamily="Segoe UI">
  <Grid Margin="20">
    <Grid.RowDefinitions>
      <RowDefinition Height="Auto"/>
      <RowDefinition Height="*"/>
      <RowDefinition Height="Auto"/>
    </Grid.RowDefinitions>
    <TextBlock x:Name="HistoryInfoText" Grid.Row="0" Margin="0,0,0,10" TextWrapping="Wrap"
               Text="Messages whose terminal was launched, newest first. Restoring returns a message to the front of the queue."/>
    <ListBox x:Name="HistoryList" Grid.Row="1" FontFamily="Consolas" FontSize="12"
             BorderBrush="#C8D0DE" Background="White"
             ScrollViewer.HorizontalScrollBarVisibility="Auto" ScrollViewer.VerticalScrollBarVisibility="Auto"/>
    <Grid Grid.Row="2" Margin="0,14,0,0">
      <Grid.ColumnDefinitions>
        <ColumnDefinition Width="*"/>
        <ColumnDefinition Width="Auto"/>
      </Grid.ColumnDefinitions>
      <StackPanel Grid.Column="0" Orientation="Horizontal">
        <Button x:Name="RestoreButton" Content="Restore to queue front" Padding="12,6" Margin="0,0,10,0"/>
        <Button x:Name="ClearButton" Content="Clear history..." Padding="12,6"/>
      </StackPanel>
      <Button x:Name="CloseButton" Grid.Column="1" Content="Close" Width="90" Padding="8,5" IsCancel="True"/>
    </Grid>
  </Grid>
</Window>
'@

    $historyReader = New-Object System.Xml.XmlNodeReader $historyXaml
    $dialog = [System.Windows.Markup.XamlReader]::Load($historyReader)
    $dialog.Owner = $window
    $historyList = $dialog.FindName('HistoryList')
    $historyInfoText = $dialog.FindName('HistoryInfoText')
    $restoreButton = $dialog.FindName('RestoreButton')
    $clearButton = $dialog.FindName('ClearButton')
    $closeButton = $dialog.FindName('CloseButton')

    $loadHistory = {
        $items = New-Object System.Collections.Generic.List[object]
        foreach ($sentItem in @(Get-SentRecords -Path $paths.SentPath)) {
            $listItem = New-Object QueueListItem
            if (-not $sentItem.Valid) {
                $listItem.Id = ''
                $listItem.Display = '(unreadable history entry)'
                $items.Add($listItem)
                continue
            }

            $record = $sentItem.Record
            $entryValue = Get-ObjectProperty -InputObject $record -Name 'entry'
            $entryId = [string](Get-ObjectProperty -InputObject $entryValue -Name 'id')
            $entryText = [string](Get-ObjectProperty -InputObject $entryValue -Name 'text')
            $launchedAt = [string](Get-ObjectProperty -InputObject $record -Name 'launchedAt')

            $timeLabel = $launchedAt
            try {
                $timeLabel = ([DateTimeOffset]::Parse($launchedAt)).ToLocalTime().ToString('yyyy-MM-dd HH:mm')
            }
            catch {
            }

            $shortId = if ($entryId.Length -ge 8) { $entryId.Substring(0, 8) } else { $entryId }
            $listItem.Id = $entryId
            $listItem.Display = ('{0}  {1}  {2}' -f $timeLabel, $shortId, (Format-Snippet -Text $entryText))
            $items.Add($listItem)
        }
        $items.Reverse()
        $historyList.ItemsSource = $items
        if ($items.Count -gt 0) {
            $historyList.SelectedIndex = 0
        }
        $historyInfoText.Text = "$($items.Count) launched message(s), newest first. Restoring returns a message to the front of the queue."
    }
    & $loadHistory

    $restoreButton.Add_Click({
        $selectedItem = $historyList.SelectedItem
        if ($null -eq $selectedItem -or [string]::IsNullOrWhiteSpace([string]$selectedItem.Id)) {
            [System.Windows.MessageBox]::Show(
                $dialog,
                'Select a restorable history entry first.',
                'Nothing selected',
                [System.Windows.MessageBoxButton]::OK,
                [System.Windows.MessageBoxImage]::Information
            ) | Out-Null
            return
        }

        try {
            $restoreResult = Restore-SentRecordById -QueuePath $paths.QueuePath -SentPath $paths.SentPath -EntryId ([string]$selectedItem.Id)
            if ($restoreResult.Restored) {
                $jobFile = Join-Path $paths.InflightDirectory ("$($selectedItem.Id).json")
                if (Test-Path -LiteralPath $jobFile) {
                    Remove-Item -LiteralPath $jobFile -Force -ErrorAction SilentlyContinue
                }
                foreach ($staleLaunch in @($script:ActiveLaunches | Where-Object { [string]$_.Id -eq [string]$selectedItem.Id })) {
                    [void]$script:ActiveLaunches.Remove($staleLaunch)
                }
                & $loadHistory
                Update-QueueView
                Update-RunningState
                Set-Status -Message $restoreResult.Message -Kind Success
            }
            else {
                [System.Windows.MessageBox]::Show(
                    $dialog,
                    $restoreResult.Message,
                    'Not restored',
                    [System.Windows.MessageBoxButton]::OK,
                    [System.Windows.MessageBoxImage]::Information
                ) | Out-Null
            }
        }
        catch {
            [System.Windows.MessageBox]::Show(
                $dialog,
                $_.Exception.Message,
                'Restore failed',
                [System.Windows.MessageBoxButton]::OK,
                [System.Windows.MessageBoxImage]::Error
            ) | Out-Null
        }
    })

    $clearButton.Add_Click({
        $itemCount = $historyList.Items.Count
        if ($itemCount -eq 0) {
            return
        }
        $clearConfirmation = [System.Windows.MessageBox]::Show(
            $dialog,
            "Permanently clear all $itemCount sent-history record(s)?`n`nCleared records can no longer be restored to the queue.",
            'Clear history',
            [System.Windows.MessageBoxButton]::YesNo,
            [System.Windows.MessageBoxImage]::Warning
        )
        if ($clearConfirmation -ne [System.Windows.MessageBoxResult]::Yes) {
            return
        }
        try {
            Clear-SentHistory -Path $paths.SentPath
            & $loadHistory
            Set-Status -Message 'Sent history cleared.' -Kind Normal
        }
        catch {
            [System.Windows.MessageBox]::Show(
                $dialog,
                $_.Exception.Message,
                'Clear failed',
                [System.Windows.MessageBoxButton]::OK,
                [System.Windows.MessageBoxImage]::Error
            ) | Out-Null
        }
    })

    $closeButton.Add_Click({
        $dialog.Close()
    })

    $script:ModalOpen = $true
    try {
        [void]$dialog.ShowDialog()
    }
    finally {
        $script:ModalOpen = $false
    }
    Update-QueueView
}

function Invoke-RepairFlow {
    $confirmation = Show-Confirm -Text "Attempt to repair the queue file?`n`nValid messages are kept, unreadable ones are moved to a quarantine file, and a backup of the current file is saved first in data\backups." -Title 'Repair queue' -Buttons 'YesNo' -Icon 'Warning'
    if ($confirmation -ne [System.Windows.MessageBoxResult]::Yes) {
        return
    }

    try {
        Backup-QueueFile -QueuePath $paths.QueuePath -BackupDirectory $backupDirectory -Reason 'repair' -Force | Out-Null
        $result = Repair-QueueFile -QueuePath $paths.QueuePath -QuarantineDirectory $backupDirectory
        Update-QueueView
        if ($result.Repaired) {
            $message = $result.Message
            if ($null -ne $result.QuarantinePath) {
                $message += " Quarantined entries were saved to $($result.QuarantinePath)."
            }
            Set-Status -Message $message -Kind Success
        }
        else {
            Set-Status -Message $result.Message -Kind Error
        }
    }
    catch {
        Set-Status -Message "Repair failed: $($_.Exception.Message)" -Kind Error
    }
}

function Invoke-StartupRecovery {
    try {
        foreach ($marker in @(Get-ChildItem -LiteralPath $paths.InflightDirectory -File -Filter '*.done')) {
            Remove-Item -LiteralPath $marker.FullName -Force -ErrorAction SilentlyContinue
        }
    }
    catch {
    }

    try {
        $logDirectory = Join-Path $dataDirectory 'logs'
        if (Test-Path -LiteralPath $logDirectory -PathType Container) {
            $logFiles = @(Get-ChildItem -LiteralPath $logDirectory -File -Filter '*.log' | Sort-Object LastWriteTimeUtc -Descending)
            if ($logFiles.Count -gt 200) {
                foreach ($oldLog in ($logFiles | Select-Object -Skip 200)) {
                    Remove-Item -LiteralPath $oldLog.FullName -Force -ErrorAction SilentlyContinue
                }
            }
            foreach ($staleTemp in @(Get-ChildItem -LiteralPath $logDirectory -File -Filter '*.tmp' | Where-Object { $_.LastWriteTimeUtc -lt [DateTime]::UtcNow.AddDays(-1) })) {
                Remove-Item -LiteralPath $staleTemp.FullName -Force -ErrorAction SilentlyContinue
            }
        }
    }
    catch {
    }

    $stranded = @()
    try {
        $stranded = @(Get-StrandedInflightJobs -InflightDirectory $paths.InflightDirectory -SentPath $paths.SentPath)
    }
    catch {
        return
    }

    $restorable = @($stranded | Where-Object { $_.Valid })
    $unreadable = @($stranded | Where-Object { -not $_.Valid })
    $statusPieces = New-Object System.Collections.Generic.List[string]
    $statusKind = 'Normal'

    if ($restorable.Count -gt 0) {
        $confirmation = Show-Confirm -Text "Found $($restorable.Count) message(s) from a previous session that left the queue but whose conversation is no longer running.`n`nReturn them to the front of the queue?" -Title 'Recover stranded messages' -Buttons 'YesNo' -Icon 'Question'
        if ($confirmation -eq [System.Windows.MessageBoxResult]::Yes) {
            $ordered = @($restorable | Sort-Object { [string](Get-ObjectProperty -InputObject $_.Job -Name 'createdAt') } -Descending)
            $restoredCount = 0
            $failedCount = 0
            foreach ($jobInfo in $ordered) {
                try {
                    $restoreResult = Restore-InflightJob -QueuePath $paths.QueuePath -SentPath $paths.SentPath -JobPath $jobInfo.Path
                    if ($restoreResult.Restored) {
                        $restoredCount++
                    }
                }
                catch {
                    $failedCount++
                }
            }
            Update-QueueView
            $statusPieces.Add("Recovered $restoredCount stranded message(s) back into the queue.")
            $statusKind = 'Success'
            if ($failedCount -gt 0) {
                $statusPieces.Add("$failedCount could not be recovered automatically - check data\inflight.")
                $statusKind = 'Warning'
            }
        }
        else {
            $statusPieces.Add("$($restorable.Count) stranded message(s) were left in data\inflight. You will be asked again next launch.")
            $statusKind = 'Warning'
        }
    }

    if ($unreadable.Count -gt 0) {
        $statusPieces.Add("$($unreadable.Count) unreadable job file(s) remain in data\inflight.")
        if ($statusKind -eq 'Normal') {
            $statusKind = 'Warning'
        }
    }

    if ($statusPieces.Count -gt 0) {
        Set-Status -Message ($statusPieces -join ' ') -Kind $statusKind
    }
}

function Restore-WindowPlacement {
    try {
        $left = [double]$script:Settings.windowLeft
        $top = [double]$script:Settings.windowTop
        $width = [double]$script:Settings.windowWidth
        $height = [double]$script:Settings.windowHeight
        if ($width -lt 600 -or $height -lt 500) {
            return
        }

        $screenLeft = [System.Windows.SystemParameters]::VirtualScreenLeft
        $screenTop = [System.Windows.SystemParameters]::VirtualScreenTop
        $screenWidth = [System.Windows.SystemParameters]::VirtualScreenWidth
        $screenHeight = [System.Windows.SystemParameters]::VirtualScreenHeight

        if ($left -lt ($screenLeft - 50) -or $top -lt ($screenTop - 20)) {
            return
        }
        if (($left + 100) -gt ($screenLeft + $screenWidth) -or ($top + 100) -gt ($screenTop + $screenHeight)) {
            return
        }

        $window.WindowStartupLocation = [System.Windows.WindowStartupLocation]::Manual
        $window.Left = $left
        $window.Top = $top
        $window.Width = [Math]::Min($width, $screenWidth)
        $window.Height = [Math]::Min($height, $screenHeight)
    }
    catch {
    }
}

$browseButton.Add_Click({
    $browser = New-Object System.Windows.Forms.FolderBrowserDialog
    $browser.Description = 'Choose the project folder Antigravity should work inside.'
    $browser.ShowNewFolderButton = $false
    if ((-not [string]::IsNullOrWhiteSpace($workingDirectoryText.Text)) -and (Test-Path -LiteralPath $workingDirectoryText.Text -PathType Container)) {
        $browser.SelectedPath = $workingDirectoryText.Text
    }

    $script:ModalOpen = $true
    try {
        $dialogResult = $browser.ShowDialog()
    }
    finally {
        $script:ModalOpen = $false
    }

    if ($dialogResult -eq [System.Windows.Forms.DialogResult]::OK) {
        $workingDirectoryText.Text = $browser.SelectedPath
        $script:Settings.workingDirectory = $browser.SelectedPath
        Save-LauncherSettings -Settings $script:Settings
        Set-Status -Message 'Working folder saved.' -Kind Success
        Update-SendAvailability
    }
})

$workingDirectoryText.Add_TextChanged({
    Update-SendAvailability
})

$workingDirectoryText.Add_LostFocus({
    if ([string]$script:Settings.workingDirectory -cne [string]$workingDirectoryText.Text) {
        $script:Settings.workingDirectory = $workingDirectoryText.Text
        Save-LauncherSettings -Settings $script:Settings
    }
})

$recheckGuardButton.Add_Click({
    Update-CreditGuard
    if ($script:CreditGuard.Allowed) {
        Set-Status -Message 'Subscription-only guard passed.' -Kind Success
    }
    else {
        Set-Status -Message $script:CreditGuard.Message -Kind Error
    }
})

$searchText.Add_TextChanged({
    Update-QueueList
})

$queueList.Add_SelectionChanged({
    if ($script:IsRefreshingList) {
        return
    }
    Update-SelectionState
})

$queueList.Add_KeyDown({
    param($sender, $e)
    if ($e.Key -eq [System.Windows.Input.Key]::Delete) {
        Invoke-DeleteSelected
        $e.Handled = $true
    }
    elseif ($e.Key -eq [System.Windows.Input.Key]::F2) {
        Invoke-EditSelected
        $e.Handled = $true
    }
})

$moveTopButton.Add_Click({ Move-SelectedEntry -Direction 'top' })
$moveUpButton.Add_Click({ Move-SelectedEntry -Direction 'up' })
$moveDownButton.Add_Click({ Move-SelectedEntry -Direction 'down' })
$editButton.Add_Click({ Invoke-EditSelected })
$deleteButton.Add_Click({ Invoke-DeleteSelected })
$importButton.Add_Click({ Invoke-ImportFlow })
$undoButton.Add_Click({ Invoke-UndoLast })
$historyButton.Add_Click({ Show-HistoryDialog })
$repairButton.Add_Click({ Invoke-RepairFlow })

$openDataButton.Add_Click({
    Start-Process -FilePath 'explorer.exe' -ArgumentList "`"$dataDirectory`""
})

$autoSendCheck.Add_Checked({
    Set-Status -Message "Auto-send is on: up to $(Get-AutoSendConcurrency) conversation(s) run at once until the queue is empty." -Kind Normal
    Update-RunningState
})

$autoSendCheck.Add_Unchecked({
    if (-not $script:IsSending) {
        Update-RunningState
    }
})

$promptinatorCheck.Add_Checked({
    $script:Settings.promptinatorEnabled = $true
    Save-LauncherSettings -Settings $script:Settings
    $toolPath = Join-Path (Get-PromptinatorRepo) 'tools\claim-next-prompt.mjs'
    if (Test-Path -LiteralPath $toolPath) {
        Set-Status -Message "Promptinator pull is on: when the queue is empty, the next send claims the lowest Ready entry from $(Get-PromptinatorRepo)." -Kind Normal
    }
    else {
        Set-Status -Message "Promptinator pull is on, but the claim tool was not found at $toolPath. Set promptinatorRepo in data\settings.json." -Kind Warning
    }
    [void](Update-PromptinatorView -Force)
    Update-QueueList
})

$promptinatorCheck.Add_Unchecked({
    $script:Settings.promptinatorEnabled = $false
    Save-LauncherSettings -Settings $script:Settings
    [void](Update-PromptinatorView)
    Update-QueueList
})

$sendButton.Add_Click({ Invoke-SendNext })

$window.Add_PreviewKeyDown({
    param($sender, $e)
    $isControl = ([System.Windows.Input.Keyboard]::Modifiers -band [System.Windows.Input.ModifierKeys]::Control) -ne [System.Windows.Input.ModifierKeys]::None
    if (-not $isControl) {
        return
    }
    if ($e.Key -eq [System.Windows.Input.Key]::Return) {
        if ($sendButton.IsEnabled) {
            Invoke-SendNext
        }
        $e.Handled = $true
    }
    elseif ($e.Key -eq [System.Windows.Input.Key]::I) {
        Invoke-ImportFlow
        $e.Handled = $true
    }
    elseif ($e.Key -eq [System.Windows.Input.Key]::F) {
        $searchText.Focus() | Out-Null
        $searchText.SelectAll()
        $e.Handled = $true
    }
})

$window.Add_Loaded({
    Invoke-StartupRecovery
})

$window.Add_Closing({
    try {
        if ($window.WindowState -eq [System.Windows.WindowState]::Normal) {
            $script:Settings.windowLeft = $window.Left
            $script:Settings.windowTop = $window.Top
            $script:Settings.windowWidth = $window.ActualWidth
            $script:Settings.windowHeight = $window.ActualHeight
        }
        $script:Settings.workingDirectory = $workingDirectoryText.Text
        Save-LauncherSettings -Settings $script:Settings
    }
    catch {
    }
})

$script:RefreshTimer = New-Object System.Windows.Threading.DispatcherTimer
$script:RefreshTimer.Interval = [TimeSpan]::FromSeconds(2.5)
$script:RefreshTimer.Add_Tick({ Invoke-PeriodicRefresh })

try {
    Update-CreditGuard
    Update-QueueView
    [void](Update-PromptinatorView -Force)
    Update-QueueList
    Update-RunningState
    if ($script:CreditGuard.Allowed) {
        Set-Status -Message 'Subscription-only guard passed. Choose a working folder and add messages to begin.' -Kind Success
    }
    else {
        Set-Status -Message $script:CreditGuard.Message -Kind Error
    }
    if ($SmokeTest) {
        Write-Output "GUI_SMOKE_TEST=PASS"
        Write-Output "CREDIT_GUARD_ALLOWED=$($script:CreditGuard.Allowed)"
        Write-Output "CREDIT_GUARD_MESSAGE=$($script:CreditGuard.Message)"
        Write-Output "AGY_PATH=$(Get-AgyExecutable)"
        Write-Output "QUEUE_COUNT=$($script:AllEntries.Count)"
        $promptinatorRows = if ($null -ne $script:PromptinatorView) { @($script:PromptinatorView.Entries).Count } else { -1 }
        Write-Output "PROMPTINATOR_READY=$promptinatorRows"
        return
    }

    Restore-WindowPlacement

    Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;

public static class LauncherConsoleWindow
{
    [DllImport("kernel32.dll")]
    public static extern bool FreeConsole();
}
'@
    # Detach from the console entirely. Hiding the console window does not work
    # when Windows Terminal hosts it, which left a blank black window open for
    # the whole session; detaching closes it while the WPF window lives on.
    [void][LauncherConsoleWindow]::FreeConsole()

    $script:RefreshTimer.Start()
    [void]$window.ShowDialog()
}
finally {
    if ($null -ne $script:RefreshTimer) {
        $script:RefreshTimer.Stop()
    }
    if ($createdNew) {
        $instanceMutex.ReleaseMutex()
    }
    $instanceMutex.Dispose()
}
