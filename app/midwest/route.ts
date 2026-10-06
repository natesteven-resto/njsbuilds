/**
 * GET /midwest — serves The Midwest Job frontend.
 * Returns the full HTML page. API routes are at /api/midwest/...
 *
 * SQLite DB note: uses /tmp/midwest-job.db — resets on Vercel cold starts.
 * Acceptable for testing. For production persistence, use a real database.
 */
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <title>The Midwest Job</title>
  <link rel="stylesheet" href="/midwest/style.css">
</head>
<body>

<div id="app">

  <!-- \u2500\u2500 Sidebar \u2500\u2500 -->
  <nav id="sidebar">
    <div id="sidebar-header">
      <div id="sidebar-title">Midwest Job</div>
      <div id="sidebar-subtitle">Hartwell, NE</div>
    </div>

    <div id="nav">
      <div class="nav-item active" data-screen="mail">
        <span class="nav-icon">\u2709</span>
        <span>Mail</span>
        <span class="nav-badge" id="badge-mail" style="display:none"></span>
      </div>
      <div class="nav-item" data-screen="contacts">
        <span class="nav-icon">\ud83d\udc64</span>
        <span>Contacts</span>
      </div>
      <div class="nav-item" data-screen="files">
        <span class="nav-icon">\ud83d\udcc4</span>
        <span>Files</span>
      </div>
      <div class="nav-item" data-screen="notes">
        <span class="nav-icon">\ud83d\udcdd</span>
        <span>Notes</span>
      </div>
      <div class="nav-item" data-screen="plan">
        <span class="nav-icon">\ud83d\uddfa</span>
        <span>Plan</span>
      </div>
      <div class="nav-item" data-screen="crew">
        <span class="nav-icon">\ud83d\udc65</span>
        <span>Crew</span>
      </div>
      <div class="nav-item" data-screen="operation">
        <span class="nav-icon">\u26a1</span>
        <span>Operation</span>
      </div>
    </div>

    <div id="sidebar-footer">
      <div class="clock-display" id="sidebar-clock">--:--</div>
      <div style="margin-top:2px">
        <span
          style="cursor:pointer;color:var(--text-mute)"
          onclick="navigate('dev')"
          title="Dev Controls">DEV</span>
      </div>
    </div>
  </nav>

  <!-- \u2500\u2500 Main \u2500\u2500 -->
  <div id="main">
    <div id="topbar">
      <span id="topbar-title">Mail</span>
      <span id="topbar-status">
        <span class="status-dot"></span>engine online
      </span>
    </div>

    <div id="content">
      <div id="screen-mail" class="screen active"></div>
      <div id="screen-contacts" class="screen"></div>
      <div id="screen-files" class="screen"></div>
      <div id="screen-notes" class="screen"></div>
      <div id="screen-plan" class="screen"></div>
      <div id="screen-crew" class="screen"></div>
      <div id="screen-operation" class="screen"></div>
      <div id="screen-dev" class="screen"></div>
    </div>
  </div>

</div>

<!-- Toast container -->
<div id="toast-container"></div>

<!-- API base: points to Next.js API routes -->
<script>var MIDWEST_API_BASE = '/api/midwest';</script>
<script src="/midwest/app.js"></script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
