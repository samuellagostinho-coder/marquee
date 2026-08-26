const CLIENT_ID = "e2328098412d4e8983285ecae8dc7b01";
const REDIRECT_URI = "http://127.0.0.1:5173/callback";
const SCOPES = "user-follow-read user-top-read";

// Step A: generate a random string Spotify uses to verify it's really us
function generateRandomString(length) {
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from(crypto.getRandomValues(new Uint8Array(length)))
    .map((x) => possible[x % possible.length])
    .join("");
}

// Step B: Spotify requires this random string to be hashed before sending
async function sha256(plain) {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return crypto.subtle.digest("SHA-256", data);
}

function base64encode(input) {
  return btoa(String.fromCharCode(...new Uint8Array(input)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

// Step C: kick off login — redirects the browser to Spotify
export async function loginWithSpotify() {
  const codeVerifier = generateRandomString(64);
  const hashed = await sha256(codeVerifier);
  const codeChallenge = base64encode(hashed);

  localStorage.setItem("spotify_code_verifier", codeVerifier);

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: "code",
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
    code_challenge_method: "S256",
    code_challenge: codeChallenge,
  });

  window.location = `https://accounts.spotify.com/authorize?${params.toString()}`;
}

// Step D: after Spotify redirects back, exchange the "code" for an access token
export async function exchangeCodeForToken(code) {
  const codeVerifier = localStorage.getItem("spotify_code_verifier");

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI,
      code_verifier: codeVerifier,
    }),
  });

  const data = await response.json();
  if (data.access_token) {
    localStorage.setItem("spotify_access_token", data.access_token);
  }
  return data;
}

// Step E: use the token to fetch artists you follow
export async function getFollowedArtists() {
  const token = localStorage.getItem("spotify_access_token");
  if (!token) return [];

  let allArtists = [];
  let after = null;

  do {
    const url = new URL("https://api.spotify.com/v1/me/following");
    url.searchParams.set("type", "artist");
    url.searchParams.set("limit", "50");
    if (after) url.searchParams.set("after", after);

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();

    const artists = data.artists?.items ?? [];
    allArtists = allArtists.concat(artists);
    after = data.artists?.cursors?.after ?? null;
  } while (after);

  return allArtists;
}