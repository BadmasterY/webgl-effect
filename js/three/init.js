function init(domId) {
    // render dom
    const dom = document.getElementById(domId);
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1.5, 5);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
        antialias: true
    });
    renderer.setPixelRatio(window.devicePixelRatio); // set mobile pixe

    if (dom) {
        renderer.setSize(dom.offsetWidth, dom.offsetHeight);
        dom.appendChild(renderer.domElement);
    } else {
        throw new Error(`[Error] render dom is not found, check 'domId'!`);
    }

    return {
        dom,
        scene,
        camera,
        renderer,
    };
}