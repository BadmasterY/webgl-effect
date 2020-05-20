function resize(initReturn) {
    const { scene, camera, renderer, dom } = initReturn;
    const { offsetWidth, offsetHeight } = dom;

    camera.aspect = offsetWidth / offsetHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(offsetWidth, offsetHeight);

    renderer.render(scene, camera);
}