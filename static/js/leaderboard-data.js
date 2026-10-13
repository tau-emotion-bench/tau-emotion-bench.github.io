// Leaderboard results, one ranking per user agent. To update, edit the numbers below;
// rows are sorted and ranked automatically.
//   pass1    = Avg@3: average success rate over three trials, in percent
//   pass3    = share of tasks solved in all three trials, averaged over the ten domains, in percent
//   provider = company that released the model (shown in the Company column)
//   domains  = Pass^3 per domain, in the order of `domains`, in percent
const LEADERBOARD = {
  updated: "2026-10-12",
  tasks: 580,
  trials: 3,
  domains: ["Airline", "Retail", "Telecom", "Telehealth", "School", "Basketball", "Restaurant", "Travel", "Movie", "Bank"],
  userAgents: [
    {
      // Paper Figure 1 (Avg@3) and Table 3 (Pass^3)
      id: "qwen",
      name: "Qwen3-235B-A22B-Instruct-2507",
      short: "Qwen3-235B-A22B-Instruct",  // shown in the table; `name` is shown on the switch
      entries: [
        { model: "DeepSeek-V4.1-Flash",            provider: "DeepSeek",    thinking: false, pass1: 55.9, pass3: 32.2,
          domains: [32.9, 44.3, 17.1, 31.4, 42.0, 38.0, 26.0, 30.0, 22.0, 38.0] },
        { model: "GLM-5.3",                        provider: "Z.ai",        thinking: true,  pass1: 51.9, pass3: 31.7,
          domains: [38.6, 45.7, 2.9, 20.0, 48.0, 62.0, 28.0, 14.0, 30.0, 28.0] },
        { model: "Qwen3.8-27B",                    provider: "Qwen",        thinking: true,  pass1: 49.9, pass3: 27.3,
          domains: [32.9, 38.6, 11.4, 30.0, 48.0, 28.0, 30.0, 16.0, 10.0, 28.0] },
        { model: "Kimi-K2.7-Code",                 provider: "Moonshot AI", thinking: true,  pass1: 49.3, pass3: 26.1,
          domains: [30.0, 44.3, 10.0, 14.3, 44.0, 34.0, 12.0, 12.0, 8.0, 52.0] },
        { model: "Gemma-4-31B-it",                 provider: "Google",      thinking: true,  pass1: 44.8, pass3: 24.7,
          domains: [30.0, 37.1, 12.9, 22.9, 56.0, 26.0, 18.0, 6.0, 12.0, 26.0] },
        { model: "MiniMax-M2.7",                   provider: "MiniMax",     thinking: true,  pass1: 38.6, pass3: 16.8,
          domains: [18.6, 27.1, 7.1, 12.9, 46.0, 22.0, 4.0, 0.0, 2.0, 28.0] },
        { model: "MiniMax-M3",                     provider: "MiniMax",     thinking: true,  pass1: 37.0, pass3: 17.6,
          domains: [7.1, 42.9, 11.4, 14.3, 16.0, 34.0, 12.0, 12.0, 4.0, 22.0] },
        { model: "Qwen3-235B-A22B-Thinking-2507",  provider: "Qwen",        thinking: true,  pass1: 36.0, pass3: 16.5,
          domains: [22.9, 31.4, 7.1, 20.0, 20.0, 26.0, 8.0, 4.0, 0.0, 26.0] },
        { model: "Muse-Glimmer-30B",               provider: "Meta",        thinking: true,  pass1: 35.1, pass3: 20.5,
          domains: [20.0, 0.0, 8.6, 14.3, 64.0, 28.0, 10.0, 18.0, 12.0, 30.0] },
        { model: "Qwen3-235B-A22B-Instruct-2507",  provider: "Qwen",        thinking: false, pass1: 32.6, pass3: 13.8,
          domains: [17.1, 15.7, 10.0, 21.4, 22.0, 24.0, 4.0, 0.0, 0.0, 24.0] },
        { model: "Qwen3-32B",                      provider: "Qwen",        thinking: true,  pass1: 28.5, pass3:  8.6,
          domains: [8.6, 21.4, 8.6, 15.7, 14.0, 12.0, 2.0, 2.0, 2.0, 0.0] },
        { model: "Qwen3-32B",                      provider: "Qwen",        thinking: false, pass1: 23.9, pass3:  9.4,
          domains: [10.0, 21.4, 12.9, 10.0, 20.0, 4.0, 6.0, 0.0, 0.0, 10.0] }
      ]
    },
    {
      // Paper Figure 1 (Avg@3) and Table 13 (Pass^1 and Pass^3 per domain)
      id: "glm",
      name: "GLM-5.2",
      entries: [
        { model: "GLM-5.3",                        provider: "Z.ai",        thinking: true,  pass1: 78.6, pass3: 66.5,
          domains: [80.0, 94.3, 40.0, 64.3, 52.0, 80.0, 70.0, 76.0, 58.0, 50.0] },
        { model: "DeepSeek-V4.1-Flash",            provider: "DeepSeek",    thinking: false, pass1: 77.5, pass3: 64.6,
          domains: [78.6, 92.9, 50.0, 60.0, 54.0, 54.0, 66.0, 86.0, 36.0, 68.0] },
        { model: "Kimi-K2.7-Code",                 provider: "Moonshot AI", thinking: true,  pass1: 74.1, pass3: 59.1,
          domains: [54.3, 82.9, 37.1, 64.3, 74.0, 66.0, 42.0, 56.0, 28.0, 86.0] },
        { model: "Qwen3.8-27B",                    provider: "Qwen",        thinking: true,  pass1: 73.6, pass3: 58.0,
          domains: [64.3, 84.3, 45.7, 61.4, 56.0, 52.0, 54.0, 68.0, 20.0, 74.0] },
        { model: "Gemma-4-31B-it",                 provider: "Google",      thinking: true,  pass1: 66.2, pass3: 53.1,
          domains: [51.4, 88.6, 55.7, 75.7, 66.0, 26.0, 42.0, 48.0, 14.0, 64.0] },
        { model: "MiniMax-M2.7",                   provider: "MiniMax",     thinking: true,  pass1: 57.0, pass3: 39.4,
          domains: [45.7, 70.0, 38.6, 61.4, 56.0, 28.0, 34.0, 14.0, 8.0, 38.0] },
        { model: "MiniMax-M3",                     provider: "MiniMax",     thinking: true,  pass1: 56.3, pass3: 42.4,
          domains: [21.4, 87.1, 37.1, 70.0, 22.0, 58.0, 38.0, 42.0, 6.0, 42.0] },
        { model: "Qwen3-235B-A22B-Thinking-2507",  provider: "Qwen",        thinking: true,  pass1: 55.6, pass3: 35.3,
          domains: [45.7, 62.9, 31.4, 48.6, 44.0, 44.0, 18.0, 6.0, 10.0, 42.0] },
        { model: "Muse-Glimmer-30B",               provider: "Meta",        thinking: true,  pass1: 54.7, pass3: 43.4,
          domains: [35.7, 0.0, 38.6, 65.7, 86.0, 30.0, 18.0, 72.0, 34.0, 54.0] },
        { model: "Qwen3-235B-A22B-Instruct-2507",  provider: "Qwen",        thinking: false, pass1: 51.7, pass3: 35.5,
          domains: [37.1, 42.9, 48.6, 50.0, 54.0, 36.0, 32.0, 10.0, 6.0, 38.0] },
        { model: "Qwen3-32B",                      provider: "Qwen",        thinking: true,  pass1: 42.9, pass3: 24.3,
          domains: [28.6, 52.9, 42.9, 42.9, 30.0, 20.0, 8.0, 4.0, 2.0, 12.0] },
        { model: "Qwen3-32B",                      provider: "Qwen",        thinking: false, pass1: 37.9, pass3: 23.9,
          domains: [20.0, 50.0, 54.3, 48.6, 34.0, 10.0, 8.0, 0.0, 0.0, 14.0] }
      ]
    }
  ]
};
