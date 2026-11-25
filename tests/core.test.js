
import test from "node:test";
import assert from "node:assert/strict";

import {
  createProject,
  validateProject
} from "../core/project-schema.js";

import {
  createRig,
  addBone,
  addJoint,
  validateRig
} from "../core/rig-graph.js";

import {
  createMotion,
  addKeyframe,
  evaluateMotion
} from "../core/motion-engine.js";

import {
  createPose,
  applyMotionToPose,
  calculateBoneEndpoints
} from "../core/pose-adapter.js";

import {
  createLayer,
  createLayerManifest,
  addLayer,
  validateLayerManifest
} from "../core/layer-manifest.js";

test("Создание и проверка проекта", () => {
  const project = createProject("Тестовый мультфильм");

  assert.equal(project.name, "Тестовый мультфильм");
  assert.equal(validateProject(project), true);
  assert.ok(Array.isArray(project.characters));
});

test("Создание скелета и добавление костей", () => {
  const rig = createRig("Петрович");

  const body = addBone(rig, {
    name: "Туловище",
    start: { x: 100, y: 100 },
    end: { x: 100, y: 200 }
  });

  const arm = addBone(rig, {
    name: "Рука",
    parentId: body.id,
    start: { x: 100, y: 200 },
    end: { x: 150, y: 200 }
  });

  addJoint(rig, {
    boneA: body.id,
    boneB: arm.id,
    x: 100,
    y: 200
  });

  assert.equal(rig.bones.length, 2);
  assert.equal(rig.joints.length, 1);
  assert.equal(validateRig(rig), true);
});

test("Расчёт промежуточного положения движения", () => {
  const motion = createMotion({
    name: "Поворот руки",
    duration: 1000
  });

  addKeyframe(motion, {
    time: 0,
    target: "arm",
    values: { rotation: 0 },
    easing: "linear"
  });

  addKeyframe(motion, {
    time: 1000,
    target: "arm",
    values: { rotation: 90 },
    easing: "linear"
  });

  const result = evaluateMotion(motion, 500);

  assert.equal(result.arm.rotation, 45);
});

test("Создание позы и применение движения", () => {
  const rig = createRig();

  const bone = addBone(rig, {
    name: "Рука",
    start: { x: 10, y: 20 },
    end: { x: 50, y: 20 }
  });

  const pose = createPose(rig);

  const updated = applyMotionToPose(pose, {
    [bone.id]: { rotation: 45 }
  });

  assert.equal(updated.bones[bone.id].rotation, 45);
});

test("Расчёт конечных точек костей", () => {
  const rig = createRig();

  const bone = addBone(rig, {
    name: "Туловище",
    start: { x: 0, y: 0 },
    end: { x: 100, y: 0 }
  });

  const pose = createPose(rig);
  const endpoints = calculateBoneEndpoints(rig, pose);

  assert.equal(endpoints[bone.id].start.x, 0);
  assert.equal(endpoints[bone.id].end.x, 100);
});

test("Создание и проверка слоёв персонажа", () => {
  const manifest = createLayerManifest("petrovich");

  const head = createLayer({
    name: "Голова",
    part: "head",
    zIndex: 2
  });

  const body = createLayer({
    name: "Туловище",
    part: "torso",
    zIndex: 1
  });

  addLayer(manifest, head);
  addLayer(manifest, body);

  assert.equal(manifest.layers.length, 2);
  assert.equal(validateLayerManifest(manifest), true);
});
