export interface SportSkill {
  id: string;
  sport_id: string;
  name: string;
  display_name: string;
}

export interface TurfRatingSummary {
  count: number;
  overall: number;
  averages: Record<string, number>;
}

export interface PlayerSkillRating {
  skill_id: string;
  display_name: string;
  sport_id: string;
  average: number;
  count: number;
}

export interface PlayerRatingSummary {
  count: number;
  skills: PlayerSkillRating[];
}

export interface GameParticipant {
  id: string;
  name: string;
  is_host: boolean;
  skills: { id: string; display_name: string; sport_id: string }[];
}
