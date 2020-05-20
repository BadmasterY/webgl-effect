function animate(initReturn, callback = () => { }) {
    const { scene, camera, renderer } = initReturn;

    requestAnimationFrame(animate.bind(null, initReturn, callback));
    renderer.render(scene, camera);
    if (TWEEN) TWEEN.update();
    callback();
}