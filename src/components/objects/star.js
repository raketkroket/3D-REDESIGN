import * as THREE from 'three';

function createStar(parent){
    // ff een sterretje maken
    const geometry = new THREE.SphereGeometry( 0.02, 12, 8);
    const material = new THREE.MeshBasicMaterial({color: "White"});
    const star = new THREE.Mesh(geometry, material);

    // random plek ergens in de ruimte
    star.position.set(Math.floor(Math.random() * 30) - 15, Math.floor(Math.random() * 30) - 15, Math.floor(Math.random() * 30) - 15);

    // niet te dicht bij de sat, da's meh
    correctCoordinates(star);

    // en gaan met die ster
    parent.add(star);
}

function correctCoordinates(object){
    // ff gokken welke as we aanpassen
    let randomNumber = Math.floor(Math.random()*3)+1;
    switch (randomNumber) {
        case 1:
            object.position.x = reassigncoordinate();
            break;
    
        case 2:
            object.position.y = reassigncoordinate();
            
            break;

        case 3:
            object.position.z = reassigncoordinate();
            
            break;
    }
}

// random nr buiten de no-go zone in 't midden
function reassigncoordinate(){
    let coordinate = Math.floor(Math.random() * 15) + 1; // ff 1 t/m 15 pakken
    if(coordinate < 9 ){// onder 9? dan naar de negatieve kant ermee
        coordinate = coordinate - 16;
    }

    return coordinate;
}

// zoveel sterretjes maken als je wil
function createStars(amount, parent){
    for (let i = 0; i < amount; i++) {
    createStar(parent);
    
    }
}

// alleen deze exporten, want 1 ster is saai
export {createStars}