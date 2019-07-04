import { easeExpInOut, interpolateHsl, interpolateNumber } from "d3";
import * as Selection from "d3-selection";
import "d3-transition";
import { CubicBezierCurve3, Vector3 } from "three";
import Space from "../Space";

const THREE = ( window as IWindow).THREE;

interface ICurveOptions {
  line?: boolean; // true: make curve become straight line
  controlPoint?: Vector3; // undefined: auto calculate controlPoint
}

class Curve {
  public startPoint: Vector3;
  public controlPoint: Vector3;
  public curve: CubicBezierCurve3;
  public endPoint: Vector3;
  public object3d: any;
  public options: any;
  public points: Vector3[];
  public space: Space;

  constructor(space: Space, startPoint: Vector3, endPoint: Vector3, options?: ICurveOptions) {
    const opt = this .options = options || {};
    this .startPoint = startPoint;
    this .endPoint = endPoint;
    this .controlPoint = opt.controlPoint || this .calculateControlPoint();
    this .space = space;
    this .init();
    // console.log(this.controlPoint);
  }

  public calculateControlPoint(): Vector3 {
    const result = new THREE.Vector3(0, 0, 0);
    result.addVectors(this .startPoint, this .endPoint);
    result.multiplyScalar(0.9);
    if (!this .options.line) {
      result.y = this .endPoint.distanceTo(this .startPoint);
    }
    return result;
  }

  public init(): Curve {
    const curve = this .curve = new THREE.QuadraticBezierCurve3(
      this .startPoint,
      this .controlPoint,
      this .endPoint,
    );
    this .points = curve.getPoints( 60 );
    const vertices: number[] = [];
    this .points.forEach( (vector3: Vector3) => {
      vertices.push(vector3.x);
      vertices.push(vector3.y);
      vertices.push(vector3.z);
    });
    const geometry = new THREE.BufferGeometry();
    geometry.addAttribute( "position", new THREE.BufferAttribute( new Float32Array(vertices), 3 ) );
    // const geometry = new THREE.TubeGeometry(curve, 64, 0.03);
    const material = new THREE.MeshBasicMaterial({ vertexColors: THREE.VertexColors} );
    const curveObject = new THREE.Line( geometry, material );
    this .object3d = curveObject;
    this .space.scene.add(curveObject);
    // this .initOutline();
    return this ;
  }

  public initOutline() {
    // line can not set outline.
    const space = this .space;
    if (!space.outlinePassMap.has("curve")) {
      space.setOutlinePass("curve", {
        edgeGlow: 1,
        edgeStrength: 5,
        hiddenEdgeColor: 0xffffff,
        pulsePeriod: 2,
        visibleEdgeColor: 0xffffff,
      });
    }
    const outlineArray = space.getOutlineArray("curve");
    outlineArray.push(this .object3d);
  }

  public getPoint(t: number) {
    // t : [0-1]
    if (t > 1 || t < 0) {
      console.error("t should between 0 and 1.But t is ", t);
      return null;
    }
    const num = Number((t * 60).toFixed(0));
    return this .points[num];
  }

  public addPointEasing() {
    const scope = this ;
    // select a empty object to avoid running multiple transitions concurrently on the same elements
    // @ts-ignore
    Selection.select({}).transition().duration(1500).tween("point-easing", () => {
      const geo = new THREE.SphereGeometry( 0.08, 12, 12 );
      const mat = new THREE.LineBasicMaterial({ color: 0xffffff});
      const sphere = new THREE.Mesh( geo, mat );
      this .space.scene.add(sphere);

      return (t: any) => {
        const position = scope.getPoint(t);
        sphere.position.copy(position);
        if (t >= 1) {
          scope.space.scene.remove(sphere);
        }
      };
    });
  }

  public colorEasing(color1?: string, color2?: string, easeFunction?: Function) {
    const colorArray: number[] = [];
    const len = this .object3d.geometry.attributes.position.count;
    const easeFun = easeFunction || easeExpInOut;
    for (let i = 0; i < len; i++) {
      let v ;
      if (i > len / 2) {
        v = 2 - 2 * i / len;
      } else {
        v = 2 * i / len;
      }
      const rgb = interpolateHsl(color1 || "#aaaaaa", color2 || "#00ffff")( easeFun(v));
      const rgbValue = rgb.match(/\d+/g);
      // console.log(rgb, i, len, v)
      colorArray[3 * i] =  Number(rgbValue[0]) / 255;
      colorArray[3 * i + 1] =  Number(rgbValue[1]) / 255;
      colorArray[3 * i + 2] =  Number(rgbValue[2]) / 255;
    }
    this .object3d.geometry.addAttribute( "color", new THREE.Float32BufferAttribute( colorArray, 3 ) );
    // @ts-ignore
    Selection.select({}).transition().duration(2000).tween("color-easing", () => {
      return (t: number) => {
        const anchor = Number((t * len).toFixed(0));
        const newColorArray: number[] = [].concat(colorArray.slice(anchor * 3), colorArray.slice(0, anchor * 3)) ;
        this .object3d.geometry.addAttribute( "color", new THREE.Float32BufferAttribute( newColorArray, 3 ) );
      };

    });
  }

  public positionEasing(start: Vector3, end: Vector3) {
    // @ts-ignore
    Selection.select({}).transition().duration(2000).tween("color-easing", () => {
      const interpolateX = interpolateNumber(start.x, end.x);
      const interpolateY = interpolateNumber(start.y, end.y);
      const interpolateZ = interpolateNumber(start.z, end.z);
      return (t: number) => {
        this .object3d.position.set(
          interpolateX(t),
          interpolateY(t),
          interpolateZ(t),
          );
      };
    });
  }

}

export default Curve;
