-- Row Level Security policies for production access control

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sports ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sports ENABLE ROW LEVEL SECURITY;
ALTER TABLE turfs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- users policies
CREATE POLICY users_select_self ON users
  FOR SELECT USING (id = auth.uid());

CREATE POLICY users_update_self ON users
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY users_insert_self ON users
  FOR INSERT WITH CHECK (id = auth.uid());

-- sports policies
CREATE POLICY sports_select_public ON sports
  FOR SELECT USING (deleted_at IS NULL);

-- user_sports policies
CREATE POLICY user_sports_select_self ON user_sports
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY user_sports_insert_self ON user_sports
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY user_sports_update_self ON user_sports
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY user_sports_delete_self ON user_sports
  FOR DELETE USING (user_id = auth.uid());

-- turfs policies
CREATE POLICY turfs_select_public ON turfs
  FOR SELECT USING (deleted_at IS NULL AND status = 'active');

CREATE POLICY turfs_insert_owner ON turfs
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY turfs_update_owner ON turfs
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY turfs_delete_owner ON turfs
  FOR DELETE USING (owner_id = auth.uid());

-- bookings policies
CREATE POLICY bookings_select_self ON bookings
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY bookings_insert_self ON bookings
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY bookings_update_self ON bookings
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY bookings_delete_self ON bookings
  FOR DELETE USING (user_id = auth.uid());

-- games policies
CREATE POLICY games_select_public_or_member ON games
  FOR SELECT USING (
    deleted_at IS NULL AND (
      type = 'public'
      OR creator_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM game_players gp
        WHERE gp.game_id = games.id
          AND gp.user_id = auth.uid()
          AND gp.deleted_at IS NULL
      )
    )
  );

CREATE POLICY games_insert_creator ON games
  FOR INSERT WITH CHECK (creator_id = auth.uid());

CREATE POLICY games_update_creator ON games
  FOR UPDATE USING (creator_id = auth.uid());

CREATE POLICY games_delete_creator ON games
  FOR DELETE USING (creator_id = auth.uid());

-- game_players policies
CREATE POLICY game_players_select_self_or_creator ON game_players
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM games g
      WHERE g.id = game_players.game_id
        AND g.creator_id = auth.uid()
    )
  );

CREATE POLICY game_players_insert_self ON game_players
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY game_players_update_self ON game_players
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY game_players_delete_self ON game_players
  FOR DELETE USING (user_id = auth.uid());

-- payments policies
CREATE POLICY payments_select_self ON payments
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY payments_insert_self ON payments
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY payments_update_self ON payments
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY payments_delete_self ON payments
  FOR DELETE USING (user_id = auth.uid());

-- notifications policies
CREATE POLICY notifications_select_self ON notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY notifications_insert_self ON notifications
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY notifications_update_self ON notifications
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY notifications_delete_self ON notifications
  FOR DELETE USING (user_id = auth.uid());

-- otp_verifications policies
ALTER TABLE otp_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY otp_verifications_select_all ON otp_verifications
  FOR SELECT USING (true);

CREATE POLICY otp_verifications_insert_all ON otp_verifications
  FOR INSERT WITH CHECK (true);

CREATE POLICY otp_verifications_update_all ON otp_verifications
  FOR UPDATE USING (true);

CREATE POLICY otp_verifications_delete_all ON otp_verifications
  FOR DELETE USING (true);

-- user_sessions policies
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_sessions_select_self ON user_sessions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY user_sessions_insert_self ON user_sessions
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY user_sessions_update_self ON user_sessions
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY user_sessions_delete_self ON user_sessions
  FOR DELETE USING (user_id = auth.uid());
