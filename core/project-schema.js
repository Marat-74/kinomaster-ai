
export const PROJECT_VERSION = "2.0";

export function createProject(name = "Новый мультфильм") {
  return {
    id: crypto.randomUUID(),
    name,
    version: PROJECT_VERSION,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    characters: [],
    scenes: [],
    assets: [],
    settings: {
      width: 1920,
      height: 1080,
      fps: 24,
      background: "#ffffff"
    }
  };
}

export function validateProject(project) {
  if (!project || typeof project !== "object") {
    throw new Error("Некорректный проект");
  }

  if (!project.name || typeof project.name !== "string") {
    throw new Error("У проекта должно быть название");
  }

  if (!Array.isArray(project.characters)) {
    throw new Error("Список персонажей должен быть массивом");
  }

  if (!Array.isArray(project.scenes)) {
    throw new Error("Список сцен должен быть массивом");
  }

  if (!project.settings || typeof project.settings !== "object") {
    throw new Error("Настройки проекта отсутствуют");
  }

  return true;
}

export function updateProject(project, changes = {}) {
  validateProject(project);

  const updated = {
    ...project,
    ...changes,
    updatedAt: new Date().toISOString()
  };

  validateProject(updated);
  return updated;
}
