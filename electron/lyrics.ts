export interface LyricLine {
  time: number;
  text: string;
}

interface LrcLibResult {
  syncedLyrics: string | null;
  plainLyrics: string | null;
  artistName?: string;
  trackName?: string;
}

const UA = { headers: { 'User-Agent': 'Lyrebird v1.0.0' } };

export async function fetchLyrics(
  artist: string,
  title: string,
  album: string,
  duration: number
): Promise<LyricLine[] | null> {
  try {
    const cleanedArtist = cleanArtist(artist);
    const cleanedTitle = cleanTitle(title);
    const firstArtist = extractFirstArtist(cleanedArtist);

    const attempts: [string, () => Promise<LyricLine[] | null>][] = [
      ['exact', () => tryGet(artist, title, album, duration)],
      ['cleaned artist', () => tryGet(cleanedArtist, title, album, duration)],
      ['no duration', () => tryGet(cleanedArtist, title, album, 0)],
      ['no album', () => tryGet(cleanedArtist, title, '', 0)],
      ['cleaned title', () => tryGet(cleanedArtist, cleanedTitle, '', 0)],
      ['first artist', () => tryGet(firstArtist, title, '', 0)],
      ['first + cleaned title', () => tryGet(firstArtist, cleanedTitle, '', 0)],
      ['search', () => trySearch(cleanedArtist, title, cleanedArtist, title)],
      ['search first artist', () => trySearch(firstArtist, title, firstArtist, title)],
      ['search cleaned', () => trySearch(cleanedArtist, cleanedTitle, cleanedArtist, cleanedTitle)],
    ];

    for (const [name, fn] of attempts) {
      const result = await fn();
      if (result) return result;
    }

    return null;
  } catch {
    return null;
  }
}

async function tryGet(
  artist: string,
  title: string,
  album: string,
  duration: number
): Promise<LyricLine[] | null> {
  const params = new URLSearchParams({ artist_name: artist, track_name: title });
  if (album) params.set('album_name', album);
  if (duration > 0) params.set('duration', Math.round(duration).toString());

  try {
    const res = await fetch(`https://lrclib.net/api/get?${params}`, UA);
    if (!res.ok) return null;
    return extractLyrics(await res.json());
  } catch {
    return null;
  }
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
}

function similarity(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return 1;
  const wordsA = new Set(na.split(' '));
  const wordsB = new Set(nb.split(' '));
  let common = 0;
  for (const w of wordsA) if (wordsB.has(w)) common++;
  const total = Math.max(wordsA.size, wordsB.size);
  return total === 0 ? 0 : common / total;
}

function matchesTitle(result: string, expected: string): boolean {
  return similarity(result, expected) >= 0.6;
}

function matchesArtist(result: string, expected: string): boolean {
  const nr = normalize(result);
  const ne = normalize(expected);
  if (nr === ne) return true;
  // Artist can contain multiple names, check if expected is in result or vice versa
  return nr.includes(ne) || ne.includes(nr);
}

async function trySearch(
  query_artist: string,
  query_title: string,
  expected_artist: string,
  expected_title: string
): Promise<LyricLine[] | null> {
  const q = `${query_artist} ${query_title}`.trim();
  try {
    const res = await fetch(
      `https://lrclib.net/api/search?q=${encodeURIComponent(q)}`,
      UA
    );
    if (!res.ok) return null;
    const results: LrcLibResult[] = await res.json();

    // Filter results that actually match the song
    const matching = results.filter((r) => {
      if (!r.artistName || !r.trackName) return false;
      return matchesArtist(r.artistName, expected_artist) && matchesTitle(r.trackName, expected_title);
    });

    // Prefer synced lyrics among matching results
    const synced = matching.find((r) => r.syncedLyrics);
    if (synced) return extractLyrics(synced);

    const plain = matching.find((r) => r.plainLyrics);
    if (plain) return extractLyrics(plain);

    return null;
  } catch {
    return null;
  }
}

function extractLyrics(data: LrcLibResult): LyricLine[] | null {
  if (data.syncedLyrics) return parseLrc(data.syncedLyrics);
  if (data.plainLyrics) return plainToLines(data.plainLyrics);
  return null;
}

function cleanTitle(title: string): string {
  return title
    .replace(/\s*[\(\[].*(feat|ft|featuring|remix|remaster|deluxe|bonus|edit|version|mix|live|acoustic|radio|explicit|clean).*[\)\]]/gi, '')
    .replace(/\s*-\s*(feat|ft|featuring)\.?\s*.*/gi, '')
    .trim();
}

function cleanArtist(artist: string): string {
  return artist
    .split(/\s*[—–]\s*/)[0]
    .split(/\s*-\s*(?:EP|LP|Album|Single|Deluxe|Remaster)/i)[0]
    .trim();
}

function extractFirstArtist(artist: string): string {
  return artist
    .split(/\s*[,;&×x]\s*/i)[0]
    .split(/\s+(?:feat\.?|ft\.?|featuring|with|vs\.?)\s+/i)[0]
    .trim();
}

function parseLrc(lrc: string): LyricLine[] {
  const lines: LyricLine[] = [];

  for (const raw of lrc.split('\n')) {
    const match = raw.match(/^\[(\d+):(\d+(?:\.\d+)?)\]\s?(.*)/);
    if (!match) continue;
    const time = parseInt(match[1]) * 60 + parseFloat(match[2]);
    const text = match[3].trim();
    if (text) lines.push({ time, text });
  }

  return lines;
}

function plainToLines(text: string): LyricLine[] {
  return text
    .split('\n')
    .filter((l) => l.trim())
    .map((line) => ({ time: -1, text: line.trim() }));
}
