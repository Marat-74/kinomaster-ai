
const clamp = (value, min, max) =>
  Math.max(min, Math.min(max, value));

const lerp = (a, b, t) =>
  a + (b - a) * t;

export const EASING = {
  linear: t => t,
  easeIn: t => t * t,
  easeOut: t => 1 - (1 - t) ** 2,
  easeInOut: t =>
    t < 0.5
      ? 2 * t * t
      : 1 - (-2 * t + 2) ** 2 / 2
};

export function createMotion({
  id = crypto.randomUUID(),
  name = "Новое движение",
  duration = 1000,
  loop = false,
  keyframes = []
} = {}) {
  return {
    id,
    name,
    duration: Math.max(1, duration),
    loop,
    keyframes: [...keyframes].sort(
      (a, b) => a.time - b.time
    )
  };
}

export function addKeyframe(motion, {
  time,
  target,
  values,
  easing = "easeInOut"
}) {
  if (!motion || !Array.isArray(motion.keyframes)) {
    throw new Error("Некорректное движение");
  }

  if (!Number.isFinite(time) || time < 0) {
    throw new Error("Некорректное время кадра");
  }

  if (!target || typeof target !== "string") {
    throw new Error("Не указана цель анимации");
  }

  const keyframe = {
    id: crypto.randomUUID(),
    time: clamp(time, 0, motion.duration),
    target,
    values: { ...values },
    easing
  };

  motion.keyframes.push(keyframe);
  motion.keyframes.sort((a, b) => a.time - b.time);

  return keyframe;
}

export function removeKeyframe(motion, keyframeId) {
  const before = motion.keyframes.length;

  motion.keyframes = motion.keyframes.filter(
    frame => frame.id !== keyframeId
  );

  return motion.keyframes.length !== before;
}

function interpolateValues(from, to, progress) {
  const result = {};

  for (const key of new Set([
    ...Object.keys(from || {}),
    ...Object.keys(to || {})
  ])) {
    const a = from?.[key] ?? to?.[key] ?? 0;
    const b = to?.[key] ?? a;

    if (typeof a === "number" && typeof b === "number") {
      result[key] = lerp(a, b, progress);
    } else {
      result[key] = progress < 1 ? a : b;
    }
  }

  return result;
}

export function evaluateMotion(motion, time) {
  if (!motion || !Array.isArray(motion.keyframes)) {
    throw new Error("Некорректное движение");
  }

  if (motion.keyframes.length === 0) {
    return {};
  }

  let currentTime = clamp(time, 0, motion.duration);

  if (motion.loop && motion.duration > 0) {
    currentTime = ((time % motion.duration) + motion.duration)
      % motion.duration;
  }

  const grouped = {};

  for (const frame of motion.keyframes) {
    if (!grouped[frame.target]) {
      grouped[frame.target] = [];
    }

    grouped[frame.target].push(frame);
  }

  const result = {};

  for (const [target, frames] of Object.entries(grouped)) {
    frames.sort((a, b) => a.time - b.time);

    const previous = [...frames]
      .reverse()
      .find(frame => frame.time <= currentTime);

    const next = frames.find(
      frame => frame.time >= currentTime
    );

    if (!previous) {
      result[target] = { ...frames[0].values };
      continue;
    }

    if (!next || previous.id === next.id) {
      result[target] = { ...previous.values };
      continue;
    }

    const range = next.time - previous.time;

    const progress = range === 0
      ? 1
      : clamp((currentTime - previous.time) / range, 0, 1);

    const easing = EASING[next.easing] || EASING.linear;

    result[target] = interpolateValues(
      previous.values,
      next.values,
      easing(progress)
    );
  }

  return result;
}

export function createMotionLibrary() {
  return {
    motions: [],
    add(motion) {
      this.motions.push(motion);
      return motion;
    },
    get(id) {
      return this.motions.find(motion => motion.id === id) || null;
    },
    remove(id) {
      const before = this.motions.length;
      this.motions = this.motions.filter(
        motion => motion.id !== id
      );
      return this.motions.length !== before;
    }
  };
}
