// ChickenPicks scoring rule (simplified from la-polla's 5/3/2/0/1):
//
//   - 5 pts: exact score (both home_score and away_score correct)
//   - 3 pts: correct W/D/L outcome (home win, draw, or away win) — any score
//   - 0 pts: wrong outcome OR match unsettled OR prediction unset
//
// Tie-break across whole-polla totals is by earlier `submitted_at_slot` —
// handled in settle_polla, not here.

use crate::state::{Match, PredictionScore};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Outcome {
    HomeWin,
    Draw,
    AwayWin,
}

impl Outcome {
    pub fn from_scores(home: i8, away: i8) -> Option<Self> {
        if home < 0 || away < 0 {
            return None;
        }
        Some(match home.cmp(&away) {
            core::cmp::Ordering::Greater => Self::HomeWin,
            core::cmp::Ordering::Equal => Self::Draw,
            core::cmp::Ordering::Less => Self::AwayWin,
        })
    }
}

pub fn score_match(prediction: &PredictionScore, match_result: &Match) -> u32 {
    if !match_result.settled {
        return 0;
    }

    let actual_outcome = match Outcome::from_scores(match_result.home_score, match_result.away_score) {
        Some(o) => o,
        None => return 0,
    };
    let pred_outcome = match Outcome::from_scores(prediction.home, prediction.away) {
        Some(o) => o,
        None => return 0,
    };

    // Exact-score match → 5 pts.
    if prediction.home == match_result.home_score && prediction.away == match_result.away_score {
        return 5;
    }

    // Correct W/D/L outcome → 3 pts (regardless of goal difference).
    if pred_outcome == actual_outcome {
        return 3;
    }

    // Wrong outcome → 0 pts.
    0
}

#[cfg(test)]
mod tests {
    use super::*;
    use anchor_lang::prelude::Pubkey;

    fn ps(home: i8, away: i8) -> PredictionScore {
        PredictionScore { home, away }
    }

    fn m(home_score: i8, away_score: i8, settled: bool) -> Match {
        Match {
            polla: Pubkey::default(),
            match_index: 0,
            home_team: [0; 16],
            away_team: [0; 16],
            home_score,
            away_score,
            settled,
            bump: 0,
        }
    }

    #[test]
    fn exact_score_yields_5() {
        assert_eq!(score_match(&ps(2, 1), &m(2, 1, true)), 5);
        assert_eq!(score_match(&ps(0, 0), &m(0, 0, true)), 5);
    }

    #[test]
    fn correct_outcome_yields_3() {
        // Any correct W/D/L outcome (not exact) yields 3 — goal difference
        // is no longer rewarded separately under the simplified 5/3/0 rule.
        // home win — predicted 2-1, actual 3-2 (different score, same outcome)
        assert_eq!(score_match(&ps(2, 1), &m(3, 2, true)), 3);
        // away win, different margin — predicted 0-2, actual 0-3
        assert_eq!(score_match(&ps(0, 2), &m(0, 3, true)), 3);
        // draw — predicted 1-1, actual 2-2
        assert_eq!(score_match(&ps(1, 1), &m(2, 2, true)), 3);
        // home win bigger margin — pred 3-0, actual 2-0
        assert_eq!(score_match(&ps(3, 0), &m(2, 0, true)), 3);
        // home win smaller margin — pred 1-0, actual 5-0
        assert_eq!(score_match(&ps(1, 0), &m(5, 0, true)), 3);
    }

    #[test]
    fn wrong_outcome_yields_0() {
        // predicted home win, actual away win
        assert_eq!(score_match(&ps(2, 1), &m(0, 3, true)), 0);
        // predicted draw, actual home win
        assert_eq!(score_match(&ps(1, 1), &m(2, 0, true)), 0);
    }

    #[test]
    fn unsettled_match_yields_0() {
        assert_eq!(score_match(&ps(2, 1), &m(0, 0, false)), 0);
        // even with the right "score" stored, an unsettled match is 0
        assert_eq!(score_match(&ps(2, 1), &m(2, 1, false)), 0);
    }

    #[test]
    fn unset_prediction_yields_0() {
        assert_eq!(score_match(&ps(-1, -1), &m(2, 1, true)), 0);
        assert_eq!(score_match(&ps(2, -1), &m(2, 1, true)), 0);
    }

    #[test]
    fn unset_match_score_yields_0_even_if_settled_flag_true() {
        // defensive: settled=true but score=-1 should be impossible by program logic,
        // but the scoring fn must still not credit anything
        assert_eq!(score_match(&ps(0, 0), &m(-1, 0, true)), 0);
    }

    #[test]
    fn outcome_helper_classifies_correctly() {
        assert_eq!(Outcome::from_scores(2, 1), Some(Outcome::HomeWin));
        assert_eq!(Outcome::from_scores(1, 2), Some(Outcome::AwayWin));
        assert_eq!(Outcome::from_scores(0, 0), Some(Outcome::Draw));
        assert_eq!(Outcome::from_scores(-1, 0), None);
    }
}
