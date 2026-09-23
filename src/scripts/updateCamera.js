import TWEEN from "three/examples/jsm/libs/tween.module.js";
import * as THREE from "three";

let cameraTween;

export function updateCamera(controls, camera, focus, duration = 1100) {
	cameraTween?.stop();
	camera.up.set(0, 1, 0);

	const startTarget = controls.target.clone();
	const startDirection = camera.position.clone().sub(startTarget).normalize();
	const orbitRotation = new THREE.Quaternion().setFromUnitVectors(
		startDirection,
		focus.direction,
	);
	const currentDistance = camera.position.distanceTo(controls.target);
	const minimumDistance = Math.max(focus.satelliteRadius * 2.25, focus.componentRadius * 5);
	const maximumDistance = focus.satelliteRadius * 4;
	const componentDistance = THREE.MathUtils.clamp(
		focus.satelliteRadius * 2 + focus.componentRadius * 4,
		minimumDistance,
		maximumDistance,
	);
	const distance = THREE.MathUtils.clamp(
		THREE.MathUtils.lerp(currentDistance, componentDistance, 0.45),
		minimumDistance,
		maximumDistance,
	);
	const orbitQuaternion = new THREE.Quaternion();
	const orbitDirection = new THREE.Vector3();
	const target = new THREE.Vector3();

	if (duration === 0) {
		camera.position.copy(focus.componentCenter).addScaledVector(focus.direction, distance);
		controls.target.copy(focus.componentCenter);
		controls.update();
		return;
	}

	cameraTween = new TWEEN.Tween({ progress: 0 })
		.to({ progress: 1 }, duration)
		.easing(TWEEN.Easing.Cubic.InOut)
		.onUpdate(({ progress }) => {
			target.lerpVectors(startTarget, focus.componentCenter, progress);
			orbitQuaternion.identity().slerp(orbitRotation, progress);
			orbitDirection.copy(startDirection).applyQuaternion(orbitQuaternion);
			camera.position.copy(target).addScaledVector(orbitDirection, THREE.MathUtils.lerp(currentDistance, distance, progress));
			controls.target.copy(target);
			controls.update();
		})
		.onComplete(() => {
			cameraTween = undefined;
		})
		.start();
}
