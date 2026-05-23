using System.Text;
using System.Text.Json;
using Windows.Media.Control;

Console.OutputEncoding = Encoding.UTF8;
Console.InputEncoding = Encoding.UTF8;

var manager = await GlobalSystemMediaTransportControlsSessionManager.RequestAsync();
var options = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

string lastTrackKey = "";
string? cachedThumbnail = null;

var stdinReader = new StreamReader(Console.OpenStandardInput(), Encoding.UTF8);
_ = Task.Run(async () =>
{
    while (true)
    {
        var line = await stdinReader.ReadLineAsync();
        if (line == null) break;
        var session = manager.GetCurrentSession();
        if (session == null) continue;
        switch (line.Trim())
        {
            case "play": await session.TryPlayAsync(); break;
            case "pause": await session.TryPauseAsync(); break;
            case "next": await session.TrySkipNextAsync(); break;
            case "prev": await session.TrySkipPreviousAsync(); break;
        }
    }
});

while (true)
{
    try
    {
        var session = manager.GetCurrentSession();
        if (session != null)
        {
            var mediaProps = await session.TryGetMediaPropertiesAsync();
            var timeline = session.GetTimelineProperties();
            var playback = session.GetPlaybackInfo();

            var title = mediaProps?.Title ?? "";
            var artist = mediaProps?.Artist ?? "";
            var album = mediaProps?.AlbumTitle ?? "";
            var trackKey = $"{artist}|||{title}";
            var trackChanged = trackKey != lastTrackKey;

            if (trackChanged)
            {
                lastTrackKey = trackKey;
                cachedThumbnail = await ExtractThumbnail(mediaProps);
            }

            var info = new
            {
                Title = title,
                Artist = artist,
                Album = album,
                Position = Math.Round(timeline.Position.TotalSeconds, 2),
                Duration = Math.Round(timeline.EndTime.TotalSeconds, 2),
                Status = playback.PlaybackStatus.ToString(),
                TrackChanged = trackChanged,
                Thumbnail = trackChanged ? cachedThumbnail : null
            };

            Console.WriteLine(JsonSerializer.Serialize(info, options));
        }
        else
        {
            Console.WriteLine("{\"title\":\"\",\"artist\":\"\",\"album\":\"\",\"position\":0,\"duration\":0,\"status\":\"Closed\",\"trackChanged\":false,\"thumbnail\":null}");
        }
    }
    catch
    {
        Console.WriteLine("{\"title\":\"\",\"artist\":\"\",\"album\":\"\",\"position\":0,\"duration\":0,\"status\":\"Error\",\"trackChanged\":false,\"thumbnail\":null}");
    }

    Console.Out.Flush();
    await Task.Delay(500);
}

static async Task<string?> ExtractThumbnail(GlobalSystemMediaTransportControlsSessionMediaProperties? props)
{
    try
    {
        var thumbRef = props?.Thumbnail;
        if (thumbRef == null) return null;

        using var stream = await thumbRef.OpenReadAsync();
        using var netStream = stream.AsStreamForRead();
        using var ms = new MemoryStream();
        await netStream.CopyToAsync(ms);
        var bytes = ms.ToArray();
        var raw = stream.ContentType ?? "";
        var mime = string.IsNullOrEmpty(raw) ? "image/png" : raw.Split(',')[0].Trim();
        return $"data:{mime};base64,{Convert.ToBase64String(bytes)}";
    }
    catch
    {
        return null;
    }
}
