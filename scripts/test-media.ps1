[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$rtDir = [System.Runtime.InteropServices.RuntimeEnvironment]::GetRuntimeDirectory()
[System.Reflection.Assembly]::LoadFile("${rtDir}System.Runtime.WindowsRuntime.dll") | Out-Null
[void][Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media.Control, ContentType = WindowsRuntime]

$asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
    $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
})[0]

function AwaitTyped($WinRtTask, $ResultType) {
    $asTask = $asTaskGeneric.MakeGenericMethod($ResultType)
    $netTask = $asTask.Invoke($null, @($WinRtTask))
    $netTask.Wait(-1) | Out-Null
    $netTask.Result
}

$sessionManager = AwaitTyped ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])
$session = $sessionManager.GetCurrentSession()
if ($session) {
    $asyncOp = $session.TryGetMediaPropertiesAsync()
    Start-Sleep -Milliseconds 500
    Write-Output "AsyncOp type: $($asyncOp.GetType().FullName)"
    try {
        $r = $asyncOp.GetResults()
        Write-Output "Title: $($r.Title)"
        Write-Output "Artist: $($r.Artist)"
        Write-Output "Album: $($r.AlbumTitle)"
    } catch {
        Write-Output "GetResults error: $_"
    }

    $timeline = $session.GetTimelineProperties()
    $playback = $session.GetPlaybackInfo()
    Write-Output "Position: $([math]::Round($timeline.Position.TotalSeconds, 2))"
    Write-Output "Duration: $([math]::Round($timeline.EndTime.TotalSeconds, 2))"
    Write-Output "Status: $($playback.PlaybackStatus.ToString())"
} else {
    Write-Output 'No active session'
}
