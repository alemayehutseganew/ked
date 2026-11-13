import { useEffect, useState, Fragment } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import CardSelection from './CardSelection';
import SocketService from '../services/socket';
import { playNumberAudio, toggleVoice, unlockAudio } from '../utils/bingoSounds';
import { useWallet } from '../WalletContext';

const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

const getBallColor = (letter) => {
  switch(letter) {
    case 'B': return 'bg-blue-700 border-blue-900';
    case 'I': return 'bg-red-600 border-red-800';
    case 'N': return 'bg-purple-600 border-purple-800';
    case 'G': return 'bg-green-600 border-green-800';
    case 'O': return 'bg-yellow-500 border-yellow-700';
    default: return 'bg-gray-500 border-gray-700';
  }
};

const getBallGradient = (letter) => {
  switch (letter) {
    case 'B': return 'bg-[radial-gradient(circle_at_30%_25%,#93c5fd,#2563eb_55%,#1e3a8a)]';
    case 'I': return 'bg-[radial-gradient(circle_at_30%_25%,#fca5a5,#dc2626_55%,#7f1d1d)]';
    case 'N': return 'bg-[radial-gradient(circle_at_30%_25%,#d8b4fe,#9333ea_55%,#581c87)]';
    case 'G': return 'bg-[radial-gradient(circle_at_30%_25%,#86efac,#16a34a_55%,#14532d)]';
    case 'O': return 'bg-[radial-gradient(circle_at_30%_25%,#fde68a,#f59e0b_55%,#9a3412)]';
    default: return 'bg-[radial-gradient(circle_at_30%_25%,#d1d5db,#6b7280_55%,#374151)]';
  }
};

const GameScreen = () => {
  const socket = SocketService.get() || SocketService.connect()
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const roomId = searchParams.get('roomId') || 'room_10';
  const stake = parseInt(searchParams.get('stake')) || 10;
  const spectatorFromUrl = searchParams.get('spectator') === 'true';
  const userId = localStorage.getItem('dbUserId');
  const { t, i18n } = useTranslation();
  const { balance } = useWallet();

  const [calledNumbers, setCalledNumbers] = useState([]);
  const [currentBall, setCurrentBall] = useState(null);
  const [calledHistory, setCalledHistory] = useState([]);
  const [markedNumbers, setMarkedNumbers] = useState([]);
  const [cardsData, setCardsData] = useState([]);
  const [playerCount, setPlayerCount] = useState(0);
  const playersCount = playerCount;
  const [readyPlayers, setReadyPlayers] = useState(0);
  const [countdown, setCountdown] = useState(null);
  const [gameStarted, setGameStarted] = useState(false);
  const isSpectator = spectatorFromUrl;
  const [spectatorNumbers, setSpectatorNumbers] = useState([]);
  const [spectatorBall, setSpectatorBall] = useState(null);
  const [bingoMessage, setBingoMessage] = useState(null);
  const [gameResult, setGameResult] = useState(null);
  const [isVoiceOn, setIsVoiceOn] = useState(true);

  useEffect(() => {
    const handleFirstTap = async () => {
      const unlocked = await unlockAudio();
      if (!unlocked) return;

      document.removeEventListener('touchstart', handleFirstTap);
      document.removeEventListener('click', handleFirstTap);
    };

    document.addEventListener('touchstart', handleFirstTap, { passive: true });
    document.addEventListener('click', handleFirstTap);
    return () => {
      document.removeEventListener('touchstart', handleFirstTap);
      document.removeEventListener('click', handleFirstTap);
    };
  }, []);

  const handleVoiceToggle = () => {
    const nextVoiceOn = !isVoiceOn;
    setIsVoiceOn(nextVoiceOn);
    toggleVoice(nextVoiceOn);
    if (nextVoiceOn) unlockAudio();
  };

  useEffect(() => {
    if (!userId) return;

    const handleJoin = () => {
      socket.emit('join_room', { roomId, userId, stake, spectator: isSpectator });
    };

    socket.on('room_update', (data) => {
      if (Number.isFinite(Number(data.players))) setPlayerCount(Number(data.players));
      if (Number.isFinite(Number(data.readyPlayers))) setReadyPlayers(Number(data.readyPlayers));
    });
    socket.on('players_updated', (data) => {
      if (Number.isFinite(Number(data.count))) setPlayerCount(Number(data.count));
    });
    socket.on('game_in_progress', (data) => {
      setCardsData([]);
      setMarkedNumbers([]);
      setGameStarted(false);
      setSpectatorNumbers(data.calledNumbers || []);
      setSpectatorBall(data.currentBall || null);
      if (Number.isFinite(Number(data.players))) setPlayerCount(Number(data.players));
      if (!isSpectator) {
        navigate(`/game?roomId=${encodeURIComponent(roomId)}&stake=${stake}&spectator=true`, { replace: true });
        return;
      }
    });
    socket.on('spectator_sync', (data) => {
      setSpectatorNumbers(data.calledNumbers || []);
      setSpectatorBall(data.currentBall || null);
      if (Number.isFinite(Number(data.players))) setPlayerCount(Number(data.players));
    });
    socket.on('insufficient_funds', (data) => {
      alert(`💰 ${data.message}`);
      window.location.href = '/wallet';
    });
    socket.on('game_aborted', (data) => {
      alert(`⚠️ ${data.message}`);
      window.location.href = '/';
    });
    socket.on('countdown_tick', (data) => setCountdown(data.timeLeft ?? data.seconds ?? null));
    socket.on('my_cards', (data) => {
      if (!isSpectator && data.cards && data.cards.length > 0) setCardsData(data.cards);
    });
    socket.on('game_started', () => {
      setCountdown(null);
      setGameStarted(true);
    });
    socket.on('new_number_called', (data) => {
      const ball = data.ball || `${data.letter}-${data.number}`;
      const [ballLetter, ballNumber] = ball.split('-');
      const number = Number(data.number ?? ballNumber);
      const letter = data.letter || ballLetter;
      if (!Number.isFinite(number) || !letter) return;

      playNumberAudio(letter, number);
      setCurrentBall({ number, letter });
      setCalledNumbers(data.calledNumbers || (prev => (
        prev.includes(number) ? prev : [...prev, number]
      )));
      if (isSpectator) {
        setSpectatorBall({ number, letter });
        setSpectatorNumbers(data.calledNumbers || (prev => (
          prev.includes(number) ? prev : [...prev, number]
        )));
      } else {
        setCalledHistory(prev => [...prev.slice(-4), { number, letter }]);
      }
    });
    socket.on('game_over', (data) => {
      if (data.reason === 'no_winner' || (Array.isArray(data.winners) && data.winners.length === 0)) {
        navigate(`/select-card?stake=${stake}`);
        return;
      }

      const myId = String(userId);
      const isWinner = data.winnerIds?.some(id => String(id) === myId);
      if (isSpectator) {
        setGameResult({
          type: 'loss',
          titleKey: 'gameOver',
          messageKey: 'winnerIs',
          messageValues: { name: data.winnerName },
        });
        return;
      }

      if (isWinner) {
        setGameResult({
          type: 'win',
          titleKey: 'congratulations',
          messageKey: 'youWon',
          messageValues: { amount: Number(data.payout).toFixed(2) },
        });
      } else {
        setGameResult({
          type: 'loss',
          titleKey: 'gameOver',
          messageKey: 'winnerIs',
          messageValues: { name: data.winnerName },
        });
      }
      setTimeout(() => { setGameResult(null); navigate('/'); }, 5000);
    });
    socket.on('game_ended_for_spectators', () => {
      if (!isSpectator) return

      setGameResult((current) => current || {
        type: 'loss',
        titleKey: 'gameOver',
        messageKey: 'roundEnded',
      });
    });
    socket.on('next_game_ready', (data) => {
      if (!isSpectator) return
      setGameResult(null);
      setSpectatorNumbers([]);
      setSpectatorBall(null);
      navigate(`/select-card?stake=${data.stake || stake}`);
    });
    socket.on('room_reset', (data) => {
      if (!isSpectator) return
      setGameResult(null);
      setSpectatorNumbers([]);
      setSpectatorBall(null);
      navigate(`/select-card?stake=${data.stake || stake}`);
    });
    socket.on('bingo_result', (data) => {
      setBingoMessage(data);
      setTimeout(() => setBingoMessage(null), 4000);
    });
    socket.on('bingo_invalid', (data) => {
      setBingoMessage({ success: false, message: data.message });
      setTimeout(() => setBingoMessage(null), 4000);
    });

    if (socket.connected) handleJoin();
    else socket.on('connect', handleJoin);

    return () => {
      socket.off('connect', handleJoin);
      socket.off('room_update');
      socket.off('players_updated');
      socket.off('game_in_progress');
      socket.off('spectator_sync');
      socket.off('insufficient_funds');
      socket.off('game_aborted');
      socket.off('countdown_tick');
      socket.off('my_cards');
      socket.off('game_started');
      socket.off('new_number_called');
      socket.off('game_over');
      socket.off('game_ended_for_spectators');
      socket.off('next_game_ready');
      socket.off('room_reset');
      socket.off('bingo_result');
      socket.off('bingo_invalid');
    };
  }, [socket, roomId, userId, stake, isSpectator, navigate]);

  const handleDaub = (num) => {
    if (!calledNumbers.map(Number).includes(Number(num))) return;
    if (markedNumbers.map(Number).includes(Number(num))) return;
    setMarkedNumbers(prev => [...prev, Number(num)]);
  };

  const handleBingoClick = () => {
    if (!gameStarted || isSpectator) return;
    const cardId = cardsData[0]?.id || cardsData[0]?.cardId;
    if (!cardId) return;
    socket.emit('claim_bingo', { roomId, userId: localStorage.getItem('dbUserId'), cardId, markedNumbers });
  };

  const spectatorHistory = [...spectatorNumbers];
  if (
    spectatorBall &&
    Number(spectatorHistory[spectatorHistory.length - 1]) === Number(spectatorBall.number)
  ) {
    spectatorHistory.pop();
  }

  if (isSpectator) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0f172a] via-[#1e293b] to-[#020617] p-3 font-sans text-white">
        <div className="mx-auto w-full max-w-5xl">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-600/50 bg-slate-800/60 p-2.5 shadow-2xl backdrop-blur-lg">
            <div className="flex flex-wrap gap-2 text-xs font-bold sm:text-sm">
              <div className="flex min-h-11 items-center gap-1 rounded-xl border border-slate-700 bg-slate-900/80 px-3 shadow-inner">
                <span className="text-slate-400">{t('win')}:</span><span className="text-emerald-400">--</span>
              </div>
              <div className="flex min-h-11 items-center gap-1 rounded-xl border border-slate-700 bg-slate-900/80 px-3 shadow-inner">
                <span className="text-slate-400">{t('stake')}:</span><span className="text-blue-400">{stake || '--'}</span>
              </div>
              <div className="flex min-h-11 items-center gap-1 rounded-xl border border-slate-700 bg-slate-900/80 px-3 shadow-inner">
                <span className="text-slate-400">{t('call')}:</span>
                <span className="text-amber-300">{spectatorBall ? `${spectatorBall.letter}-${spectatorBall.number}` : '--'}</span>
              </div>
              <div className="flex min-h-11 items-center gap-1 rounded-xl border border-slate-700 bg-slate-900/80 px-3 shadow-inner">
                <span className="text-slate-400">{t('players')}:</span><span className="text-purple-300">{playersCount}</span>
              </div>
            </div>
            <div className="ml-auto flex items-center gap-2 text-xs">
              <div className="flex min-h-11 items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900/80 px-3 shadow-inner">
                <span className="text-sm text-yellow-400" aria-hidden="true">💰</span>
                <span className="whitespace-nowrap text-sm font-black tabular-nums text-white sm:text-base">
                  {Number.isFinite(Number(balance)) ? Number(balance).toFixed(2) : '0.00'}
                  <span className="ml-1 text-[10px] font-bold text-slate-400">ETB</span>
                </span>
              </div>
              <button onClick={() => i18n.changeLanguage(i18n.language === 'en' ? 'am' : 'en')} className="flex h-11 min-w-11 items-center justify-center rounded-full bg-slate-700 px-3 font-bold text-white shadow-[0_4px_0_rgb(51,65,85)] transition-all active:translate-y-1 active:shadow-none">
                {i18n.language === 'en' ? 'AM' : 'EN'}
              </button>
              <button
                type="button"
                aria-label={isVoiceOn ? t('muteSound') : t('unmuteSound')}
                onClick={handleVoiceToggle}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-700 text-white shadow-[0_4px_0_rgb(51,65,85)] transition-all active:translate-y-1 active:shadow-none"
              >
                {isVoiceOn ? '\u{1F50A}' : '\u{1F507}'}
              </button>
            </div>
          </div>

          <div className="mb-4 rounded-2xl border border-blue-400/40 bg-blue-950/70 p-4 text-center shadow-xl backdrop-blur">
            <p className="mb-1 text-lg font-bold text-blue-100">{t('pleaseWait')}</p>
            <p className="text-sm text-blue-200">{t('gameInProgress')}</p>
            <p className="mt-2 text-xs text-slate-400">{t('gameInProgressContinuation')}</p>
          </div>

          <div className="rounded-2xl border border-slate-600/50 bg-slate-800/80 p-3 shadow-2xl sm:p-6">
            <div className="mb-5 flex flex-col items-center">
              {spectatorBall ? (
                <div className={`relative flex h-36 w-36 flex-col items-center justify-center rounded-full border border-white/30 shadow-[0_20px_40px_rgba(0,0,0,0.6),inset_0_-10px_20px_rgba(0,0,0,0.55),inset_0_8px_18px_rgba(255,255,255,0.45)] ${getBallGradient(spectatorBall.letter)}`}>
                  <div className="pointer-events-none absolute left-4 top-3 h-7 w-24 -rotate-12 rounded-full bg-white/35 blur-md" />
                  <span className="relative mt-1 text-2xl font-bold text-white drop-shadow-md">{spectatorBall.letter}</span>
                  <span className="relative text-6xl font-black text-white drop-shadow-[0_5px_5px_rgba(0,0,0,0.6)]">{spectatorBall.number}</span>
                </div>
              ) : (
                <div className="flex h-36 w-36 animate-pulse items-center justify-center rounded-full bg-slate-600 shadow-[0_20px_40px_rgba(0,0,0,0.6),inset_0_8px_18px_rgba(255,255,255,0.25)]">
                  <span className="text-4xl text-white">-</span>
                </div>
              )}
              <p className="mt-3 text-sm text-slate-300">{t('ballsCalled', { count: spectatorNumbers.length })}</p>
            </div>

            <div className="mb-4 flex min-h-11 flex-wrap justify-center gap-2">
              {spectatorHistory.slice(-5).reverse().map((num) => {
                let letter = 'B';
                if (num > 15) letter = 'I';
                if (num > 30) letter = 'N';
                if (num > 45) letter = 'G';
                if (num > 60) letter = 'O';
                return (
                  <div key={num} className={`flex h-11 w-11 items-center justify-center rounded-full border border-white/30 text-sm font-bold text-white shadow-[0_4px_0_rgba(0,0,0,0.6)] ${getBallGradient(letter)}`}>
                    {num}
                  </div>
                );
              })}
            </div>

            <div className="grid max-h-80 grid-cols-5 gap-1.5 overflow-y-auto rounded-xl border border-slate-700 bg-slate-950/70 p-2 sm:grid-cols-10">
              {Array.from({ length: 75 }, (_, i) => i + 1).map((num) => {
                const isCalled = spectatorNumbers.includes(num);
                let letter = 'B';
                if (num > 15) letter = 'I';
                if (num > 30) letter = 'N';
                if (num > 45) letter = 'G';
                if (num > 60) letter = 'O';
                return (
                  <div key={num} className={`flex min-h-11 min-w-11 items-center justify-center rounded-lg border text-sm ${isCalled ? `${getBallColor(letter).split(' ')[0]} border-white/20 font-bold text-white shadow-[0_3px_0_rgba(0,0,0,0.5)]` : 'border-slate-700 bg-slate-800 text-slate-500'}`}>
                    {num}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {gameResult && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
            <div className="w-full max-w-sm rounded-2xl border-4 border-red-500 bg-[#112A46] p-8 text-center">
              <h2 className="mb-4 text-4xl font-bold text-red-400">{t(gameResult.titleKey)}</h2>
              <p className="text-xl text-white">{t(gameResult.messageKey, {
                ...gameResult.messageValues,
                name: gameResult.messageValues?.name || t('player'),
              })}</p>
              <p className="mt-4 text-sm text-blue-200">{t('returningToCardSelection')}</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (!gameStarted) {
    return (
      <CardSelection
        countdown={countdown}
        playersCount={playersCount}
        isGameStarted={gameStarted || (countdown !== null && countdown <= 0)}
        cardData={cardsData[0] || null}
        onCardUpdated={(updatedCard) => {
          setCardsData([updatedCard]);
          setMarkedNumbers([]);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f172a] via-[#1e293b] to-[#020617] p-3 font-sans text-white">
      <div className="relative z-[60] mb-4 flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-600/50 bg-slate-800/60 p-2.5 shadow-2xl backdrop-blur-lg">
        <div className="flex flex-wrap gap-2 text-xs font-bold sm:text-sm">
          <div className="flex min-h-11 items-center gap-1 rounded-xl border border-slate-700 bg-slate-900/80 px-3 shadow-inner">
            <span className="text-slate-400">{t('win')}:</span><span className="text-emerald-400">{gameStarted ? '0' : '--'}</span>
          </div>
          <div className="flex min-h-11 items-center gap-1 rounded-xl border border-slate-700 bg-slate-900/80 px-3 shadow-inner">
            <span className="text-slate-400">{t('stake')}:</span><span className="text-blue-400">{stake || '--'}</span>
          </div>
          <div className="flex min-h-11 items-center gap-1 rounded-xl border border-slate-700 bg-slate-900/80 px-3 shadow-inner">
            <span className="text-slate-400">{t('call')}:</span><span className="text-amber-300">{gameStarted ? calledNumbers.length : '--'}</span>
          </div>
          <div className="flex min-h-11 items-center gap-1 rounded-xl border border-slate-700 bg-slate-900/80 px-3 shadow-inner">
            <span className="text-slate-400">{t('players')}:</span><span className="text-purple-300">{playersCount}</span>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2 text-xs">
          <div className="flex min-h-11 items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900/80 px-3 shadow-inner">
            <span className="text-sm text-yellow-400" aria-hidden="true">💰</span>
            <span className="whitespace-nowrap text-sm font-black tabular-nums text-white sm:text-base">
              {Number.isFinite(Number(balance)) ? Number(balance).toFixed(2) : '0.00'}
              <span className="ml-1 text-[10px] font-bold text-slate-400">ETB</span>
            </span>
          </div>
          <button onClick={() => i18n.changeLanguage(i18n.language === 'en' ? 'am' : 'en')} className="flex h-11 min-w-11 items-center justify-center rounded-full bg-slate-700 px-3 font-bold text-white shadow-[0_4px_0_rgb(51,65,85)] transition-all active:translate-y-1 active:shadow-none">
            {i18n.language === 'en' ? 'AM' : 'EN'}
          </button>
          <button
            type="button"
            aria-label={isVoiceOn ? t('muteSound') : t('unmuteSound')}
            onClick={handleVoiceToggle}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-700 text-white shadow-[0_4px_0_rgb(51,65,85)] transition-all active:translate-y-1 active:shadow-none"
          >
            {isVoiceOn ? '\u{1F50A}' : '\u{1F507}'}
          </button>
        </div>
      </div>
      {countdown !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-lg rounded-3xl bg-gradient-to-br from-indigo-900 to-blue-900 px-6 py-10 text-center shadow-2xl ring-1 ring-white/20 animate-pulse sm:px-12 sm:py-14">
            <p className="mb-4 text-xl font-bold text-blue-100 sm:text-2xl">
              {t('countdown')}
            </p>
            <div className="text-6xl font-black text-white drop-shadow-lg sm:text-8xl">
              {formatTime(countdown)}
            </div>
            <p className="mt-5 text-lg font-semibold text-blue-100 sm:text-xl">
              {t('getReady')}
            </p>
          </div>
        </div>
      )}
      {!gameStarted && countdown === null ? (
        <div className="flex flex-1 items-center justify-center text-slate-400">
          {t('waitingPlayersLine1')}
          <br />
          {t('waitingPlayersLine2')}
        </div>
      ) : (
        <>
          <div className="flex h-48 w-full shrink-0 items-center justify-center">
            {countdown !== null ? (
              <span className="text-7xl font-bold text-white">{formatTime(countdown)}</span>
            ) : currentBall ? (
              <div className={`relative flex h-40 w-40 items-center justify-center rounded-full border border-white/30 shadow-[0_20px_40px_rgba(0,0,0,0.6),inset_0_-10px_20px_rgba(0,0,0,0.6),inset_0_10px_20px_rgba(255,255,255,0.4)] sm:h-48 sm:w-48 ${getBallGradient(currentBall.letter)}`}>
                <div className="pointer-events-none absolute left-5 top-4 h-10 w-32 -rotate-12 rounded-full bg-white/35 blur-md" />
                <span className="relative z-10 text-5xl font-black text-white drop-shadow-[0_5px_5px_rgba(0,0,0,0.6)] sm:text-6xl">{currentBall.letter}-{currentBall.number}</span>
              </div>
            ) : (
              <span className="font-bold text-slate-400">{t('waitingGame')}</span>
            )}
          </div>

          <div className="grid flex-1 grid-cols-2 items-start gap-2">
            <div className="flex min-w-0 flex-col gap-2">
              <div className="flex min-h-11 flex-wrap justify-center gap-2">
                {calledHistory.map((ball, i) => (
                  <div key={i} className={`flex h-11 w-11 items-center justify-center rounded-full border border-white/30 text-sm font-bold text-white shadow-[0_4px_0_rgba(0,0,0,0.6)] ${getBallGradient(ball.letter)}`}>{ball.number}</div>
                ))}
              </div>
              <div className="flex flex-col gap-1 overflow-hidden rounded-xl border border-slate-600/50 bg-slate-800/80 p-1.5 shadow-xl">
                <div className="grid grid-cols-5 gap-1">
                  {['B', 'I', 'N', 'G', 'O'].map((letter) => (
                    <div key={letter} className={`rounded py-1 text-center text-xs font-black text-white shadow-md ${letter === 'B' ? 'bg-blue-600' : letter === 'I' ? 'bg-red-600' : letter === 'N' ? 'bg-purple-600' : letter === 'G' ? 'bg-green-600' : 'bg-yellow-500'}`}>{letter}</div>
                  ))}
                </div>
                <div className="grid grid-cols-5 gap-1 text-[10px] sm:text-xs">
                  {Array.from({ length: 15 }, (_, rowIndex) => (
                    <Fragment key={rowIndex}>
                      {[0, 1, 2, 3, 4].map((colIndex) => {
                        const num = rowIndex + 1 + (colIndex * 15);
                        const isCalled = calledNumbers.includes(num);
                        return (
                          <div key={num} className={`flex aspect-square min-w-0 items-center justify-center rounded border ${isCalled ? 'border-amber-200/50 bg-gradient-to-b from-amber-300 to-amber-500 font-bold text-slate-950 shadow-[0_3px_0_#78350f]' : 'border-slate-700 bg-slate-900 text-slate-400 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]'}`}>{num}</div>
                        );
                      })}
                    </Fragment>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex min-w-0 flex-col items-center gap-3">
              {cardsData && cardsData.length > 0 ? (
                <div className="w-full rounded-xl border border-slate-600/50 bg-slate-800/80 p-1.5 shadow-xl sm:p-2">
                  <div className="mb-1 text-center text-xs font-bold text-slate-300 sm:text-sm">{t('cardNo', { number: cardsData[0]?.id || '?' })}</div>
                  <div className="mb-1 grid grid-cols-5 gap-1">
                    {['B', 'I', 'N', 'G', 'O'].map((letter) => (
                      <div key={letter} className={`flex min-h-8 items-center justify-center rounded border-b-2 border-black/30 bg-gradient-to-b text-xs font-black text-white shadow-md ${letter === 'B' ? 'from-blue-600 to-blue-800' : letter === 'I' ? 'from-red-600 to-red-800' : letter === 'N' ? 'from-purple-600 to-purple-800' : letter === 'G' ? 'from-green-600 to-green-800' : 'from-yellow-500 to-yellow-700'}`}>{letter}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-5 gap-1">
                    {cardsData[0]?.matrix?.flat().map((num, index) => {
                      const isFree = index === 12 || num === 'FREE';
                      const isMarked = isFree || markedNumbers.includes(num);
                      return (
                        <button key={index} onClick={() => !isFree && handleDaub(num)} className={`flex aspect-square min-h-0 min-w-0 items-center justify-center rounded-lg border text-[10px] font-bold transition-all duration-150 sm:text-sm ${isMarked ? 'scale-[0.98] border-slate-700 bg-slate-900 text-emerald-300 shadow-[inset_0_4px_8px_rgba(0,0,0,0.9)]' : 'border-slate-300 bg-slate-100 text-slate-900 shadow-[0_3px_0_rgb(148,163,184)] active:translate-y-0.5 active:shadow-none'}`}>
                          {isFree ? 'F' : num}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="mt-10 text-center text-white">{t('loadingCard')}</div>
              )}
              <button onClick={handleBingoClick} className="min-h-12 w-full max-w-sm rounded-xl border border-amber-300 bg-gradient-to-b from-yellow-300 to-amber-500 py-3 text-2xl font-extrabold text-slate-900 shadow-[0_5px_0_#92400e] transition-all active:translate-y-1 active:shadow-none">{t('bingo')}</button>
            </div>
          </div>
        </>
      )}

      {bingoMessage && (
        <div className={`fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 px-6 py-4 rounded-xl shadow-2xl font-bold text-center z-50 ${bingoMessage.success ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
          {bingoMessage.message}
        </div>
      )}

      {gameResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md transition-opacity">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="game-result-title"
            className="mx-4 w-full max-w-sm scale-100 rounded-3xl border border-slate-600/50 bg-slate-800/90 p-8 text-center shadow-[0_0_50px_rgba(0,0,0,0.8)] transition-all duration-300"
          >
            <div className="mb-4 flex justify-center">
              <div className={`flex h-20 w-20 items-center justify-center rounded-full text-4xl ${gameResult.type === 'win' ? 'animate-bounce bg-yellow-400 shadow-[0_0_30px_rgba(250,204,21,0.6)]' : 'bg-slate-700 text-slate-200 shadow-inner'}`}>
                {gameResult.type === 'win' ? '🏆' : '🎲'}
              </div>
            </div>
            <h2 id="game-result-title" className={`mb-2 text-3xl font-black ${gameResult.type === 'win' ? 'bg-gradient-to-r from-yellow-300 to-yellow-500 bg-clip-text text-transparent' : 'text-slate-200'}`}>
              {t(gameResult.titleKey)}
            </h2>
            <p className="mb-6 text-sm text-slate-300">{t(gameResult.messageKey, {
              ...gameResult.messageValues,
              name: gameResult.messageValues?.name || t('player'),
            })}</p>
            <div className="flex flex-col gap-3">
              {gameResult.type === 'win' && (
                <div className="mb-1 flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
                  <span className="text-sm font-bold text-emerald-400">{t('resultPrize')}</span>
                  <span className="text-lg font-black text-emerald-300">+ ETB {gameResult.messageValues?.amount}</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => { setGameResult(null); navigate(`/select-card?stake=${stake}`); }}
                className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 py-3.5 font-bold text-white shadow-[0_5px_0_#1e3a8a] transition-all active:translate-y-1 active:shadow-none"
              >
                {t('playAgain')}
              </button>
              <button
                type="button"
                onClick={() => { setGameResult(null); navigate('/'); }}
                className="w-full rounded-xl py-2 font-bold text-slate-400 transition-colors hover:text-white"
              >
                {t('backToLobby')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameScreen;
