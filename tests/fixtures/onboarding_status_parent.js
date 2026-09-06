// Exact guard from canonical_onboarding_review.browser.js at 8af7fe27e1dc79257715430207cc8419fc627cad.
  if (Number(expectedReview.total) !== Number(expectedStatuses.staged || 0)
      + Number(expectedStatuses.needs_review || 0) + Number(expectedStatuses.blocked || 0)) {
    refuse(`${label.toUpperCase()}_STATUS_TOTAL_MISMATCH`);
  }
