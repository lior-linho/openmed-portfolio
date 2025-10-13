import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

// Lazy load and initialize BVH to avoid errors before Three.js is fully loaded
const initBVH = async () => {
  try {
    const { acceleratedRaycast, computeBoundsTree, disposeBoundsTree } = await import('three-mesh-bvh');
    const THREE = await import('three');
    
    // 添加类型检查
    if (THREE && THREE.BufferGeometry && THREE.Mesh) {
      // 检查原型是否存在
      if (THREE.BufferGeometry.prototype && THREE.Mesh.prototype) {
        (THREE.BufferGeometry as any).prototype.computeBoundsTree = computeBoundsTree;
        (THREE.BufferGeometry as any).prototype.disposeBoundsTree = disposeBoundsTree;
        (THREE.Mesh as any).prototype.raycast = acceleratedRaycast;
        console.log('[OpenMed] BVH initialized successfully');
      } else {
        console.warn('[OpenMed] THREE prototypes not available. BVH initialization skipped.');
      }
    } else {
      console.warn('[OpenMed] THREE is not fully loaded. BVH initialization failed, falling back to basic collision detection.');
    }
  } catch (error) {
    console.warn('[OpenMed] BVH initialization failed, falling back to basic collision detection:', error);
  }
};

// Initialize application
const initApp = async () => {
  try {
    await initBVH();
    
    ReactDOM.createRoot(document.getElementById('root')!).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    
    console.log('[OpenMed] App initialized successfully');
  } catch (error) {
    console.error('[OpenMed] App initialization failed:', error);
    // Provide user-friendly error interface
    const root = document.getElementById('root');
    if (root) {
      root.innerHTML = `
        <div style="padding: 20px; color: white; background: #dc2626; font-family: sans-serif;">
          <h2>Application Initialization Failed</h2>
          <p>Please refresh the page to retry or contact technical support.</p>
          <p>Error Details: ${error instanceof Error ? error.message : String(error)}</p>
          <button onclick="window.location.reload()" style="padding: 8px 16px; background: white; border: none; border-radius: 4px; cursor: pointer;">
            Refresh Page
          </button>
        </div>
      `;
    }
  }
};

// Start application
initApp();
