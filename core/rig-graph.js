
export function createRig(name = "Новый скелет") {
  return {
    id: crypto.randomUUID(),
    name,
    root: null,
    bones: [],
    joints: [],
    constraints: []
  };
}

export function addBone(rig, {
  id = crypto.randomUUID(),
  name,
  parentId = null,
  start = { x: 0, y: 0 },
  end = { x: 0, y: 0 },
  layerId = null
}) {
  if (!rig || !Array.isArray(rig.bones)) {
    throw new Error("Некорректный скелет");
  }

  if (rig.bones.some(bone => bone.id === id)) {
    throw new Error("Кость с таким ID уже существует");
  }

  if (parentId && !rig.bones.some(bone => bone.id === parentId)) {
    throw new Error("Родительская кость не найдена");
  }

  const bone = {
    id,
    name: name || `Кость ${rig.bones.length + 1}`,
    parentId,
    start: { ...start },
    end: { ...end },
    layerId
  };

  rig.bones.push(bone);

  if (!rig.root) {
    rig.root = id;
  }

  return bone;
}

export function addJoint(rig, {
  id = crypto.randomUUID(),
  name,
  boneA,
  boneB,
  x = 0,
  y = 0,
  type = "rotation",
  minAngle = -180,
  maxAngle = 180
}) {
  if (!rig || !Array.isArray(rig.bones)) {
    throw new Error("Некорректный скелет");
  }

  const exists = id => rig.bones.some(bone => bone.id === id);

  if (!exists(boneA) || !exists(boneB)) {
    throw new Error("Одна из костей не найдена");
  }

  if (boneA === boneB) {
    throw new Error("Нельзя соединить кость саму с собой");
  }

  const joint = {
    id,
    name: name || "Сустав",
    boneA,
    boneB,
    position: { x, y },
    type,
    limits: {
      minAngle,
      maxAngle
    }
  };

  rig.joints.push(joint);
  return joint;
}

export function removeBone(rig, boneId) {
  const removed = rig.bones.find(bone => bone.id === boneId);

  if (!removed) return false;

  const descendants = new Set([boneId]);

  let changed = true;
  while (changed) {
    changed = false;

    for (const bone of rig.bones) {
      if (
        bone.parentId &&
        descendants.has(bone.parentId) &&
        !descendants.has(bone.id)
      ) {
        descendants.add(bone.id);
        changed = true;
      }
    }
  }

  rig.bones = rig.bones.filter(
    bone => !descendants.has(bone.id)
  );

  rig.joints = rig.joints.filter(
    joint =>
      !descendants.has(joint.boneA) &&
      !descendants.has(joint.boneB)
  );

  if (descendants.has(rig.root)) {
    rig.root = rig.bones[0]?.id || null;
  }

  return true;
}

export function validateRig(rig) {
  if (!rig || !Array.isArray(rig.bones) || !Array.isArray(rig.joints)) {
    throw new Error("Некорректная структура скелета");
  }

  const ids = new Set(rig.bones.map(bone => bone.id));

  if (ids.size !== rig.bones.length) {
    throw new Error("Обнаружены повторяющиеся ID костей");
  }

  for (const bone of rig.bones) {
    if (bone.parentId && !ids.has(bone.parentId)) {
      throw new Error(`Не найдена родительская кость: ${bone.parentId}`);
    }
  }

  for (const joint of rig.joints) {
    if (!ids.has(joint.boneA) || !ids.has(joint.boneB)) {
      throw new Error("Сустав ссылается на отсутствующую кость");
    }
  }

  return true;
}
