let id = 0;

/**
 * /**
 * create cloud and points
 * @param {Float32Array} pointPositions cloud point positions
 * @param {Float32Array} linePositions lines point positions
 * @param {Float32Array} colors lines color
 * @param {Object} param create parameter, not required
 */
function _createModel(pointPositions, linePositions, colors, {
    pointColor = 0xffffff,
    pointSize = 2,
    pointOpacity = 1,
} = {}) {
    // create point cloud
    const particles = new THREE.BufferGeometry();
    particles.setAttribute('position', new THREE.BufferAttribute(pointPositions, 3).setUsage(THREE.DynamicDrawUsage));
    particles.setDrawRange(0, 0); // Don't to draw
    const pMap = new THREE.TextureLoader().load('../images/morphing/circular.png');
    const pMaterial = new THREE.PointsMaterial({
        map: pMap,
        color: pointColor,
        size: pointSize,
        opacity: pointOpacity,
        blending: THREE.AdditiveBlending,
        transparent: true,
        sizeAttenuation: false
    });
    const pointCloud = new THREE.Points(particles, pMaterial);

    // create lines
    const lineGeometry = new THREE.BufferGeometry();
    lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3).setUsage(THREE.DynamicDrawUsage));
    lineGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3).setUsage(THREE.DynamicDrawUsage));
    lineGeometry.computeBoundingSphere(); // Need to calculate boundary manually 
    lineGeometry.setDrawRange(0, 0); // Don't to draw
    const lineMaterial = new THREE.LineBasicMaterial({
        transparent: true,
        vertexColors: true,
        blending: THREE.AdditiveBlending,
    });
    const lineMesh = new THREE.LineSegments(lineGeometry, lineMaterial);

    return {
        cloud: pointCloud,
        lines: lineMesh,
    };
}

/**
 * Init function  
 * Only set parameter in switchMap
 * @param {Map} map Morphing switchMap
 * @param {Array<Object>} geometrys Parameters passed in during initialization
 */
function _init(map, geometrys = []) {
    const length = geometrys.length;

    if (length === 0) return false;

    for (let i = 0; i < length; i++) {
        const { name, geometry, minDistance } = geometrys[i];
        if (name === undefined || name === '') {
            console.error(`ERROR: Can't find 'name'!`);
            return false;
        }

        map.set(name, {
            geometry,
            minDistance,
        });
    }

    return true;
}

/**
 * Get maxParticleCount
 * @param {Map} map this.switchMap
 */
function _getMaxParticleCount(map) {
    let maxParticleCount = 0;
    let tempCount = 0;

    map.forEach(item => {
        const { geometry } = item;
        if (geometry.type === 'BufferGeometry') {
            tempCount = geometry.getAttribute('position').array.length / 3;
        } else {
            tempCount = geometry.vertices.length;
        }
        if (tempCount > maxParticleCount) maxParticleCount = tempCount;
    });

    return maxParticleCount;
}

/**
 * Judge only for the new model
 * @param {THREE.Geometry} geometry new model
 * @param {number} maxParticleCount current maxParticleCount
 */
function _fastGetMaxParticleCount(geometry, maxParticleCount) {
    let tempCount = 0;

    if (geometry.type === 'BufferGeometry') {
        tempCount = geometry.getAttribute('position').array.length / 3;
    } else {
        tempCount = geometry.vertices.length;
    }

    return tempCount > maxParticleCount ? tempCount : maxParticleCount;
}

/**
 * Change point's vertex info
 * @param {THREE.Points} cloud this.cloud
 * @param {Float32Array} positionArr vertex info to be changed
 * @param {number} count total number of vertices
 */
function _changePointPositions(cloud, positionArr, count) {
    cloud.geometry.setAttribute('position', new THREE.BufferAttribute(positionArr, 3).setUsage(THREE.DynamicDrawUsage));
    cloud.geometry.setDrawRange(0, count);
}

/**
 * Change line's vertex info
 * @param {THREE.LineSegments} lines this.liens
 * @param {Float32Array} positionArr vertex info to be changed
 * @param {number} count this.count
 * @param {number} minDistance min distance of scribe
 */
function _changeLinePositions(lines, positionArr, count, minDistance) {
    let vertexpos = 0; // use with position
    let colorpos = 0; // use with color
    let conectNum = 0; // count number

    const linePositions = [];
    const colors = [];

    for (let i = 0; i < count; i++) {
        for (let j = i + 1; j < count; j++) {
            const dx = positionArr[i * 3] - positionArr[j * 3];
            const dy = positionArr[i * 3 + 1] - positionArr[j * 3 + 1];
            const dz = positionArr[i * 3 + 2] - positionArr[j * 3 + 2];
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz); // point spacing

            if (dist < minDistance) {
                const alpha = 1.0 - dist / minDistance; // closer, less transparent

                linePositions[vertexpos++] = positionArr[i * 3];
                linePositions[vertexpos++] = positionArr[i * 3 + 1];
                linePositions[vertexpos++] = positionArr[i * 3 + 2];

                linePositions[vertexpos++] = positionArr[j * 3];
                linePositions[vertexpos++] = positionArr[j * 3 + 1];
                linePositions[vertexpos++] = positionArr[j * 3 + 2];

                colors[colorpos++] = alpha;
                colors[colorpos++] = alpha;
                colors[colorpos++] = alpha;

                colors[colorpos++] = alpha;
                colors[colorpos++] = alpha;
                colors[colorpos++] = alpha;

                conectNum++;
            }
        }
    }

    lines.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(linePositions), 3).setUsage(THREE.DynamicDrawUsage));
    lines.geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colors), 3).setUsage(THREE.DynamicDrawUsage));
    lines.geometry.setDrawRange(0, conectNum * 2);
}

/**
 * change the float32array length,  
 * and save old values, only chnage point positions
 * @param {number} oldMaxParticleCount old maxParticalCount
 * @param {number} maxParticleCount new maxParticalCount
 * @param {THREE.Points} cloud this.cloud
 */
function _changeArrayLength(oldMaxParticleCount, maxParticleCount, cloud) {
    const pointArrayLike = cloud.geometry.getAttribute('position').array;
    const pointPositionArr = Array.from(pointArrayLike);

    if (maxParticleCount > oldMaxParticleCount) {
        const pointDiff = (maxParticleCount - oldMaxParticleCount) * 3;
        const pointTempArray = new Float32Array(pointDiff);

        const newPointPosition = new Float32Array([...pointPositionArr, ...pointTempArray]);
        cloud.geometry.setAttribute('position', new THREE.BufferAttribute(newPointPosition, 3).setUsage(THREE.DynamicDrawUsage));
    }
}

/**
 * Animate
 * @param {number[]} oldPositions old position
 * @param {number[]} newPositions new position
 * @param {number} oldCount old count
 * @param {number} count new count
 * @param {number} oldMinDistance old min distance
 * @param {number} minDistance new min distance
 * @param {number} animateTime animation execution time
 * @param {Function} onComplete on complete callback
 * @param {Function} callback on end callback
 */
function _tweenAnimate(oldPositions, newPositions, oldCount, count, oldMinDistance, minDistance, animateTime, onComplete = (obj) => { }, callback = () => { }) {
    const data = [...oldPositions, oldMinDistance, oldCount];
    const targetData = [...newPositions, minDistance, count];

    return new TWEEN.Tween(data).easing(TWEEN.Easing.Exponential.Out).to(targetData, animateTime).onUpdate(obj => {
        const position = [].concat(obj);
        const count = position.pop();
        const minDistance = position.pop();
        onComplete({ position: new Float32Array(position), count, minDistance });
    }).onComplete(() => {
        callback();
    });

}

class speedAnimate {
    oldPositions = [];
    targetPositions = [];
    oldCount = 0;
    targetCount = 0;
    oldMinDistance = 0;
    targetMinDistance = 0;
    flickerEffect = false;

    /**
     * init speed animate param
     * @param {Object} param config
     */
    setProps(param) {
        const { oldPositions, targetPositions, oldCount, count, oldMinDistance, currentMinDistance } = param;
        this.oldPositions = oldPositions;
        this.targetPositions = targetPositions;
        this.oldCount = oldCount;
        this.targetCount = count;
        this.oldMinDistance = oldMinDistance;
        this.targetMinDistance = currentMinDistance;
    }

    /**
     * render function
     * @param {THREE.Points} cloud need change cloud
     * @param {THREE.LineSegments} lines need change line
     * @param {number} speed points change speed
     */
    render(cloud, lines, speed) {
        let needUpdate = false;
        const length = this.oldPositions.length;
        const tempArr = new Float32Array(length);

        for (let i = 0; i < length; i++) {
            const old = this.oldPositions[i];
            const target = this.targetPositions[i];
            if (old !== target) {
                needUpdate = true;
                if (Math.abs(old - target) <= speed) {
                    tempArr[i] = target;
                } else if (old < target) {
                    tempArr[i] = old + speed;
                } else if (old > target) {
                    tempArr[i] = old - speed;
                }
            } else {
                tempArr[i] = old;
            }

            this.oldPositions[i] = tempArr[i];
        }

        if (this.oldCount < this.targetCount) {
            needUpdate = true;
            this.oldCount++;
        } else if (this.oldCount > this.targetCount) {
            needUpdate = true;
            this.oldCount--;
        }

        if (!this.flickerEffect) {
            const old = this.oldMinDistance;
            const target = this.targetMinDistance;
            if (old !== target) {
                needUpdate = true;
                if (Math.abs(old - target) <= speed) {
                    this.oldMinDistance = target;
                }
                else if (old < target) {
                    this.oldMinDistance += speed;
                } else if (old > target) {
                    this.oldMinDistance -= speed;
                }
            }
        } else {
            needUpdate = true;
            const old = this.oldMinDistance;
            const target = this.targetMinDistance;
            if (old !== target) {
                this.oldMinDistance = target;
            } else {
                this.oldMinDistance = target / 2;
            }
        }

        _changePointPositions(cloud, tempArr, this.oldCount);
        _changeLinePositions(lines, tempArr, this.oldCount, this.oldMinDistance);

        return needUpdate;
    }
}

/**
 * Perform a morphing operation and create a patching animation
 * @example
 * const morph = new Morphing();
 * morph.add({name: 'xxx', geometry: THREE.BufferGeometry});
 * morph.swicth('xxx'); // animate to show 'xxx'
 * //or
 * const morph = new Morphing({
 *      geometrys: [
 *          {name: 'xxx', geometry: THREE.BufferGeometry},
 *          {name: 'yyy', geometry: THREE.Geometry}
 *      ],
 *      initName: 'xxx',
 * }); // init show 'xxx', no animate
 * morph.switch('yyy'); // animate to show 'yyy'
 */
class Morphing {
    id;
    switchMap = new Map();
    maxParticleCount; // get from max vertex count models
    currentName = ''; // current model name
    cloud = new THREE.Points();
    lines = new THREE.LineSegments();
    needUpdate = false;
    minDistance = .4;
    animateTime = 1200; // ms
    speed = 0.1;
    tweenAnimate = null;
    speedAnimate = new speedAnimate();
    speedMode = false;

    constructor({ geometrys = [], initName = '', param = {} } = {}) {
        this.id = id++;
        _init(this.switchMap, geometrys);
        this.maxParticleCount = _getMaxParticleCount(this.switchMap);
        this.createNewModel(param);
        this.switch(initName);
    }

    _DO_NOT_ACTIVELY_USE_CLEAR() {
        if (this.cloud) {
            this.cloud.geometry.dispose();
            const material = this.cloud.material;
            if (Array.isArray(material)) {
                for (let i = 0; i < material.length; i++) {
                    material[i].dispose();
                }
            } else {
                material.dispose();
            }
        }
        if (this.lines) {
            this.lines.geometry.dispose();
            const material = this.lines.material;
            if (Array.isArray(material)) {
                for (let i = 0; i < material.length; i++) {
                    material[i].dispose();
                }
            } else {
                material.dispose();
            }
        }
    }

    /**
     * create new model  
     * Logically, this method will not be called a second time
     * @param {Object} param model parameter
     */
    createNewModel(param) {
        const pointPositions = new Float32Array(this.maxParticleCount * 3);
        const linePositions = new Float32Array(this.maxParticleCount * this.maxParticleCount * 3);
        const lineColors = new Float32Array(this.maxParticleCount * this.maxParticleCount * 3);
        const { cloud, lines } = _createModel(pointPositions, linePositions, lineColors, param);

        this._DO_NOT_ACTIVELY_USE_CLEAR();

        this.cloud = cloud;
        this.lines = lines;
    }

    /**
     * add model
     * @param {Object} geo 
     */
    add(geo) {
        const { name, geometry, minDistance } = geo;
        if (name === undefined || name === '') {
            console.error(`ERROR: Can't find 'name'!`);
            return false;
        }

        this.switchMap.set(name, {
            geometry,
            minDistance,
        });
        const maxParticleCount = _fastGetMaxParticleCount(geometry, this.maxParticleCount);
        // change without update 
        _changeArrayLength(maxParticleCount, this.maxParticleCount, this.cloud);
        this.maxParticleCount = maxParticleCount;
        return true;
    }

    /**
     * remove model
     * @param {string} name model name
     */
    remove(name) {
        return this.switchMap.delete(name);
    }

    /**
     * switch show model
     * @param {string} name target model name
     * @param {Function} onEnd end callback
     */
    switch(name, onEnd) {
        if (name === undefined) return false;
        if (name === this.currentName) return true;

        let count = 0;
        let positionArr = [];
        const oldItem = this.switchMap.get(this.currentName);
        const item = this.switchMap.get(name);
        let oldMinDistance = oldItem ? oldItem.minDistance : 0;

        if (item === undefined) {
            throw new Error(`ERROR: No geometry named '${name}'!`);
        } else {
            const { geometry, minDistance } = item;
            if (geometry.type === 'BufferGeometry') { // buffer
                const bufferGeometry = geometry;
                const arrayLike = bufferGeometry.getAttribute('position').array;
                count = arrayLike.length / 3;
                positionArr = Array.from(arrayLike);
            } else { // basic
                if(this.tweenAnimate) this.tweenAnimate.stop();

                const basicGeometry = geometry;
                const vertices = basicGeometry.vertices;
                count = vertices.length;
                for (let i = 0; i < count; i++) {
                    positionArr[i * 3] = vertices[i].x;
                    positionArr[i * 3 + 1] = vertices[i].y;
                    positionArr[i * 3 + 2] = vertices[i].z;
                }
            }

            const oldArrayLike = this.cloud.geometry.getAttribute('position').array;
            const oldPositions = [];
            const targetPositions = [];

            for (let i = 0; i < this.maxParticleCount; i++) {
                targetPositions[i * 3] = positionArr[i * 3] || 0;
                targetPositions[i * 3 + 1] = positionArr[i * 3 + 1] || 0;
                targetPositions[i * 3 + 2] = positionArr[i * 3 + 2] || 0;

                oldPositions[i * 3] = oldArrayLike[i * 3] || 0;
                oldPositions[i * 3 + 1] = oldArrayLike[i * 3 + 1] || 0;
                oldPositions[i * 3 + 2] = oldArrayLike[i * 3 + 2] || 0;
            }

            const oldCount = oldArrayLike.length / 3;
            const currentMinDistance = minDistance || this.minDistance;
            if (!oldMinDistance) oldMinDistance = 0;

            if (!this.speedMode) {
                this.tweenAnimate = _tweenAnimate(oldPositions, targetPositions, oldCount, count, oldMinDistance, currentMinDistance, this.animateTime, ({ position, count, minDistance }) => {
                    _changePointPositions(this.cloud, position, count);
                    _changeLinePositions(this.lines, position, count, minDistance);
                    this.needUpdate = true;
                }, () => {
                    this.tweenAnimate = null;
                    if (onEnd) onEnd();
                });
                this.tweenAnimate.start();
            } else {
                this.speedAnimate.setProps({
                    oldPositions,
                    targetPositions,
                    oldCount,
                    count,
                    oldMinDistance,
                    currentMinDistance,
                });

                this.needUpdate = true;
            }

            this.currentName = name;
        }
    }

    /**
     * use flicker effect
     */
    useFlicker() {
        const oldArrayLike = this.cloud.geometry.getAttribute('position').array;
        const oldPositions = [];
        const targetPositions = [];

        for (let i = 0; i < this.maxParticleCount; i++) {
            targetPositions[i * 3] = oldArrayLike[i * 3] || 0;
            targetPositions[i * 3 + 1] = oldArrayLike[i * 3 + 1] || 0;
            targetPositions[i * 3 + 2] = oldArrayLike[i * 3 + 2] || 0;

            oldPositions[i * 3] = oldArrayLike[i * 3] || 0;
            oldPositions[i * 3 + 1] = oldArrayLike[i * 3 + 1] || 0;
            oldPositions[i * 3 + 2] = oldArrayLike[i * 3 + 2] || 0;
        }

        const oldCount = oldArrayLike.length / 3;
        const count = oldCount;

        const oldItem = this.switchMap.get(this.currentName);
        const oldMinDistance = oldItem?.minDistance || this.minDistance;
        const currentMinDistance = oldMinDistance;

        this.speedMode = true; // need speed mode
        // fast to target
        this.speedAnimate.setProps({
            oldPositions,
            targetPositions,
            oldCount,
            count,
            oldMinDistance,
            currentMinDistance,
        });
        this.speedAnimate.flickerEffect = true;
        this.needUpdate = true;
    }

    /**
     * remove flicker effect
     */
    removeFlicker() {
        this.speedAnimate.flickerEffect = false;
        this.needUpdate = true;
    }

    /**
     * use in 'animate'  
     * This method should only contain updates and loops.
     */
    render() {
        // animte loop
        // position updates
        if (!this.needUpdate) return;
        this.needUpdate = false;
        if (this.speedMode) {
            this.needUpdate = this.speedAnimate.render(this.cloud, this.lines, this.speed);
        }
        this.cloud.geometry.attributes.position.needsUpdate = true;

        this.lines.geometry.attributes.position.needsUpdate = true;
        this.lines.geometry.attributes.color.needsUpdate = true;
    }
}

// export default Morphing;