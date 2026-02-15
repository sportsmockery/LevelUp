import type { RegressionThresholds } from './types';

// Regression thresholds — deploys should not proceed if these are exceeded.
// Tune as the gold-label dataset grows and baselines are established.
export const REGRESSION_THRESHOLDS: RegressionThresholds = {
  max_overall_mae: 8,        // Average error of 8 points on overall score (0-100)
  max_position_mae: 10,      // Average error of 10 points per position
  min_technique_recall: 0.6,  // At least 60% of coach-labeled techniques found by AI
  min_key_moment_recall: 0.5, // At least 50% of key moments identified
  min_winner_accuracy: 0.9,   // 90% winner prediction accuracy
};
