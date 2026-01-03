// ============================================================================
// Linera GraphQL Queries - For querying on-chain state
// ============================================================================

// Public strategies query
export const PUBLIC_STRATEGIES_QUERY = `
  query PublicStrategies($limit: Int) {
    publicStrategies(limit: $limit) {
      strategy {
        id
        name
        description
        marketKind
        isPublic
        creator
        createdAt
      }
      stats {
        totalSignals
        wins
        losses
        winRate
        totalPnl
        avgPnl
        bestWin
        worstLoss
        currentStreak
        followers
      }
    }
  }
`;

// Single strategy query
export const STRATEGY_QUERY = `
  query Strategy($id: Int!) {
    strategy(id: $id) {
      strategy {
        id
        name
        description
        marketKind
        isPublic
        creator
        createdAt
      }
      stats {
        totalSignals
        wins
        losses
        winRate
        totalPnl
        avgPnl
        bestWin
        worstLoss
        currentStreak
        followers
      }
    }
  }
`;

// Strategy signals query
export const STRATEGY_SIGNALS_QUERY = `
  query StrategySignals($strategyId: Int!, $status: String, $limit: Int) {
    strategySignals(strategyId: $strategyId, status: $status, limit: $limit) {
      id
      strategyId
      market
      direction
      entryPrice
      targetPrice
      stopLoss
      confidence
      reasoning
      status
      exitPrice
      pnlPercent
      createdAt
      expiresAt
      resolvedAt
    }
  }
`;

// Top strategies query
export const TOP_STRATEGIES_QUERY = `
  query TopStrategies($limit: Int) {
    topStrategies(limit: $limit) {
      strategy {
        id
        name
        description
        marketKind
        isPublic
        creator
        createdAt
      }
      stats {
        totalSignals
        wins
        losses
        winRate
        totalPnl
        avgPnl
        bestWin
        worstLoss
        currentStreak
        followers
      }
    }
  }
`;

// Open signals query
export const OPEN_SIGNALS_QUERY = `
  query OpenSignals($limit: Int) {
    openSignals(limit: $limit) {
      id
      strategyId
      market
      direction
      entryPrice
      targetPrice
      stopLoss
      confidence
      reasoning
      status
      createdAt
      expiresAt
    }
  }
`;

// Recent signals query
export const RECENT_SIGNALS_QUERY = `
  query RecentSignals($limit: Int) {
    recentSignals(limit: $limit) {
      id
      strategyId
      market
      direction
      entryPrice
      targetPrice
      stopLoss
      confidence
      reasoning
      status
      exitPrice
      pnlPercent
      createdAt
      expiresAt
      resolvedAt
    }
  }
`;

// My strategies query
export const MY_STRATEGIES_QUERY = `
  query MyStrategies($wallet: String!) {
    myStrategies(wallet: $wallet) {
      strategy {
        id
        name
        description
        marketKind
        isPublic
        creator
        createdAt
      }
      stats {
        totalSignals
        wins
        losses
        winRate
        totalPnl
        avgPnl
        bestWin
        worstLoss
        currentStreak
        followers
      }
    }
  }
`;

// Is strategist check
export const IS_STRATEGIST_QUERY = `
  query IsStrategist($wallet: String!) {
    isStrategist(wallet: $wallet)
  }
`;

// ============================================================================
// Mutations (via operation submission)
// ============================================================================

export const REGISTER_STRATEGIST_MUTATION = `
  mutation RegisterStrategist($name: String!, $bio: String!, $avatarUrl: String!) {
    registerStrategist(name: $name, bio: $bio, avatarUrl: $avatarUrl)
  }
`;

export const CREATE_STRATEGY_MUTATION = `
  mutation CreateAgentStrategy($name: String!, $description: String!, $marketKind: MarketKind!, $isPublic: Boolean!) {
    createAgentStrategy(name: $name, description: $description, marketKind: $marketKind, isPublic: $isPublic)
  }
`;

export const PUBLISH_SIGNAL_MUTATION = `
  mutation PublishSignal($input: PublishSignalInput!) {
    publishSignal(input: $input)
  }
`;

export const RESOLVE_SIGNAL_MUTATION = `
  mutation ResolveSignal($signalId: Int!, $exitPrice: Float!) {
    resolveSignal(signalId: $signalId, exitPrice: $exitPrice)
  }
`;

export const FOLLOW_STRATEGY_MUTATION = `
  mutation FollowStrategy($strategyId: Int!) {
    followStrategy(strategyId: $strategyId)
  }
`;

export const UNFOLLOW_STRATEGY_MUTATION = `
  mutation UnfollowStrategy($strategyId: Int!) {
    unfollowStrategy(strategyId: $strategyId)
  }
`;
