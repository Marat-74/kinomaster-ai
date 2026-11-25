
const clamp = (value, min, max) =>
  Math.max(min, Math.min(max, value));

const toRadians = degrees =>
  degrees * Math.PI / 180;

export function createPose(rig) {
  if (!rig || !Array.isArray(rig.bones)) {
    throw new Error("Некорректный скелет");
  }

  return {
    rigId: rig.id,
    timestamp: Date.now(),
    bones: Object.fromEntries(
      rig.bones.map(bone => [
        bone.id,
        {
          x: bone.start.x,
          y: bone.start.y,
          rotation: 0,
          scaleX: 1,
          scaleY: 1
        }
      ])
    )
  };
}

export function applyMotionToPose(pose, motionValues) {
  const result = {
    ...pose,
    timestamp: Date.now(),
    bones: { ...pose.bones }
  };

  for (const [boneId, values] of Object.entries(motionValues || {})) {
    if (!result.bones[boneId]) continue;

    result.bones[boneId] = {
      ...result.bones[boneId],
      ...values
    };
  }

  return result;
}

export function constrainPose(pose, rig) {
  const result = {
    ...pose,
    bones: { ...pose.bones }
  };

  for (const joint of rig.joints || []) {
    const bone = result.bones[joint.boneB];

    if (!bone) continue;

    const min = joint.limits?.minAngle ?? -180;
    const max = joint.limits?.maxAngle ?? 180;

    bone.rotation = clamp(
      bone.rotation ?? 0,
      min,
      max
    );
  }

  return result;
}

export function calculateBoneEndpoints(rig, pose) {
  const endpoints = {};

  for (const bone of rig.bones) {
    const state = pose.bones[bone.id];

    if (!state) continue;

    const parent = bone.parentId
      ? endpoints[bone.parentId]
      : null;

    const origin = parent?.end || {
      x: state.x,
      y: state.y
    };

    const angle = toRadians(state.rotation || 0);

    const dx = bone.end.x - bone.start.x;
    const dy = bone.end.y - bone.start.y;

    const lengthX = dx * (state.scaleX ?? 1);
    const lengthY = dy * (state.scaleY ?? 1);

    const rotatedX =
      lengthX * Math.cos(angle) -
      lengthY * Math.sin(angle);

    const rotatedY =
      lengthX * Math.sin(angle) +
      lengthY * Math.cos(angle);

    endpoints[bone.id] = {
      start: { ...origin },
      end: {
        x: origin.x + rotatedX,
        y: origin.y + rotatedY
      }
    };
  }

  return endpoints;
}

export function interpolatePose(from, to, progress) {
  const t = clamp(progress, 0, 1);
  const bones = {};

  for (const boneId of new Set([
    ...Object.keys(from.bones),
    ...Object.keys(to.bones)
  ])) {
    const a = from.bones[boneId];
    const b = to.bones[boneId] || a;

    if (!a) {
      bones[boneId] = { ...b };
      continue;
    }

    bones[boneId] = {};

    for (const key of new Set([
      ...Object.keys(a),
      ...Object.keys(b)
    ])) {
      const start = a[key] ?? b[key];
      const end = b[key] ?? start;

      bones[boneId][key] =
        typeof start === "number" && typeof end === "number"
          ? start + (end - start) * t
          : t < 1 ? start : end;
    }
  }

  return {
    ...to,
    bones
  };
}
