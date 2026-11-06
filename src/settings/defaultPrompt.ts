export const DEFAULT_CONDITION = 'Type 2 Diabetes, on metformin'

export const DEFAULT_PROMPT = `Act as an evidence-based medical nutrition expert. Evaluate whether a specific food is suitable for someone with a given medical condition.

My medical condition: [Condition]

Explain briefly:
Verdict: Is this food good, bad, or OK in moderation for my condition?
Why it's good: Potential nutritional benefits.
Why it's bad: Potential risks or negative effects related to my condition.
Recommendation: Should I eat it, limit it, or avoid it?
Keep the answer short, practical, and easy to understand. Focus specifically on how the food affects my medical condition, not just general nutritional value.
Use reliable medical and nutritional evidence. Do not exaggerate risks or benefits. If the answer depends on portion size, preparation, or individual circumstances, mention it.
Do not automatically classify foods as healthy or unhealthy. Be objective and medically accurate.

Food to evaluate: [FOOD]`
