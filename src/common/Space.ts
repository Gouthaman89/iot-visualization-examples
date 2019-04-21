import "THREE/examples/js/loaders/GLTFLoader.js";
const THREE = window.THREE;

interface options{
	renderder:any;
}

class Space {
	
	readonly element:Element;
	readonly options:options;

	constructor(element:Element,options?:options){
		this.element = element;
		this.options = options;
		this.init();
		return this;
	}

	scene:any;
	camera:any;
	renderer:any;
	orbitControl:any;
	innerWidth:Number;
	innerHeight:Number;

	init(){
		// TODO:scene and camera should be add from glb file.
		// this.scene = new THREE.Scene();
		const e = this.element;
		let renderer = this.renderer = new THREE.WebGLRenderer();
		this.innerWidth =  e.clientWidth;
		this.innerHeight =  e.clientHeight;
		renderer.setSize(e.clientWidth, e.clientHeight );
		e.appendChild(renderer.domElement);
	}

	animate(){
		requestAnimationFrame( this.animate.bind(this) );
		this.renderer.render( this.scene, this.camera );
	}

	setPerspectiveCamera(camera:any,data:any){
		camera.fov = data.fov;
		camera.position.set(data.x||0,data.y||0,data.z||0)
		camera.rotation.set(data.rx*Math.PI/180||0,data.ry*Math.PI/180||0,data.rz*Math.PI/180||0)
		camera.updateProjectionMatrix()
		if(this.orbitControl){
			this.orbitControl.update()
		}
	}

	load(file:string):Promise<any> {
		const scope = this;
		return new Promise((resolve,reject)=>{
			// TODO: set and get data first from indexDB
			const loader = new THREE.GLTFLoader();
			loader.load(file,
				function loaded(gltf:any) {
					// console.log(gltf);
					let e = scope.element;
					let scene = scope.scene = gltf.scene;
					let camera = scope.camera = new THREE.PerspectiveCamera( 20, e.clientWidth/e.clientHeight, 0.1, 1000 );
					scope.setPerspectiveCamera(camera,scene.userData);
					scene.add(camera);
					scene.add( new THREE.HemisphereLight( 0xffffff, 0xcccccc, 1 ) );
					scope.animate();
					resolve();
				},
				function loaddingProgressing(xhr:any) {
					console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
					// TODO: show progressing in html
				},
				function loadingError(error:Error) {
					reject(error);
				})
		});
	}
}

export default Space;