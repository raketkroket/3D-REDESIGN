import * as THREE from 'three';

function correctCoordinates(position){
    let randomNumber = Math.floor(Math.random()*3)+1;
    switch (randomNumber) {
        case 1:
            position.x = reassigncoordinate();
            break;
        case 2:
            position.y = reassigncoordinate();
            break;
        case 3:
            position.z = reassigncoordinate();
            break;
    }
}

function reassigncoordinate(){
    let coordinate = Math.floor(Math.random() * 15) + 1;
    if(coordinate < 9 ){
        coordinate = coordinate - 16;
    }

    return coordinate;
}

function createStars(amount, parent){
    const geometry = new THREE.SphereGeometry(0.02, 8, 6);
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const stars = new THREE.InstancedMesh(geometry, material, amount);
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();

    for (let i = 0; i < amount; i++) {
        position.set(
            Math.floor(Math.random() * 30) - 15,
            Math.floor(Math.random() * 30) - 15,
            Math.floor(Math.random() * 30) - 15,
        );
        correctCoordinates(position);
        matrix.makeTranslation(position.x, position.y, position.z);
        stars.setMatrixAt(i, matrix);
    }

    stars.instanceMatrix.needsUpdate = true;
    parent.add(stars);
}

export {createStars}