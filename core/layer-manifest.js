
export const BODY_PARTS = [
  "head",
  "neck",
  "torso",
  "leftArm",
  "rightArm",
  "leftHand",
  "rightHand",
  "leftLeg",
  "rightLeg",
  "leftFoot",
  "rightFoot"
];

export function createLayer({
  id = crypto.randomUUID(),
  name = "Новый слой",
  part = "custom",
  image = null,
  visible = true,
  locked = false,
  zIndex = 0,
  opacity = 1,
  pivot = { x: 0, y: 0 },
  parentId = null
} = {}) {
  return {
    id,
    name,
    part,
    image,
    visible,
    locked,
    zIndex,
    opacity,
    pivot: { ...pivot },
    parentId,
    mask: null,
    metadata: {}
  };
}

export function createLayerManifest(characterId) {
  return {
    characterId,
    version: "1.0",
    width: 1920,
    height: 1080,
    layers: [],
    masks: [],
    attachments: []
  };
}

export function addLayer(manifest, layer) {
  if (!manifest || !Array.isArray(manifest.layers)) {
    throw new Error("Некорректная структура слоёв");
  }

  if (manifest.layers.some(item => item.id === layer.id)) {
    throw new Error("Слой с таким ID уже существует");
  }

  if (
    layer.parentId &&
    !manifest.layers.some(item => item.id === layer.parentId)
  ) {
    throw new Error("Родительский слой не найден");
  }

  manifest.layers.push(layer);
  manifest.layers.sort((a, b) => a.zIndex - b.zIndex);

  return layer;
}

export function removeLayer(manifest, layerId) {
  const exists = manifest.layers.some(
    layer => layer.id === layerId
  );

  if (!exists) return false;

  manifest.layers = manifest.layers.filter(
    layer => layer.id !== layerId
  );

  manifest.layers = manifest.layers.map(layer => ({
    ...layer,
    parentId: layer.parentId === layerId
      ? null
      : layer.parentId
  }));

  return true;
}

export function updateLayer(manifest, layerId, changes) {
  const layer = manifest.layers.find(
    item => item.id === layerId
  );

  if (!layer) {
    throw new Error("Слой не найден");
  }

  Object.assign(layer, changes);

  manifest.layers.sort((a, b) => a.zIndex - b.zIndex);

  return layer;
}

export function reorderLayers(manifest, orderedIds) {
  if (orderedIds.length !== manifest.layers.length) {
    throw new Error("Количество слоёв не совпадает");
  }

  const byId = new Map(
    manifest.layers.map(layer => [layer.id, layer])
  );

  if (new Set(orderedIds).size !== orderedIds.length) {
    throw new Error("В списке есть повторяющиеся ID");
  }

  const reordered = orderedIds.map(id => {
    const layer = byId.get(id);

    if (!layer) {
      throw new Error(`Слой не найден: ${id}`);
    }

    return {
      ...layer,
      zIndex: orderedIds.indexOf(id)
    };
  });

  manifest.layers = reordered;
  return manifest.layers;
}

export function validateLayerManifest(manifest) {
  if (!manifest || !Array.isArray(manifest.layers)) {
    throw new Error("Некорректный манифест слоёв");
  }

  const ids = new Set(
    manifest.layers.map(layer => layer.id)
  );

  if (ids.size !== manifest.layers.length) {
    throw new Error("Обнаружены повторяющиеся ID слоёв");
  }

  for (const layer of manifest.layers) {
    if (layer.parentId && !ids.has(layer.parentId)) {
      throw new Error("Не найден родительский слой");
    }

    if (layer.opacity < 0 || layer.opacity > 1) {
      throw new Error("Прозрачность должна быть от 0 до 1");
    }
  }

  return true;
}
