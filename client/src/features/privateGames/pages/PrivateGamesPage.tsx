import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { gamesApi } from '../../../api/endpoints/games';
import { getSportEmoji, formatDate, formatTime } from '../../../utils/helpers';

export default function PrivateGamesPage() {
  const navigate = useNavigate();
  const { data: games = [], isLoading } = useQuery({
    queryKey: ['my-games'],
    queryFn: gamesApi.getMyGames,
  });

  const privateGames = games.filter((g) => g.type === 'private');

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-gradient-to-r from-slate-700 to-slate-900 px-5 pt-12 pb-5 text-white">
        <h1 className="text-2xl font-extrabold">Private Games</h1>
        <p className="text-slate-300 text-sm">Your exclusive games</p>
      </div>
      <div className="px-4 py-4 space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => <div key={i} className="h-20 bg-slate-100 rounded-2xl animate-pulse" />)}
          </div>
        ) : privateGames.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">🔒</div>
            <p className="text-slate-500 font-medium">No private games yet</p>
          </div>
        ) : (
          privateGames.map((game) => (
            <div
              key={game.id}
              onClick={() => navigate(`/games/${game.id}`)}
              className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm cursor-pointer"
            >
              <h3 className="font-bold text-slate-800">{game.title}</h3>
              <p className="text-slate-400 text-xs mt-1">
                {formatDate(game.start_time)} · {formatTime(game.start_time)}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
