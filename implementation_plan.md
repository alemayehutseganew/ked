# Implementation Plan

## Overview

Two related navigation/resumption features for the GoBingo Mini App:
1. Task A — Move stake selection into the Telegram bot and remove the Lobby. The bot (getMainMenu and bot.command('play')) offers inline buttons to play for 10/50/100 ETB that open the Mini App directly on /select-card?stake=X. The frontend root route (/) no longer renders the Lobby; it redirects to /select-card?stake=10. CardSelection.jsx already defaults to stake 10 when none is supplied, so no change is required there.
2. Task B — Auto-resume disconnected players straight to the active Game Screen. On app load, after Telegram login, App.jsx reads localStorage.activeGameRoom and, if present, navigates directly to /game?roomId=...&stake=.... GameScreen.jsx writes activeGameRoom when joining a game and clears it (with a redirect to /select-card) when a game ends or a rejoin is rejected.

## Types

No type system changes. All files are JavaScript/React.

## Files

### backend/src/bot/index.js (modify)

1. Add a trailing-slash-safe frontend base helper near DEFAULT_FRONTEND_URL (line 161): change DEFAULT_FRONTEND_URL = 'https://ked-seven.vercel.app/' to 'https://ked-seven.vercel.app' (drop trailing slash), and add const FRONTEND_BASE = (process.env.FRONTEND_URL || DEFAULT_FRONTEND_URL).replace(/\/+$/, '') so all web_app URLs are built without a trailing slash (avoids ...vercel.app//select-card).

2. getMainMenu(lang) (line 215): Replace the single t.playGame web_app button (line 220) linking to the bare frontend URL with three inline buttons:
   - text '🎮 Play 10 ETB', web_app url FRONTEND_BASE + '/select-card?stake=10'
   - text '🎮 Play 50 ETB', web_app url FRONTEND_BASE + '/select-card?stake=50'
   - text '🎮 Play 100 ETB', web_app url FRONTEND_BASE + '/select-card?stake=100'
   Each on its own row. Keep the rest of the menu rows unchanged.

3. bot.command('play') (line 303): Replace the single playBingo web_app button (line 306) linking to the bare frontend URL with the same three stake buttons opening /select-card?stake=X.

4. bot.start (line 268): The '🎮 Open Game' web_app button links to getFrontendUrl(referralRef) (root URL, carries ref). Leave as-is — App.jsx redirects / to /select-card?stake=10, so entry still works and preserves the referral param.

5. bot.action('menu_room') (line 399): The '🏠 Open Lobby' button links to the root frontend URL. With the Lobby removed and / redirecting to /select-card?stake=10, this still functions but the label is misleading. Change text to '🎮 Play Game' and point it at FRONTEND_BASE + '/select-card?stake=10'.

No changes to translations, database logic, or backend routes.

### frontend/src/App.jsx (modify)

1. Imports: Remove import Lobby from './pages/Lobby'. Add useNavigate to the react-router-dom import.

2. useEffect (lines 24-54): Inside the data.token success branch (after SocketService.connect(data.token) and window.dispatchEvent), add active-game resume logic:
   const activeRoomData = localStorage.getItem('activeGameRoom');
   if (activeRoomData) {
     try {
       const { roomId, stake } = JSON.parse(activeRoomData);
       if (roomId && stake) {
         navigate('/game?roomId=' + encodeURIComponent(roomId) + '&stake=' + stake, { replace: true });
         return;
       }
     } catch (err) {
       console.error('[App] Failed to parse active game data', err);
     }
   }
   navigate('/select-card?stake=10', { replace: true });
   Place after the token is saved and before the effect ends. If no token/login, the effect behaves as before (no navigation).

3. Routes block (lines 60-83): Replace <Route path="/" element={<Lobby />} /> with <Route path="/" element={<Navigate to="/select-card?stake=10" replace />} />.

### frontend/src/pages/GameScreen.jsx (modify)

1. Persist active game on join: In the existing handleJoin (lines 94-96), before/with socket.emit('join_room', ...), persist localStorage.setItem('activeGameRoom', JSON.stringify({ roomId, stake })).

2. Handle rejected rejoin (error listener): Add a socket error handler inside the existing socket useEffect (e.g. after the my_cards listener) that clears storage and redirects to card selection when the backend rejects the join:
   socket.on('error', (err) => {
     const msg = String(err?.message || err || '');
     if (msg === 'Room not found' || msg.includes('ended') || msg.includes('already started') || msg.includes('ROOM_NOT_FOUND')) {
       console.log('[Game] Active game no longer exists. Redirecting to card selection.');
       localStorage.removeItem('activeGameRoom');
       navigate('/select-card?stake=' + encodeURIComponent(stake), { replace: true });
     }
   });
   Add 'error' to the cleanup socket.off(...) list.

3. next_game_ready (lines 212-218): Also localStorage.removeItem('activeGameRoom') before navigating to /select-card to avoid stale-entry loops when a spectator is moved to the next game.

game_over (line 171) and room_reset (line 219) already clear activeGameRoom and redirect to /select-card — no change needed there.

### frontend/src/pages/CardSelection.jsx (no change)

Already compliant: line 33 const stake = rawStake ? Number(rawStake) || 10 : 10; defaults to 10 when no stake is supplied. Listed only to confirm Phase 3 of Task A requires no edit.

## Functions

- Modified — getMainMenu (backend/src/bot/index.js): returns inline keyboard with three stake buttons instead of one Play Game button.
- Modified — bot.command('play') (backend/src/bot/index.js): replies with three stake buttons instead of one Play Bingo button.
- Modified — bot.action('menu_room') (backend/src/bot/index.js): button text/URL updated to open card selection at default stake.
- Modified — App useEffect (frontend/src/App.jsx): after login, reads localStorage.activeGameRoom and navigates to /game or /select-card?stake=10.
- Modified — handleJoin (frontend/src/pages/GameScreen.jsx): writes activeGameRoom to localStorage.
- New — socket error listener (frontend/src/pages/GameScreen.jsx): clears storage and redirects to /select-card on rejected rejoin.
- Modified — next_game_ready (frontend/src/pages/GameScreen.jsx): clears activeGameRoom before redirect.

## Classes

None.

## Dependencies

No new packages. Reuses existing react-router-dom (useNavigate, Navigate) and Telegraf web_app buttons.

## Testing

- Syntax checks: node --check backend/src/bot/index.js; vite build / oxlint for App.jsx and GameScreen.jsx.
- Task A: Open the bot main menu and /play; verify three stake buttons (10/50/100 ETB) and each web_app.url is FRONTEND_BASE/select-card?stake=X (no trailing slash, no double slash). Clicking one opens the Mini App on Card Selection with that stake.
- Task A (Lobby removed): Visit / in the Mini App; verify it redirects to /select-card?stake=10 and Lobby is unreachable.
- Task A (stake fallback): Open /select-card with no stake param; verify it defaults to 10 (already implemented).
- Task B (auto-resume): Join a game (sets activeGameRoom), close/reopen the Mini App; verify it goes straight to /game?roomId=...&stake=... .
- Task B (ended-game redirect): With a stale activeGameRoom pointing to an ended/nonexistent room, reopen; verify the backend rejects the join, storage is cleared, and the app redirects to /select-card.
- Task B (game-end cleanup): Verify game_over and room_reset clear activeGameRoom (already implemented) so no infinite /game -> /select-card loop.

## Implementation Order

1. Edit backend/src/bot/index.js: add FRONTEND_BASE helper and fix DEFAULT_FRONTEND_URL trailing slash.
2. Edit backend/src/bot/index.js: update getMainMenu stake buttons.
3. Edit backend/src/bot/index.js: update bot.command('play') stake buttons.
4. Edit backend/src/bot/index.js: update bot.action('menu_room') button.
5. Edit frontend/src/App.jsx: remove Lobby import, add useNavigate, add active-game resume in login useEffect, replace / route with Navigate to /select-card?stake=10.
6. Edit frontend/src/pages/GameScreen.jsx: write activeGameRoom in handleJoin; add socket error handler + cleanup; clear storage in next_game_ready.
7. Run syntax/lint checks and the manual tests above.