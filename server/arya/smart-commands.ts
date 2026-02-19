interface SmartCommandResult {
  handled: boolean;
  response?: string;
  type?: "instant" | "utility" | "info";
  icon?: string;
}

export function processSmartCommand(message: string): SmartCommandResult {
  const msg = message.trim().toLowerCase();

  if (matchesTimeQuery(msg)) {
    return handleTimeCommand(msg);
  }

  if (matchesDateQuery(msg)) {
    return handleDateCommand(msg);
  }

  if (matchesMathQuery(msg)) {
    return handleMathCommand(message);
  }

  if (matchesUnitConversion(msg)) {
    return handleUnitConversion(msg);
  }

  if (matchesDefinitionQuery(msg)) {
    return { handled: false };
  }

  if (matchesQuickFact(msg)) {
    return handleQuickFact(msg);
  }

  if (matchesGreeting(msg)) {
    return handleGreeting(msg);
  }

  if (matchesTimerReminder(msg)) {
    return handleTimerReminder(msg);
  }

  return { handled: false };
}

function matchesTimeQuery(msg: string): boolean {
  return /\b(what('?s| is) the time|current time|time now|what time is it|tell me the time|kitna baj|samay kya|time bata)\b/i.test(msg);
}

function handleTimeCommand(msg: string): SmartCommandResult {
  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });
  const greeting = getTimeGreeting(now);

  return {
    handled: true,
    type: "instant",
    icon: "clock",
    response: `It's **${timeStr}** IST right now. ${greeting}`,
  };
}

function getTimeGreeting(date: Date): string {
  const hour = date.getHours();
  if (hour < 5) return "Burning the midnight oil? Don't forget to rest.";
  if (hour < 12) return "Good morning! Hope your day is off to a great start.";
  if (hour < 17) return "Good afternoon! How's your day going?";
  if (hour < 21) return "Good evening! Winding down?";
  return "It's getting late — take care of yourself tonight.";
}

function matchesDateQuery(msg: string): boolean {
  return /\b(what('?s| is) (the |today'?s? )?date|today'?s? date|aaj ki date|aaj kya date|what day is it|which day|kya din hai|aaj kaun sa din)\b/i.test(msg);
}

function handleDateCommand(msg: string): SmartCommandResult {
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Kolkata",
  });

  return {
    handled: true,
    type: "instant",
    icon: "calendar",
    response: `Today is **${dateStr}**.`,
  };
}

function matchesMathQuery(msg: string): boolean {
  return /^[\d\s+\-*/().%^]+$/.test(msg.trim()) ||
    /\b(calculate|compute|what is|how much is)\s+[\d\s+\-*/().%^]+/i.test(msg) ||
    /\b(\d+)\s*(plus|minus|times|multiplied by|divided by|x|\+|-|\*|\/)\s*(\d+)/i.test(msg) ||
    /\b(square root|sqrt|cube root)\s*(of\s*)?(\d+)/i.test(msg) ||
    /\b(\d+)\s*(squared|cubed|percent of|% of)\s*(\d+)?/i.test(msg);
}

function handleMathCommand(originalMsg: string): SmartCommandResult {
  let expr = originalMsg.trim().toLowerCase();

  expr = expr.replace(/^(calculate|compute|what is|how much is|what's)\s+/i, "");
  expr = expr.replace(/\bplus\b/g, "+");
  expr = expr.replace(/\bminus\b/g, "-");
  expr = expr.replace(/\btimes\b|\bmultiplied by\b/g, "*");
  expr = expr.replace(/\bdivided by\b/g, "/");
  expr = expr.replace(/\bx\b/g, "*");

  const sqrtMatch = expr.match(/square root\s*(of\s*)?(\d+)/);
  if (sqrtMatch) {
    const num = parseFloat(sqrtMatch[2]);
    const result = Math.sqrt(num);
    return {
      handled: true,
      type: "instant",
      icon: "calculator",
      response: `The square root of ${num} is **${Number(result.toFixed(6))}**.`,
    };
  }

  const squaredMatch = expr.match(/(\d+)\s*squared/);
  if (squaredMatch) {
    const num = parseFloat(squaredMatch[1]);
    return {
      handled: true,
      type: "instant",
      icon: "calculator",
      response: `${num} squared is **${num * num}**.`,
    };
  }

  const percentMatch = expr.match(/(\d+)\s*(?:percent of|% of)\s*(\d+)/);
  if (percentMatch) {
    const pct = parseFloat(percentMatch[1]);
    const base = parseFloat(percentMatch[2]);
    const result = (pct / 100) * base;
    return {
      handled: true,
      type: "instant",
      icon: "calculator",
      response: `${pct}% of ${base} is **${Number(result.toFixed(2))}**.`,
    };
  }

  const cleanExpr = expr.replace(/[^0-9+\-*/().%\s]/g, "").trim();
  if (cleanExpr) {
    try {
      const result = Function(`"use strict"; return (${cleanExpr})`)();
      if (typeof result === "number" && isFinite(result)) {
        return {
          handled: true,
          type: "instant",
          icon: "calculator",
          response: `**${originalMsg.replace(/^(calculate|compute|what is|how much is|what's)\s+/i, "").trim()}** = **${Number(result.toFixed(6))}**`,
        };
      }
    } catch {}
  }

  return { handled: false };
}

function matchesUnitConversion(msg: string): boolean {
  return /\b(\d+\.?\d*)\s*(kg|kilogram|lb|pound|km|kilometer|mile|meter|feet|foot|ft|cm|inch|celsius|fahrenheit|°c|°f|liter|litre|gallon|gram|ounce|oz)\s*(to|in|into|=)\s*(kg|kilogram|lb|pound|km|kilometer|mile|meter|feet|foot|ft|cm|inch|celsius|fahrenheit|°c|°f|liter|litre|gallon|gram|ounce|oz)/i.test(msg);
}

function handleUnitConversion(msg: string): SmartCommandResult {
  const match = msg.match(/(\d+\.?\d*)\s*(kg|kilogram|lb|pound|km|kilometer|mile|meter|feet|foot|ft|cm|inch|celsius|fahrenheit|°c|°f|liter|litre|gallon|gram|ounce|oz)\s*(?:to|in|into|=)\s*(kg|kilogram|lb|pound|km|kilometer|mile|meter|feet|foot|ft|cm|inch|celsius|fahrenheit|°c|°f|liter|litre|gallon|gram|ounce|oz)/i);

  if (!match) return { handled: false };

  const value = parseFloat(match[1]);
  const from = normalizeUnit(match[2]);
  const to = normalizeUnit(match[3]);

  const conversions: Record<string, Record<string, (v: number) => number>> = {
    kg: { lb: (v) => v * 2.20462, gram: (v) => v * 1000 },
    lb: { kg: (v) => v / 2.20462, gram: (v) => v * 453.592 },
    gram: { kg: (v) => v / 1000, lb: (v) => v / 453.592, oz: (v) => v / 28.3495 },
    oz: { gram: (v) => v * 28.3495, lb: (v) => v / 16, kg: (v) => v * 0.0283495 },
    km: { mile: (v) => v * 0.621371, meter: (v) => v * 1000, ft: (v) => v * 3280.84 },
    mile: { km: (v) => v * 1.60934, meter: (v) => v * 1609.34, ft: (v) => v * 5280 },
    meter: { km: (v) => v / 1000, mile: (v) => v / 1609.34, ft: (v) => v * 3.28084, cm: (v) => v * 100, inch: (v) => v * 39.3701 },
    ft: { meter: (v) => v / 3.28084, cm: (v) => v * 30.48, inch: (v) => v * 12, km: (v) => v / 3280.84 },
    cm: { meter: (v) => v / 100, inch: (v) => v / 2.54, ft: (v) => v / 30.48 },
    inch: { cm: (v) => v * 2.54, ft: (v) => v / 12, meter: (v) => v / 39.3701 },
    celsius: { fahrenheit: (v) => (v * 9) / 5 + 32 },
    fahrenheit: { celsius: (v) => ((v - 32) * 5) / 9 },
    liter: { gallon: (v) => v * 0.264172 },
    gallon: { liter: (v) => v * 3.78541 },
  };

  const fn = conversions[from]?.[to];
  if (!fn) return { handled: false };

  const result = fn(value);
  return {
    handled: true,
    type: "instant",
    icon: "ruler",
    response: `**${value} ${from}** = **${Number(result.toFixed(4))} ${to}**`,
  };
}

function normalizeUnit(unit: string): string {
  const map: Record<string, string> = {
    kilogram: "kg", kilograms: "kg",
    pound: "lb", pounds: "lb",
    kilometer: "km", kilometers: "km",
    miles: "mile",
    meters: "meter",
    feet: "ft", foot: "ft",
    inches: "inch",
    "°c": "celsius", "°f": "fahrenheit",
    litre: "liter", litres: "liter", liters: "liter",
    gallons: "gallon",
    grams: "gram",
    ounce: "oz", ounces: "oz",
  };
  return map[unit.toLowerCase()] || unit.toLowerCase();
}

function matchesQuickFact(msg: string): boolean {
  return /\b(who (is|was) the (president|pm|prime minister|ceo)|capital of|population of|currency of|founder of)\b/i.test(msg);
}

function handleQuickFact(msg: string): SmartCommandResult {
  return { handled: false };
}

function matchesGreeting(msg: string): boolean {
  return /^(hi|hello|hey|namaste|namaskar|good morning|good evening|good afternoon|howdy|yo|sup|hola|vanakkam|sat sri akal)[\s!.?]*$/i.test(msg);
}

function handleGreeting(msg: string): SmartCommandResult {
  const now = new Date();
  const hour = new Date().getHours();
  let greeting: string;

  if (/namaste|namaskar/i.test(msg)) {
    greeting = "Namaste! How can I help you today?";
  } else if (/vanakkam/i.test(msg)) {
    greeting = "Vanakkam! What can I do for you?";
  } else if (/sat sri akal/i.test(msg)) {
    greeting = "Sat Sri Akal! How may I assist you?";
  } else if (hour < 12) {
    greeting = "Good morning! What's on your mind today?";
  } else if (hour < 17) {
    greeting = "Good afternoon! How can I help you?";
  } else {
    greeting = "Good evening! What can I do for you?";
  }

  return {
    handled: true,
    type: "instant",
    icon: "sparkle",
    response: greeting,
  };
}

function matchesTimerReminder(msg: string): boolean {
  return /\b(set (a |an )?(timer|alarm|reminder))\b/i.test(msg);
}

function handleTimerReminder(msg: string): SmartCommandResult {
  return {
    handled: true,
    type: "info",
    icon: "bell",
    response: "I can't set timers or alarms directly on your device yet — but I'm working on it! For now, you can ask me to remind you what to do, and I'll note it for you in our conversation.",
  };
}

function matchesDefinitionQuery(msg: string): boolean {
  return /\b(define|meaning of|what does .+ mean|definition of)\b/i.test(msg);
}
