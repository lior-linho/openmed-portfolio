// src/types/global.d.ts
import * as THREE from 'three';

declare global {
  interface Window {
    __lastShootTick: number;
    __openmedReady: boolean;
  }
  
  // 扩展Three.js类型
  namespace THREE {
    interface BufferGeometry {
      computeBoundsTree?: () => void;
      disposeBoundsTree?: () => void;
      boundsTree?: any;
    }
    
    interface Mesh {
      raycast: (raycaster: THREE.Raycaster, intersects: THREE.Intersection[]) => void;
    }
  }
}

export {};
